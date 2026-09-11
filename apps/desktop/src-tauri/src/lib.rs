use std::fs::OpenOptions;
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

mod dnd;
mod idle;

use dnd::{do_not_disturb_supported, set_do_not_disturb};
use idle::spawn_idle_watcher;
use std::str::FromStr;
use tauri_plugin_autostart::ManagerExt as AutostartManagerExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState as KeyState};
use serde::Deserialize;
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder},
    tray::{TrayIcon, TrayIconBuilder},
    AppHandle, Emitter, Manager, RunEvent, State, Url, WebviewUrl, WebviewWindowBuilder,
    WindowEvent,
};

const DEFAULT_PORT: u16 = 4310;

/// W17 — the global capture shortcut. Registered with macOS, not with the web
/// app, so it fires from any front app. Rebindable from Settings; the chosen
/// chord is persisted next to the SQLite db so the shell can register it at
/// launch, before the web app is up to tell it anything.
const DEFAULT_CAPTURE_SHORTCUT: &str = "CmdOrCtrl+Shift+K";

/// Panel geometry. Width is fixed; the webview grows the window as results and
/// the captured-list appear (`resize_capture_panel`). The opening height and the
/// window chrome live on the `capture` entry in tauri.conf.json.
const CAPTURE_WIDTH: f64 = 560.0;
/// The card can be shorter than the window's opening height once it settles.
const CAPTURE_MIN_HEIGHT: f64 = 44.0;
/// Vertical placement as a fraction of the monitor height. Spotlight sits high;
/// dead-centre reads as a modal, which is what this is not.
const CAPTURE_TOP_FRACTION: f64 = 0.26;

/// W17 — capture-panel + shortcut state.
///
/// `error` is the whole reason this struct exists: `register` fails when another
/// app already owns the chord, and a hotkey that silently does nothing is worse
/// than no hotkey. The failure is held here and read by Settings.
#[derive(Default)]
struct CaptureState {
    shortcut: Mutex<Option<String>>,
    error: Mutex<Option<String>>,
}

struct SidecarState {
    child: Mutex<Option<Child>>,
    port: u16,
}

/// A switch/start target the menu-bar timer offers (W2f). Pushed from the web.
#[derive(Clone, Deserialize)]
struct TrayProject {
    id: String,
    name: String,
}

/// The running timer as the web app sees it, pushed down for the tray to mirror.
#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RunningTimer {
    project_name: String,
    /// Start instant in epoch ms; the shell ticks elapsed from this itself.
    started_at_ms: i64,
}

/// Native menu-bar-timer state (W2f). The timer's truth lives in the app; this
/// only mirrors the latest push so the tray title, tooltip, and menu can reflect
/// it and a 1s tick can advance the clock without per-second IPC.
#[derive(Default)]
struct TimerTrayState {
    tray: Mutex<Option<TrayIcon>>,
    running: Mutex<Option<RunningTimer>>,
    projects: Mutex<Vec<TrayProject>>,
}

fn sidecar_script_path(app: &AppHandle) -> Option<PathBuf> {
    if cfg!(debug_assertions) {
        return None;
    }
    let resource = app.path().resource_dir().ok()?;
    Some(resource.join("sidecar").join("run-sidecar.sh"))
}

/// Path to the app data dir (`~/Library/Application Support/com.frontenac.kash`),
/// where the SQLite db, sidecar pid file, and sidecar log live.
fn data_dir(app: &AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
}

fn sidecar_pid_path(app: &AppHandle) -> PathBuf {
    data_dir(app).join("sidecar.pid")
}

fn sidecar_log_path(app: &AppHandle) -> PathBuf {
    data_dir(app).join("sidecar.log")
}

/// Build id baked into the bundled sidecar (`.next/BUILD_ID`). Compared against
/// the running sidecar's `/api/health` `build` field so the shell never attaches
/// to a sidecar from a different Kash build squatting the shared port.
fn expected_build_id(app: &AppHandle) -> Option<String> {
    let resource = app.path().resource_dir().ok()?;
    let path = resource.join("sidecar").join(".next").join("BUILD_ID");
    std::fs::read_to_string(path)
        .ok()
        .map(|s| s.trim().to_string())
}

