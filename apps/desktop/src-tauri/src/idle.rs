//! System-idle detection for the timer's idle prompt (W2f).
//!
//! A background thread polls how long the machine has gone without input. When
//! idle passes the threshold and then input resumes, it emits `idle-return` with
//! the seconds away. The shell stays deliberately dumb: it never inspects whether
//! a timer is running — the web app owns that and decides whether to prompt — so
//! this module only answers "was the machine idle, and is the user back?".

use std::time::Duration;

use tauri::{AppHandle, Emitter};

/// No input for this long makes the away time worth a keep/trim prompt. Mirrors
/// `IDLE_THRESHOLD_SECONDS` on the web side; the web re-checks before prompting.
const IDLE_THRESHOLD_SECS: u64 = 10 * 60;

/// How often to sample idle time. Coarse on purpose — the away figure only needs
/// to be good to a few seconds, and this thread should stay near-free.
const POLL: Duration = Duration::from_secs(5);

/// Seconds since the last HID input event on macOS, read from `IOHIDSystem`'s
/// `HIDIdleTime` (nanoseconds). `None` if the value can't be read or parsed.
#[cfg(target_os = "macos")]
fn idle_seconds() -> Option<u64> {
    use std::process::Command;

    let output = Command::new("/bin/sh")
        .arg("-c")
        .arg("ioreg -c IOHIDSystem | awk '/HIDIdleTime/ {print $NF; exit}'")
        .output()
        .ok()?;

    let raw = String::from_utf8_lossy(&output.stdout);
    let nanos: u128 = raw.trim().parse().ok()?;
    Some((nanos / 1_000_000_000) as u64)
}

#[cfg(not(target_os = "macos"))]
fn idle_seconds() -> Option<u64> {
    None
}

/// Spawn the idle watcher. On platforms without an idle source it exits at once.
pub fn spawn_idle_watcher(app: AppHandle) {
    if cfg!(not(target_os = "macos")) {
        return;
    }

    std::thread::spawn(move || {
        // Peak idle seen in the current away stretch; emitted on return so the
        // figure reflects the whole gap, not the ~0 reading after the click back.
        let mut peak_idle: u64 = 0;
        let mut was_idle = false;

        loop {
            std::thread::sleep(POLL);

            let idle = idle_seconds().unwrap_or(0);
            if idle >= IDLE_THRESHOLD_SECS {
                was_idle = true;
                peak_idle = peak_idle.max(idle);
            } else if was_idle {
                let away = peak_idle;
                was_idle = false;
                peak_idle = 0;
                let _ = app.emit("idle-return", serde_json::json!({ "awaySeconds": away }));
            } else {
                peak_idle = 0;
            }
        }
    });
}
