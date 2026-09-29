import Button from "../../src/components/kash/ui/Button";
import Checkbox from "../../src/components/kash/ui/Checkbox";
import Sheet from "../../src/components/kash/ui/Sheet";

/** Spec v3 Sa — the right-docked task sheet: breadcrumb with project dot, checklist, footer. */
export const TaskDetail = () => (
  <div className="h-[600px]">
    <Sheet
      open
      onClose={() => undefined}
      width={360}
      breadcrumb={
        <>
          <span className="size-2 rounded-pill bg-project-1" aria-hidden />
          Great White › Reporting
        </>
      }
      title="Draft Great White weekly report"
      footer={
        <>
          <Button variant="outline">Delete</Button>
          <Button>Mark done</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <span className="rounded-pill bg-active-surface px-2.5 py-0.5 text-caption font-semibold">
            Today
          </span>
          <span className="rounded-pill bg-active-surface px-2.5 py-0.5 text-caption font-semibold">
            High
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-micro font-semibold uppercase tracking-caps text-ink-muted">
            Checklist · 2 of 4
          </span>
          {[
            ["Export Clockify summary", true],
            ["Group hours by work area", true],
            ["Write blockers section", false],
            ["Send to client", false],
          ].map(([label, done]) => (
            <label key={String(label)} className="flex items-center gap-3 py-1.5 text-[14px]">
              <Checkbox defaultChecked={Boolean(done)} />
              <span className={done ? "text-ink-faint line-through" : "text-ink"}>{label}</span>
            </label>
          ))}
        </div>
      </div>
    </Sheet>
  </div>
);