/// Single `/api/health` probe. Returns the parsed JSON body on a 2xx response,
/// or `None` if nothing healthy is listening.
fn probe_health(port: u16) -> Option<serde_json::Value> {
    let url = format!("http://127.0.0.1:{port}/api/health");
    let res = reqwest::blocking::get(&url).ok()?;
    if !res.status().is_success() {
        return None;
    }
    let body = res.text().ok()?;
    serde_json::from_str(&body).ok()
}

/// Poll `/api/health` for up to 30s. Returns the health body once ready.
fn wait_for_health(port: u16) -> Option<serde_json::Value> {
    for _ in 0..120 {
        if let Some(body) = probe_health(port) {
            return Some(body);
        }
        std::thread::sleep(Duration::from_millis(250));
    }
    None
}

/// Reap a sidecar recorded by a previous launch. The child is only killed on a
/// *clean* exit, so a crash or force-quit leaves the Node sidecar orphaned and
/// still holding the port — this cleans it up on the next launch. Guarded by a
/// command-line check so pid reuse can't take out an unrelated process.
fn kill_recorded_sidecar(app: &AppHandle) {
    let pid_path = sidecar_pid_path(app);
    let Ok(contents) = std::fs::read_to_string(&pid_path) else {
        return;
    };
    if let Ok(pid) = contents.trim().parse::<u32>() {
        let script = format!("ps -p {pid} -o command= | grep -q server.js && kill -9 {pid} || true");
        let _ = Command::new("/bin/bash")
            .arg("-c")
            .arg(script)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status();
    }
    let _ = std::fs::remove_file(&pid_path);
}

/// Force-reclaim the fixed port by killing whatever is still bound to it. Used
/// only when a *foreign* sidecar (e.g. a different Kash build with a mismatched
/// BUILD_ID) is squatting the port after the recorded-pid reap.
fn reclaim_port(port: u16) {
    let script = format!("lsof -ti tcp:{port} | xargs kill -9 2>/dev/null || true");
    let _ = Command::new("/bin/bash")
        .arg("-c")
        .arg(script)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status();
}

fn start_sidecar(app: &AppHandle, port: u16) -> Result<Option<Child>, String> {
    if cfg!(debug_assertions) {
        return Ok(None);
    }

    let script = sidecar_script_path(app).ok_or("Sidecar script not found in resources")?;
    if !script.exists() {
        return Err(format!("Missing sidecar launcher: {}", script.display()));
    }

    // Ensure the data dir exists so the pid file, log, and SQLite db have a home.
    let _ = std::fs::create_dir_all(data_dir(app));

    // Reap a sidecar orphaned by a previous crash/force-quit. If something is
    // still answering on the port afterwards, it's a foreign/stale server
    // (attaching to it would serve mismatched JS/CSS chunks and hang the
    // WebView on an unstyled first paint) — take the port back by force.
    kill_recorded_sidecar(app);
    if let Some(body) = probe_health(port) {
        eprintln!(
            "Reclaiming port {port} from another sidecar (build {:?}, expected {:?})",
            body.get("build").and_then(|b| b.as_str()),
            expected_build_id(app)
        );
        reclaim_port(port);
        std::thread::sleep(Duration::from_millis(300));
    }

    // Capture sidecar stdout/stderr instead of discarding it, so a boot failure
    // (EADDRINUSE, missing env, crash) is diagnosable from sidecar.log.
    let log_path = sidecar_log_path(app);
    let log = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
        .map_err(|e| format!("Cannot open sidecar log {}: {e}", log_path.display()))?;
    let log_err = log.try_clone().map_err(|e| e.to_string())?;

    let child = Command::new("/bin/bash")
        .arg(script)
        .env("KASH_SIDECAR_PORT", port.to_string())
        .env("KASH_DATA_DIR", app_data_dir(app))
        .stdout(Stdio::from(log))
        .stderr(Stdio::from(log_err))
        .spawn()
        .map_err(|e| e.to_string())?;

    // Record the pid so the next launch can reap this sidecar even if we crash.
    let _ = std::fs::write(sidecar_pid_path(app), child.id().to_string());

    Ok(Some(child))
}

fn app_data_dir(app: &AppHandle) -> String {
    app.path()
        .app_data_dir()
        .map(|p| p.to_string_lossy().into_owned())
        .unwrap_or_else(|_| "~/Library/Application Support/com.frontenac.kash".to_string())
}

