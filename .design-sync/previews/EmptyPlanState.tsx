import { EmptyPlanState } from "../../src/components/kash/EmptyPlanState";

/** The Plan surface's zero state — no props; copy is fixed by design. */
export const Default = () => (
  <div className="w-[34rem]">
    <EmptyPlanState />
  </div>
);

/** How it sits on the page canvas it was designed against. */
export const OnCanvas = () => (
  <div className="w-[38rem] rounded-card bg-canvas p-6">
    <EmptyPlanState />
  </div>
);
