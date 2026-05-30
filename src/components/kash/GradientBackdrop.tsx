/**
 * Renders the animated gradient backdrop. Server component so it's painted on
 * first frame. On the Tauri desktop runtime, `DesktopRuntimeFlag` adds an
 * `is-desktop` class to `<html>` which hides this element via CSS so the
 * native macOS window vibrancy shows the wallpaper through.
 */
export function GradientBackdrop() {
  return <div className="kash-gradient-bg pointer-events-none fixed inset-0 z-0" aria-hidden />;
}
