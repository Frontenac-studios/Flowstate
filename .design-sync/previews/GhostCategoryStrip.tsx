import { GhostCategoryStrip } from "../../src/components/kash/ui/GhostCategoryStrip";

/** D10 — pre-data chrome: the life-area legend at reduced opacity. */
export const Default = () => (
  <div className="w-64">
    <GhostCategoryStrip />
  </div>
);

/** The two documented tints: D10 ~45%, week columns ~35%. */
export const Opacities = () => (
  <div className="flex w-64 flex-col gap-4">
    <GhostCategoryStrip opacity={0.35} aria-label="Week column balance" />
    <GhostCategoryStrip opacity={0.45} />
    <GhostCategoryStrip opacity={0.55} />
    <GhostCategoryStrip opacity={1} aria-label="Full-strength legend" />
  </div>
);

/** Sized by the caller — it fills whatever width it is given. */
export const Widths = () => (
  <div className="flex flex-col gap-4">
    <GhostCategoryStrip className="w-24" />
    <GhostCategoryStrip className="w-48" />
    <GhostCategoryStrip className="w-96" />
  </div>
);
