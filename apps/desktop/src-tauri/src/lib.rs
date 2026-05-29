use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::Duration;

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, RunEvent, Url, WebviewUrl, WebviewWindowBuilder,
};

const DEFAULT_PORT: u16 = 4310;

struct SidecarState {
    child: Mutex<Option<Child>>,
    port: u16,
}

fn sidecar_script_path(app: &AppHandle) -> Option<std::path::PathBuf> {
    if cfg!(debug_assertions) {
        return None;
    }
    let resource = app.path().resource_dir().ok()?;
    Some(resource.join("sidecar").join("run-sidecar.sh"))
}

fn wait_for_health(port: u16) -> bool {
    let url = format!("http://127.0.0.1:{port}/api/health");
    for _ in 0..120 {
        if let Ok(res) = reqwest::blocking::get(&url) {
            if res.status().is_success() {
                return true;
            }
        }
        std::thread::sleep(Duration::from_millis(250));
    }
    false
}

fn start_sidecar(app: &AppHandle, port: u16) -> Result<Option<Child>, String> {
    if cfg!(debug_assertions) {
        return Ok(None);
    }

    let script = sidecar_script_path(app).ok_or("Sidecar script not found in resources")?;
    if !script.exists() {
        return Err(format!("Missing sidecar launcher: {}", script.display()));
    }

    let child = Command::new("/bin/bash")
        .arg(script)
        .env("KASH_SIDECAR_PORT", port.to_string())
        .env("KASH_DATA_DIR", app_data_dir(app))
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| e.to_string())?;

    Ok(Some(child))
}

fn app_data_dir(app: &AppHandle) -> String {
    app.path()
        .app_data_dir()
        .map(|p| p.to_string_lossy().into_owned())
        .unwrap_or_else(|_| "~/Library/Application Support/Kash".to_string())
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

    let win = WebviewWindowBuilder::new(app, "main", WebviewUrl::External(parsed))
        .title("Kash")
        .inner_size(1280.0, 860.0)
        .min_inner_size(900.0, 600.0)
        .transparent(true)
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

fn build_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let open_i = MenuItem::with_id(app, "open", "Open Kash", true, None::<&str>)?;
    let capture_i = MenuItem::with_id(app, "capture", "Quick capture…", true, None::<&str>)?;
    let quit_i = MenuItem::with_id(app, "quit", "Quit Kash", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open_i, &capture_i, &quit_i])?;

    let _tray = TrayIconBuilder::new()
        .menu(&menu)
        .tooltip("Kash")
        .on_menu_event(|app, event| {
            let port = app.state::<SidecarState>().port;
            match event.id.as_ref() {
                "open" => {
                    let _ = open_main_window(app, port, false);
                }
                "capture" => {
                    let _ = open_main_window(app, port, true);
                }
                "quit" => app.exit(0),
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                let port = app.state::<SidecarState>().port;
                let _ = open_main_window(app, port, false);
            }
        })
        .build(app)?;

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
        .manage(SidecarState {
            child: Mutex::new(None),
            port,
        })
        .setup(move |app| {
            let handle = app.handle().clone();

            if !cfg!(debug_assertions) {
                let child = start_sidecar(&handle, port)?;
                if let Some(c) = child {
                    *handle.state::<SidecarState>().child.lock().unwrap() = Some(c);
                }
                if !wait_for_health(port) {
                    return Err("Kash server did not become ready".into());
                }
            } else if !wait_for_health(port) {
                eprintln!("Warning: dev server not ready at :{port}");
            }

            build_tray(&handle)?;
            open_main_window(&handle, port, false)?;
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error building Kash")
        .run(|app, event| {
            if let RunEvent::Exit = event {
                if let Some(state) = app.try_state::<SidecarState>() {
                    if let Ok(mut guard) = state.child.lock() {
                        if let Some(mut child) = guard.take() {
                            let _ = child.kill();
                        }
                    }
                }
            }
        });
}