fn resolve_port() -> u16 {
    std::env::var("KASH_SIDECAR_PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(DEFAULT_PORT)
}

fn plan_url(port: u16, focus_composer: bool) -> String {
    let mut url = format!("http://127.0.0.1:{port}/plan");
    if focus_composer {
        url.push_str("?focus=composer");
    }
    url
}

fn open_main_window(app: &AppHandle, port: u16, focus_composer: bool) -> Result<(), String> {
    let url = plan_url(port, focus_composer);
    let parsed = Url::parse(&url).map_err(|e| e.to_string())?;

    if let Some(win) = app.get_webview_window("main") {
        win.eval(&format!("window.location.replace('{url}');"))
            .map_err(|e| e.to_string())?;
        win.show().map_err(|e| e.to_string())?;
        win.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    // Transparency is set via tauri.conf.json (Tauri 2 has no .transparent()
    // method on the builder — it's a config-time flag). We still apply
    // vibrancy here so the NSView gets the HUD material before show().
    let win = WebviewWindowBuilder::new(app, "main", WebviewUrl::External(parsed))
        .title("Kash")
        .inner_size(1280.0, 860.0)
        .min_inner_size(900.0, 600.0)
        .build()
        .map_err(|e| e.to_string())?;

    apply_window_vibrancy(&win);

    win.show().map_err(|e| e.to_string())?;

    Ok(())
}

/// Apply Apple's HUD vibrancy material to the window's NSView so the
/// desktop wallpaper shows through with native macOS frosting. No-op on
/// other platforms.
#[cfg(target_os = "macos")]
fn apply_window_vibrancy(window: &tauri::WebviewWindow) {
    use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial, NSVisualEffectState};

    if let Err(err) = apply_vibrancy(
        window,
        NSVisualEffectMaterial::HudWindow,
        Some(NSVisualEffectState::Active),
        Some(16.0),
    ) {
        eprintln!("Warning: failed to apply window vibrancy: {err}");
    }
}

#[cfg(not(target_os = "macos"))]
fn apply_window_vibrancy(_window: &tauri::WebviewWindow) {}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

/// Whole seconds as a menu-bar clock: `mm:ss` under an hour, `h:mm:ss` above.
/// Mirrors `formatElapsedClock` on the web so both timers read the same.
fn format_clock(total_secs: i64) -> String {
    let total = total_secs.max(0);
    let (h, m, s) = (total / 3600, (total % 3600) / 60, total % 60);
    if h > 0 {
        format!("{h}:{m:02}:{s:02}")
    } else {
        format!("{m:02}:{s:02}")
    }
}

/// Refresh only the ticking parts — the menu-bar title and tooltip — from the
/// running timer. Called every second; cheap, and never rebuilds the menu.
fn update_tray_title(app: &AppHandle) {
    let state = app.state::<TimerTrayState>();
    let running = state.running.lock().unwrap().clone();
    let guard = state.tray.lock().unwrap();
    let Some(tray) = guard.as_ref() else { return };

    match running {
        Some(r) => {
            let elapsed = now_ms().saturating_sub(r.started_at_ms).max(0) / 1000;
            let clock = format_clock(elapsed);
            let _ = tray.set_title(Some(clock.clone()));
            let _ = tray.set_tooltip(Some(&format!("{} — {}", r.project_name, clock)));
        }
        None => {
            let _ = tray.set_title(None::<&str>);
            let _ = tray.set_tooltip(Some("Kash"));
        }
    }
}

/// Rebuild the tray menu from the current timer + switch targets. Running shows
/// a project header, Stop, and a "Switch to" submenu; idle shows a "Start timer"
/// submenu. Called on every state push (not per tick), then the title is synced.
fn refresh_tray(app: &AppHandle) {
    let state = app.state::<TimerTrayState>();
    let running = state.running.lock().unwrap().clone();
    let projects = state.projects.lock().unwrap().clone();

    let mut builder = MenuBuilder::new(app);

    if let Some(r) = &running {
        if let Ok(header) = MenuItemBuilder::new(format!("◷  {}", r.project_name))
            .id("header")
            .enabled(false)
            .build(app)
        {
            builder = builder.item(&header);
        }
        builder = builder.text("stop", "Stop timer");
        if !projects.is_empty() {
            let mut sub = SubmenuBuilder::new(app, "Switch to");
            for p in &projects {
                sub = sub.text(format!("switch:{}", p.id), &p.name);
            }
            if let Ok(sub) = sub.build() {
                builder = builder.item(&sub);
            }
        }
        builder = builder.separator();
    } else if !projects.is_empty() {
        let mut sub = SubmenuBuilder::new(app, "Start timer");
        for p in &projects {
            sub = sub.text(format!("start:{}", p.id), &p.name);
        }
        if let Ok(sub) = sub.build() {
            builder = builder.item(&sub);
        }
        builder = builder.separator();
    }

    builder = builder
        .text("open", "Open Kash")
        .text("capture", "Quick capture…")
        .separator()
        .text("quit", "Quit Kash");

    let Ok(menu) = builder.build() else { return };
    if let Some(tray) = state.tray.lock().unwrap().as_ref() {
        let _ = tray.set_menu(Some(menu));
    }
    update_tray_title(app);
}

/// Route a tray menu click. Open/capture/quit act locally; stop and switch/start
/// are emitted to the web app, which owns the timer mutations (W2f).
fn handle_tray_menu(app: &AppHandle, id: &str) {
    let port = app.state::<SidecarState>().port;
    match id {
        "open" => {
            let _ = open_main_window(app, port, false);
        }
        "capture" => {
            let _ = open_main_window(app, port, true);
        }
        "quit" => app.exit(0),
        "stop" => {
            let _ = app.emit("tray-command", serde_json::json!({ "action": "stop" }));
        }
        _ => {
            if let Some(pid) = id.strip_prefix("switch:").or_else(|| id.strip_prefix("start:")) {
                let _ = app.emit(
                    "tray-command",
                    serde_json::json!({ "action": "start", "projectId": pid }),
                );
            }
        }
    }
}

/// Mirror the running timer (or null) and switch/start targets from the app into
/// the native menu-bar timer (W2f). Called on every timer or project-list change.
#[tauri::command]
fn set_timer_tray(
    app: AppHandle,
    state: State<TimerTrayState>,
    running: Option<RunningTimer>,
    recent_projects: Vec<TrayProject>,
) {
    *state.running.lock().unwrap() = running;
    *state.projects.lock().unwrap() = recent_projects;
    refresh_tray(&app);
}

/// Advance the menu-bar clock once a second while a timer runs. Title-only, so it
/// never rebuilds the menu or races the state pushes.
fn spawn_tray_ticker(app: AppHandle) {
    std::thread::spawn(move || loop {
        std::thread::sleep(Duration::from_secs(1));
        let running = app
            .state::<TimerTrayState>()
            .running
            .lock()
            .map(|g| g.is_some())
            .unwrap_or(false);
        if running {
            update_tray_title(&app);
        }
    });
}

fn build_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let menu = MenuBuilder::new(app)
        .text("open", "Open Kash")
        .text("capture", "Quick capture…")
        .separator()
        .text("quit", "Quit Kash")
        .build()?;

    let tray = TrayIconBuilder::new()
        .menu(&menu)
        .show_menu_on_left_click(true)
        .tooltip("Kash")
        .on_menu_event(|app, event| handle_tray_menu(app, event.id.as_ref()))
        .build(app)?;

    *app.state::<TimerTrayState>().tray.lock().unwrap() = Some(tray);
    refresh_tray(app);
    Ok(())
}

