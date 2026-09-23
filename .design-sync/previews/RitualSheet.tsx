import Button from "../../src/components/kash/ui/Button";
import { RitualSheet } from "../../src/components/kash/ui/RitualSheet";

/*
 * RitualSheet portals to document.body and covers the viewport, so each cell is
 * rendered in its open state — that IS the component. Closed it renders nothing.
 */

/** The default `wide` panel — morning hand-off, EOD, Monday entry. */
export const Open = () => (
  <RitualSheet
    open
    title="End of day"
    footer={
      <div className="flex items-center justify-end gap-3">
        <Button variant="ghost">Skip tonight</Button>
        <Button>Close the day</Button>
      </div>
    }
    onDismiss={() => {}}
  >
    <div className="flex flex-col gap-4">
      <h2 className="text-title text-ink">Three things landed today</h2>
      <p className="text-body text-ink-muted">
        Two tasks are still open on Great White. Move them to tomorrow, or let them fall to the
        backlog.
      </p>
      <ul className="flex flex-col gap-2 text-body text-ink">
        <li>Send the fortnightly report</li>
        <li>Reconcile September bills in Xero</li>
      </ul>
    </div>
  </RitualSheet>
);

/** `md` — the narrow panel for a single decision. */
export const Medium = () => (
  <RitualSheet
    open
    size="md"
    title="Seal this fortnight?"
    footer={
      <div className="flex items-center justify-end gap-3">
        <Button variant="ghost">Not yet</Button>
        <Button variant="destructive">Seal</Button>
      </div>
    }
    onDismiss={() => {}}
  >
    <p className="text-body text-ink-muted">
      Sealing locks the said-vs-spent tilt for 1–14 September. It can&apos;t be re-declared.
    </p>
  </RitualSheet>
);

/** `dim="strong"` deepens the scrim so the rail recedes further. */
export const StrongDim = () => (
  <RitualSheet open size="md" dim="strong" title="Good morning" dismissOnBackdrop={false}>
    <p className="text-body text-ink-muted">
      Four things are waiting on you. Pick the three that actually matter today.
    </p>
  </RitualSheet>
);
