import Toast from "../../src/components/kash/ui/Toast";

const noop = () => {};

/** All four variants. Icon is variant-led; only `error` takes colour (DT-3b). */
export const Variants = () => (
  <div className="flex w-[30rem] flex-col gap-3">
    <Toast id="t1" message="Task moved to Thursday." onDismiss={noop} />
    <Toast id="t2" variant="success" message="Invoice 0042 marked paid." onDismiss={noop} />
    <Toast id="t3" variant="info" message="Calendar synced — 6 events." onDismiss={noop} />
    <Toast
      id="t4"
      variant="error"
      message="Couldn't reach Xero. Nothing was sent."
      onDismiss={noop}
    />
  </div>
);

/** With an undo affordance — the action is a ghost Button. */
export const WithAction = () => (
  <div className="w-[30rem]">
    <Toast
      id="t5"
      variant="success"
      message="3 tasks swept to Later."
      action={{ label: "Undo", onClick: noop }}
      onDismiss={noop}
    />
  </div>
);

/** Long copy wraps; the dismiss cap stays pinned right. */
export const LongMessage = () => (
  <div className="w-[30rem]">
    <Toast
      id="t6"
      variant="info"
      message="Great White is at 18 of 20 billable hours this fortnight — the remainder carries forward."
      onDismiss={noop}
    />
  </div>
);