/// Where the chosen shortcut is persisted, so a rebind survives a relaunch.
fn capture_shortcut_path(app: &AppHandle) -> PathBuf {
    data_dir(app).join("capture-shortcut.txt")
}

fn read_stored_shortcut(app: &AppHandle) -> String {
    std::fs::read_to_string(capture_shortcut_path(app))
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| DEFAULT_CAPTURE_SHORTCUT.to_string())
}

fn capture_url(port: u16) -> String {
    format!("http://127.0.0.1:{port}/capture")
}

/// Place the panel high-centre on whichever monitor the cursor is on, so it
/// appears where the user is already looking rather than on the main display.
///
/// The monitor is found by hit-testing the cursor against `available_monitors`
/// rather than asking for the monitor at a point: same answer, and it only uses
/// APIs this Tauri version is known to have.
fn position_capture_panel(app: &AppHandle, win: &tauri::WebviewWindow) {
    let cursor = app.cursor_position().ok();
    let monitors = app.available_monitors().unwrap_or_default();

    let monitor = cursor
        .and_then(|pos| {
            monitors.into_iter().find(|m| {
                let origin = m.position();
                let size = m.size();
                pos.x >= origin.x as f64
                    && pos.y >= origin.y as f64
                    && pos.x < origin.x as f64 + size.width as f64
                    && pos.y < origin.y as f64 + size.height as f64
            })
        })
        .or_else(|| win.current_monitor().ok().flatten())
        .or_else(|| app.primary_monitor().ok().flatten());

    let Some(monitor) = monitor else { return };
    let scale = monitor.scale_factor();
    let size = monitor.size().to_logical::<f64>(scale);
    let origin = monitor.position().to_logical::<f64>(scale);
    let width = win
        .outer_size()
        .map(|s| s.to_logical::<f64>(scale).width)
        .unwrap_or(CAPTURE_WIDTH);

    let x = origin.x + (size.width - width) / 2.0;
    let y = origin.y + size.height * CAPTURE_TOP_FRACTION;
    let _ = win.set_position(tauri::LogicalPosition::new(x, y));
}

