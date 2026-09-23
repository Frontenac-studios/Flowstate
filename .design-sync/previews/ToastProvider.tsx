import { useEffect } from "react";

import ToastProvider, { useToast } from "../../src/components/kash/ui/ToastProvider";

const HELD_OPEN_MS = 10 * 60 * 1000;

/*
 * ToastProvider owns the stack, the auto-dismiss timer and the portal; Toast is
 * only the visual. These cells raise real toasts through the context on mount
 * (with the auto-dismiss held open) so the card shows the actual portal output.
 */
function Raise({ inputs }: { inputs: Parameters<ReturnType<typeof useToast>["toast"]>[0][] }) {
  const { toast } = useToast();
  useEffect(() => {
    for (const input of inputs) toast({ duration: HELD_OPEN_MS, ...input });
    // Raise once on mount — the inputs are literals owned by the story.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <p className="text-meta text-ink-muted">
      Anything under the provider can call <code>useToast().toast(…)</code>.
    </p>
  );
}

/** One toast raised through the context. */
export const Single = () => (
  <ToastProvider>
    <Raise inputs={[{ message: "Task moved to Thursday." }]} />
  </ToastProvider>
);

/** The stack — newest at the bottom, each on its own dismiss timer. */
export const Stacked = () => (
  <ToastProvider>
    <Raise
      inputs={[
        { message: "Invoice 0042 marked paid.", variant: "success" },
        { message: "Calendar synced — 6 events.", variant: "info" },
        { message: "Couldn't reach Xero. Nothing was sent.", variant: "error" },
      ]}
    />
  </ToastProvider>
);

/** With an action — the undo affordance the sweep uses. */
export const WithAction = () => (
  <ToastProvider>
    <Raise
      inputs={[
        {
          message: "3 tasks swept to Later.",
          variant: "success",
          action: { label: "Undo", onClick: () => {} },
        },
      ]}
    />
  </ToastProvider>
);
