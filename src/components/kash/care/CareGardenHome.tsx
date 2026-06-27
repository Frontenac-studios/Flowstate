import { GardenScene } from "./GardenScene";

/**
 * The garden-centric Care home: the lush garden is the hero, with today's wins,
 * what-lifts-me, and a gentle prompt beside it. Content is static placeholder
 * this slice (chrome-first) — the data wiring (care_events / wins / activities)
 * lands with the library + stats slices.
 */
const WINS = [
  { label: "Took a 10-minute walk", done: true },
  { label: "Finished the planning doc", done: true },
  { label: "One more to notice…", done: false },
];

const LIFTS = ["Morning walk", "5 slow breaths", "Tea, no screen"];

export function CareGardenHome() {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.25fr_1fr]">
        <GardenScene />

        <div className="flex flex-col gap-3">
          <section className="border-subtle rounded-card border bg-surface p-3">
            <h2 className="mb-2 text-caption font-medium text-ink-muted">Today&apos;s wins</h2>
            <ul className="flex flex-col gap-0.5">
              {WINS.map((win) => (
                <li key={win.label} className="flex items-center gap-2 py-0.5">
                  <span
                    className={
                      win.done
                        ? "flex h-4 w-4 items-center justify-center rounded-[4px] bg-cat-body-mind text-[10px] text-white"
                        : "h-4 w-4 rounded-[4px] border-[1.5px] border-[var(--priority-low)]"
                    }
                    aria-hidden
                  >
                    {win.done ? "✓" : ""}
                  </span>
                  <span className={win.done ? "text-body text-ink" : "text-body text-ink-faint"}>
                    {win.label}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="border-subtle rounded-card border bg-surface p-3">
            <h2 className="mb-2 text-caption font-medium text-ink-muted">What lifts me</h2>
            <div className="flex flex-wrap gap-1.5">
              {LIFTS.map((lift) => (
                <span
                  key={lift}
                  className="rounded-chip bg-[var(--cat-body-mind-fill)] px-2.5 py-1 text-meta text-[var(--cat-body-mind-text)]"
                >
                  {lift}
                </span>
              ))}
            </div>
          </section>

          <section className="border-subtle rounded-card border bg-surface-2 p-3">
            <h2 className="mb-1.5 text-caption font-medium text-ink-muted">A gentle prompt</h2>
            <p className="mb-2.5 text-body leading-snug text-ink">
              You&apos;ve been heads-down a while. Want to take five slow breaths?
            </p>
            <div className="flex gap-2">
              <button type="button" className="glass-btn-primary">
                Breathe
              </button>
              <button type="button" className="glass-btn-ghost">
                Not now
              </button>
            </div>
          </section>
        </div>
      </div>

      <p className="px-0.5 text-caption text-ink-faint">
        Until the illustrative garden art ships, this hero will show your wins &amp; self-care stats
        in its place.
      </p>
    </div>
  );
}
