# Kash 3.0 — Animation Sweep

> The motion pass (§5 motion language). Decided Jun 27 2026. Gentle-calm, grounding, never frantic;
> on the black-and-white base. Companion: `kash-3.0-design-tokens.md` (§5), `kash-3.0-plan.md`.

---

## 0. Global motion foundation

- **AN-0a · Personality:** **gentle-calm** — soft ease-out, slight slide+fade, breathing-adjacent.
- **AN-0b · Duration scale (tokens):** `--motion-micro 90ms` (hovers/taps) · `--motion-short 160ms`
  (toggles, chips) · `--motion-medium 240ms` (rows/cards enter, panels) · `--motion-long 420ms`
  (page/zoom transitions, celebrations).
- **Easing:** `ease-out` for enters · soft `cubic-bezier(.22,.61,.36,1)` for moves · `ease-in` for exits.
- **AN-0c · Reduced motion:** **full respect** — `prefers-reduced-motion` replaces all slide/scale/zoom
  with a quick opacity fade. (No in-app toggle.)

---

## 1. Today

- **Arrival / RDM reveal (AN-T2):** rows **slide in from the side** (+fade); RDM picks slide in too.
- **Completion (AN-T1):** the sequence that gets a deliberate, lingering beat —
  1. Checkbox fills with the **task's category color** (white check) — _not_ ink/black, _not_ gray.
     (Refines the all-ink accent default for the completed state only.)
  2. Title strikes; the row **slides out to the side** — the same axis it slid in on.
  3. It **reappears, quietly, in a collapsed "Completed · n" section** at the bottom.
- **Completed section (AN-T1b):** **persists all day** (cleared at the local-midnight rollover),
  with a **manual collapse toggle**.

## 2. Plan / Bingo

- **AN-P1 · Zoom transition (resolves NAV-4):** **zoom-grow, quicker (~240ms)** — the clicked period
  scales up to fill, detail resolves; reverses on zoom-out. Reinforces Year→Quarter→Month→Week depth.
- **AN-P2 · Line-bingo:** a **gentle bounce** — the completed line gives a small happy pop and settles.
- **AN-P2b · Blackout finale:** the **whole card bounces** + a finale line fades in. **No sprouts.**

## 3. Care

- **AN-C1 · Breathing:** a **filled orb** that swells on the inhale, settles on the exhale.
- **AN-C2 · Pace:** **varies by the selected technique; default = box breathing (4-4-4-4)** with
  in/hold/out labels.
- **AN-C3 · Garden growth:** a new plant **grows up from the soil** (scale from the base, slight overshoot)
  when self-care / balance nourishes it.

## 4. Cross-cutting

- **AN-X1 · Page transition (between rails):** **quick cross-fade** (~160ms). Zoom-grow is reserved for
  Plan's internal levels only.
- **AN-X2 · Toast:** **slide up + fade** from the bottom; holds; fades out.
- **AN-X3 · Modal / overlay** (incl. ⌘⇧A capture): **backdrop fade + panel scale-up** (with the overlay shadow).
- **AN-X4 · Projects Miller:** columns are **always present** — no "next column appears" animation;
  selecting just updates contents (a quick content cross-fade at most). See `kash-3.0-projects-miller.md`.
- **Ghosted-accept (§9):** a suggestion appears dashed/faded; on **Apply** it settles to a solid, real item.

## 5. Inherits the system (no bespoke motion)

Week, Projects, Abyss, Settings use the base tokens + the patterns above (slide-from-side rows,
cross-fade pages, scale-up overlays, ghosted-accept settle). The **garden-art spike** (detailed
illustration) is a separate art task, not part of this motion sweep.
