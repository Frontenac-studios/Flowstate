/**
 * OS-level Do Not Disturb seam (§15 deferred).
 *
 * TODO(§15): Wire to Tauri OS DND when the desktop shell can toggle system quiet mode.
 * Stream B implements in-app quiet only via {@link shouldSuppressInAppNudges}.
 */
export function setOsDoNotDisturb(enabled: boolean): void {
  void enabled;
  // no-op on web — reserved for Tauri integration
}
