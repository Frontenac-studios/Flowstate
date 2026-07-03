#[cfg(target_os = "macos")]
fn set_do_not_disturb_macos(enabled: bool) -> bool {
    use std::process::Command;

    let flag = if enabled { "true" } else { "false" };
    let script = format!(
        "defaults -currentHost write com.apple.notificationcenterui doNotDisturb -boolean {flag} && \
         killall NotificationCenter 2>/dev/null || true"
    );

    Command::new("sh")
        .arg("-c")
        .arg(script)
        .status()
        .map(|status| status.success())
        .unwrap_or(false)
}

#[tauri::command]
pub fn set_do_not_disturb(enabled: bool) -> bool {
    #[cfg(target_os = "macos")]
    {
        return set_do_not_disturb_macos(enabled);
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = enabled;
        false
    }
}

#[tauri::command]
pub fn do_not_disturb_supported() -> bool {
    cfg!(target_os = "macos")
}