/// Show the capture panel (W17). Creates the webview on first use, then only
/// shows/positions/focuses it — the window is hidden on close, never destroyed.
fn open_capture_panel(app: &AppHandle) -> Result<(), String> {
    let win = match app.get_webview_window("capture") {
        Some(win) => win,
        None => build_capture_panel(app)?,
    };

    position_capture_panel(app, &win);
    win.show().map_err(|e| e.to_string())?;
    win.set_focus().map_err(|e| e.to_string())?;
    // The panel is already mounted on the second and later opens, so nothing
    // remounts to clear the field. The web side listens for this and resets.
    let _ = win.emit("capture-opened", ());
    Ok(())
}

/// Build the panel webview from its tauri.conf.json entry, pointed straight at
/// `/capture`. The entry is `"create": false` because a window Tauri creates at
/// startup loads the app root: in dev that is a second, hidden copy of the whole
/// app, whose timer bridge would answer every tray command and idle prompt a
/// second time. Built once, on first open, then only shown and hidden.
fn build_capture_panel(app: &AppHandle) -> Result<tauri::WebviewWindow, String> {
    let port = app.state::<SidecarState>().port;
    let url = Url::parse(&capture_url(port)).map_err(|e| e.to_string())?;
    let mut config = app
        .config()
        .app
        .windows
        .iter()
        .find(|w| w.label == "capture")
        .cloned()
        .ok_or("capture window missing from tauri.conf.json")?;
    config.url = WebviewUrl::External(url);
    WebviewWindowBuilder::from_config(app, &config)
        .and_then(|builder| builder.build())
        .map_err(|e| e.to_string())
}

/// Hide the panel and hand focus back to whatever the user was in. macOS gives
/// focus to the previously active app once no visible window claims it.
fn hide_capture_panel_window(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("capture") {
        let _ = win.hide();
    }
}

/// ⌘⇧K toggles: open when hidden, dismiss when the panel is already up.
fn toggle_capture_panel(app: &AppHandle) {
    let visible = app
        .get_webview_window("capture")
        .and_then(|w| w.is_visible().ok())
        .unwrap_or(false);
    if visible {
        hide_capture_panel_window(app);
    } else if let Err(err) = open_capture_panel(app) {
        eprintln!("Capture panel failed to open: {err}");
    }
}

/// Register `chord` as the capture shortcut, replacing whatever is registered.
/// Returns the human-readable failure rather than panicking: another app owning
/// the chord is a normal outcome, not a crash.
fn apply_capture_shortcut(app: &AppHandle, chord: &str) -> Result<(), String> {
    let shortcut = Shortcut::from_str(chord).map_err(|_| format!("{chord} isn't a valid shortcut"))?;
    let _ = app.global_shortcut().unregister_all();
    app.global_shortcut()
        .register(shortcut)
        .map_err(|_| format!("{chord} is already taken by another app"))?;
    Ok(())
}

