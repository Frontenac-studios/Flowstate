/** Fired by chrome (header search pill, early shortcut shell) to open the palette. */
export const OPEN_PALETTE_EVENT = "kash:open-palette";
/** Fired when the user runs the "Decide next task" command. DayPlanCanvas listens. */
export const DECIDE_EVENT = "kash:decide";
/** Fired to open chat and send a one-shot message (detail: string). ChatRail listens. */
export const CHAT_SEND_EVENT = "kash:chat-send";
/** Fired by chrome to open Abyss quick-capture (mirrors OPEN_PALETTE_EVENT). */
export const OPEN_ABYSS_CAPTURE_EVENT = "kash:open-abyss-capture";
