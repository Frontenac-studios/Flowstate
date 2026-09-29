import Button from "../../src/components/kash/ui/Button";
import Dialog from "../../src/components/kash/ui/Dialog";

/*
 * Dialog portals to document.body over a fixed scrim, so each story renders it open
 * inside a tall cell; the scrim covers the cell.
 */

/** Spec v3 Sa — a destructive confirm: outline Cancel, solid crimson only on the final action. */
export const DeleteConfirm = () => (
  <div className="h-[400px]">
    <Dialog
      open
      onClose={() => undefined}
      title="Delete this task?"
      description="“Draft Great White weekly report” and its 4 checklist items will be removed. This can't be undone."
      actions={
        <>
          <Button variant="outline">Cancel</Button>
          <Button variant="destructive">Delete task</Button>
        </>
      }
    />
  </div>
);

/** A non-destructive choice with a primary action. */
export const Confirm = () => (
  <div className="h-[400px]">
    <Dialog
      open
      onClose={() => undefined}
      title="Start the week from your plan?"
      description="Your three bets and five scheduled tasks will move onto this week."
      actions={
        <>
          <Button variant="outline">Not now</Button>
          <Button>Start week</Button>
        </>
      }
    />
  </div>
);