/// Read by Settings so the desktop section can show the live chord, any
/// registration failure, and whether launch-at-login is on.
#[tauri::command]
fn capture_shortcut_status(app: AppHandle) -> serde_json::Value {
    let state = app.state::<CaptureState>();
    let shortcut = state
        .shortcut
        .lock()
        .unwrap()
        .clone()
        .unwrap_or_else(|| DEFAULT_CAPTURE_SHORTCUT.to_string());
    let error = state.error.lock().unwrap().clone();
    let autostart = app.autolaunch().is_enabled().unwrap_or(false);
    serde_json::json!({ "shortcut": shortcut, "error": error, "autostart": autostart })
}

/// Register the stored capture shortcut. Called by the web app on load when the
/// capture flag is on, so it runs on every page load — a chord that is already
/// registered is left alone. A failure is recorded and surfaced in Settings
/// rather than returned as fatal: another app owning the chord is a normal
/// outcome, and Kash is still useful without the hotkey.
#[tauri::command]
fn enable_capture_shortcut(app: AppHandle) -> Result<(), String> {
    let chord = read_stored_shortcut(&app);
    let already = Shortcut::from_str(&chord)
        .map(|s| app.global_shortcut().is_registered(s))
        .unwrap_or(false);
    if already {
        return Ok(());
    }

    let state = app.state::<CaptureState>();
    *state.shortcut.lock().unwrap() = Some(chord.clone());
    match apply_capture_shortcut(&app, &chord) {
        Ok(()) => {
            *state.error.lock().unwrap() = None;
            Ok(())
        }
        Err(err) => {
            eprintln!("Capture shortcut not registered: {err}");
            *state.error.lock().unwrap() = Some(err.clone());
            Err(err)
        }
    }
}

/// Rebind the capture shortcut. On failure the previous chord is restored, so a
/// rejected rebind leaves the user with a working hotkey rather than none.
#[tauri::command]
fn set_capture_shortcut(app: AppHandle, shortcut: String) -> Result<(), String> {
    let chord = shortcut.trim().to_string();
    let previous = read_stored_shortcut(&app);

    if let Err(err) = apply_capture_shortcut(&app, &chord) {
        let _ = apply_capture_shortcut(&app, &previous);
        *app.state::<CaptureState>().error.lock().unwrap() = Some(err.clone());
        return Err(err);
    }

    let state = app.state::<CaptureState>();
    *state.shortcut.lock().unwrap() = Some(chord.clone());
    *state.error.lock().unwrap() = None;
    let _ = std::fs::write(capture_shortcut_path(&app), &chord);
    Ok(())
}

/// Launch at login. The hotkey's twin: a shortcut for an app that isn't running
/// does nothing, which is how a capture tool loses trust.
#[tauri::command]
fn set_autostart(app: AppHandle, enabled: bool) -> Result<(), String> {
    let manager = app.autolaunch();
    if enabled {
        manager.enable().map_err(|e| e.to_string())
    } else {
        manager.disable().map_err(|e| e.to_string())
    }
}

/// Dismiss the panel from the web side (Esc, or a completed save).
#[tauri::command]
fn hide_capture_panel(app: AppHandle) {
    hide_capture_panel_window(&app);
}

/// Grow or shrink the panel as results and the captured list appear. Width is
/// fixed; only the height follows the content.
#[tauri::command]
fn resize_capture_panel(app: AppHandle, height: f64) {
    if let Some(win) = app.get_webview_window("capture") {
        let clamped = height.clamp(CAPTURE_MIN_HEIGHT, 520.0);
        let _ = win.set_size(tauri::LogicalSize::new(CAPTURE_WIDTH, clamped));
    }
}

