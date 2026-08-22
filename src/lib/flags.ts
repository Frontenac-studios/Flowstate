/**
 * Parked features.
 *
 * MISSION.md law 5: "A parked feature is a door left ajar. Park only what is
 * finished and harmless. Kill the rest." These three are finished and harmless,
 * and each is plausibly wanted back — so the code and the data stay, and the
 * only thing that changes is that nothing in the UI can reach them.
 *
 * Parking is not the same as hiding. A parked feature leaves NO trace: no nav
 * entry, no command-palette result, no settings section, no route that renders,
 * and no API route that answers. If you can still find it, it is not parked.
 *
 * Every flag defaults OFF. `NEXT_PUBLIC_` is required because these are read in
 * client components; the values are inlined at build time, so flipping one means
 * a rebuild, not a restart. That is deliberate — a parked feature should not be
 * a runtime toggle a stray env var can flip in production.
 *
 * To un-park: set the variable to "on" in `.env.local`, restart the dev server,
 * and expect to fix whatever has bit-rotted since. See docs/v1-scope.md §3.2.
 */

const on = (value: string | undefined): boolean => value === "on";

export const FLAGS = {
  /**
   * Care / garden — self-care practices, the garden scene, reflections.
   * Parked, not killed, at the owner's decision (docs/v1-scope.md §8a). Lost its
   * Evidence tab in the teardown because that tab was built on Daily Wins and
   * Evidence, both of which were killed.
   */
  care: on(process.env.NEXT_PUBLIC_FLAG_CARE),

  /**
   * The chat coach — per-page docks, the chat rail, and the Claude streaming
   * routes behind them. Product law 1 ("Flowstate drafts. You sign.") means an
   * assistant returns eventually, but a coach dock on every page maps to none of
   * the nine v1 scope items.
   *
   * NOTE: chat was the primary task-creation path. With this off, AddTaskPopover
   * must fall back to revealing the manual composer directly — see that
   * component. Do not park chat without checking task creation still works.
   */
  chat: on(process.env.NEXT_PUBLIC_FLAG_CHAT),

  /**
   * Focus mode — the full-bleed focus session at /today/focus.
   * Parked pending W2: it is currently the only place a timer starts, and the
   * new first-class timer either replaces it or absorbs it as a full-screen
   * mode. Revisit once the W2 timer has been used for a week (§8e).
   */
  focus: on(process.env.NEXT_PUBLIC_FLAG_FOCUS),
} as const;

export type FeatureFlag = keyof typeof FLAGS;