/// Open something in the main window from the panel — "I found the task, take
/// me to it". This is the one path where capture is *allowed* to bring the app
/// forward, because the user asked to go there.
#[tauri::command]
fn open_in_main(app: AppHandle, path: String) -> Result<(), String> {
    if !path.starts_with('/') || path.starts_with("//") {
        return Err("path must be app-relative".into());
    }
    let port = app.state::<SidecarState>().port;
    hide_capture_panel_window(&app);

    let url = format!("http://127.0.0.1:{port}{path}");
    let Some(win) = app.get_webview_window("main") else {
        return open_main_window(&app, port, false);
    };
    win.eval(&format!("window.location.replace('{url}');"))
        .map_err(|e| e.to_string())?;
    win.show().map_err(|e| e.to_string())?;
    win.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let port = if cfg!(debug_assertions) {
        3000
    } else {
        resolve_port()
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None::<Vec<&str>>,
        ))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    // Fires on press *and* release; acting on both would open
                    // and immediately close the panel.
                    if event.state() == KeyState::Pressed {
                        toggle_capture_panel(app);
                    }
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            set_do_not_disturb,
            do_not_disturb_supported,
            set_timer_tray,
            capture_shortcut_status,
            enable_capture_shortcut,
            set_capture_shortcut,
            set_autostart,
            hide_capture_panel,
            resize_capture_panel,
            open_in_main
        ])
        .manage(SidecarState {
            child: Mutex::new(None),
            port,
        })
        .manage(TimerTrayState::default())
        .manage(CaptureState::default())
        .setup(move |app| {
            let handle = app.handle().clone();

            if !cfg!(debug_assertions) {
                let child = start_sidecar(&handle, port)?;
                if let Some(c) = child {
                    *handle.state::<SidecarState>().child.lock().unwrap() = Some(c);
                }
                match wait_for_health(port) {
                    Some(body) => {
                        // Belt-and-braces: confirm the server that answered is the
                        // sidecar we just started, not something else that grabbed
                        // the port. A mismatch means our spawn failed to bind.
                        if let Some(expected) = expected_build_id(&handle) {
                            let got = body.get("build").and_then(|b| b.as_str());
                            if got != Some(expected.as_str()) {
                                return Err(format!(
                                    "Kash server build mismatch (expected {expected}, got {got:?}); see {}",
                                    sidecar_log_path(&handle).display()
                                )
                                .into());
                            }
                        }
                    }
                    None => {
                        return Err(format!(
                            "Kash server did not become ready on :{port}; see {}",
                            sidecar_log_path(&handle).display()
                        )
                        .into());
                    }
                }
            } else if wait_for_health(port).is_none() {
                eprintln!("Warning: dev server not ready at :{port}");
            }

            build_tray(&handle)?;
            spawn_tray_ticker(handle.clone());
            spawn_idle_watcher(handle.clone());

            // W17 — load the stored chord but leave it unregistered. The web app
            // turns it on through `enable_capture_shortcut` when
            // FLAGS.capturePanel is on; the flag lives in the web build, and a
            // system-wide hotkey is not something to take while the feature is dark.
            let chord = read_stored_shortcut(&handle);
            *handle.state::<CaptureState>().shortcut.lock().unwrap() = Some(chord);

            open_main_window(&handle, port, false)?;
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error building Kash")
        .run(|app, event| match event {
            // Closing the window hides it to the menu bar rather than quitting —
            // the timer keeps running and the webview (and its tray/idle listeners)
            // stays alive. Quit is explicit, via the tray. (W2f)
            // The panel dismisses on blur — clicking back into your other app
            // is the same gesture as pressing Esc, and a capture bar that
            // lingers over someone else's window is clutter.
            RunEvent::WindowEvent {
                label,
                event: WindowEvent::Focused(false),
                ..
            } if label == "capture" => {
                if let Some(win) = app.get_webview_window("capture") {
                    let _ = win.hide();
                }
            }
            RunEvent::WindowEvent {
                label,
                event: WindowEvent::CloseRequested { api, .. },
                ..
            } if label == "capture" => {
                if let Some(win) = app.get_webview_window("capture") {
                    let _ = win.hide();
                }
                api.prevent_close();
            }
            RunEvent::WindowEvent {
                label,
                event: WindowEvent::CloseRequested { api, .. },
                ..
            } if label == "main" => {
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.hide();
                }
                api.prevent_close();
            }
            RunEvent::Exit => {
                if let Some(state) = app.try_state::<SidecarState>() {
                    if let Ok(mut guard) = state.child.lock() {
                        if let Some(mut child) = guard.take() {
                            let _ = child.kill();
                        }
                    }
                }
                // Clean exit reaped the child — drop the pid file so the next
                // launch doesn't try to kill a pid that's already gone.
                let _ = std::fs::remove_file(sidecar_pid_path(app));
            }
            _ => {}
        });
}
