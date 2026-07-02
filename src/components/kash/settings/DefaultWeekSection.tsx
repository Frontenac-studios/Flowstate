"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import Button from "@/components/kash/ui/Button";
import Input from "@/components/kash/ui/Input";
import Select from "@/components/kash/ui/Select";
import { ColoredEmptyInvitation } from "@/components/kash/ui/ColoredEmptyInvitation";
import { PROJECT_CATEGORIES, categoryLabel, type ProjectCategory } from "@/lib/projects/categories";
import { categorySolidVar } from "@/lib/projects/category-tokens";
import { useTRPC } from "@/trpc/client";

const WEEKDAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => h);

function hourLabel(h: number): string {
  const period = h < 12 ? "AM" : "PM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${period}`;
}

function formatTimeRange(startMin: number, endMin: number): string {
  const fmt = (min: number) => {
    const h24 = Math.floor(min / 60);
    const h = h24 % 12 === 0 ? 12 : h24 % 12;
    const period = h24 < 12 ? "a" : "p";
    return `${h}${period}`;
  };
  return `${fmt(startMin)}–${fmt(endMin)}`;
}

type TemplateRow = {
  id: string;
  category: ProjectCategory;
  isoWeekday: number;
  label: string | null;
  startMin: number | null;
  endMin: number | null;
};

type Draft = {
  category: ProjectCategory;
  isoWeekday: number;
  label: string;
  allDay: boolean;
  startHour: number;
  endHour: number;
};

const EMPTY_DRAFT: Draft = {
  category: "relationships",
  isoWeekday: 0,
  label: "",
  allDay: true,
  startHour: 9,
  endHour: 10,
};

/** Settings editor for recurring protected-block templates (the "default week"). */
export default function DefaultWeekSection() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery(
    trpc.protectedBlocks.listTemplates.queryOptions()
  );

  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: trpc.protectedBlocks.listTemplates.queryKey() });

  const upsertMutation = useMutation(
    trpc.protectedBlocks.upsertTemplate.mutationOptions({
      onSuccess: () => {
        invalidate();
        setDraft(EMPTY_DRAFT);
        setEditingId(null);
      },
    })
  );

  const removeMutation = useMutation(
    trpc.protectedBlocks.removeTemplate.mutationOptions({ onSuccess: invalidate })
  );

  const startEdit = (row: TemplateRow) => {
    setEditingId(row.id);
    setDraft({
      category: row.category,
      isoWeekday: row.isoWeekday,
      label: row.label ?? "",
      allDay: row.startMin == null,
      startHour: row.startMin != null ? Math.floor(row.startMin / 60) : 9,
      endHour: row.endMin != null ? Math.ceil(row.endMin / 60) : 10,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      id: editingId ?? undefined,
      category: draft.category,
      isoWeekday: draft.isoWeekday,
      label: draft.label.trim() || null,
      startMin: draft.allDay ? null : draft.startHour * 60,
      endMin: draft.allDay ? null : draft.endHour * 60,
    };
    if (!draft.allDay && payload.endMin! <= payload.startMin!) return;
    upsertMutation.mutate(payload);
  };

  const sorted = [...templates].sort(
    (a, b) => a.isoWeekday - b.isoWeekday || a.category.localeCompare(b.category)
  );

  return (
    <section className="rounded-[var(--radius-row)] border border-subtle bg-surface p-4">
      <h2 className="text-sm font-semibold text-ink">Default week</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Recurring protected time blocks proposed each week during planning — never applied
        automatically.
      </p>

      {isLoading ? (
        <p className="mt-4 text-sm text-ink-muted">Loading…</p>
      ) : sorted.length > 0 ? (
        <ul className="mt-4 space-y-2" aria-label="Default week templates">
          {sorted.map((row) => (
            <li
              key={row.id}
              className="flex items-center gap-3 rounded-[var(--radius-chip)] border border-subtle bg-surface p-3"
            >
              <span
                aria-hidden
                className="h-4 w-4 shrink-0 rounded-full"
                style={{ backgroundColor: categorySolidVar(row.category) }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">
                  {WEEKDAY_LABELS[row.isoWeekday]} ·{" "}
                  {row.label?.trim() || categoryLabel(row.category)}
                </p>
                <p className="text-caption text-ink-muted">
                  {categoryLabel(row.category)}
                  {row.startMin != null && row.endMin != null
                    ? ` · ${formatTimeRange(row.startMin, row.endMin)}`
                    : " · all day"}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="text-xs"
                onClick={() => startEdit(row)}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="text-xs text-ink-muted"
                disabled={removeMutation.isPending}
                onClick={() => removeMutation.mutate({ id: row.id })}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <ColoredEmptyInvitation
          title="Add your first block"
          hint="Recurring protected time proposed each week during planning — add one below."
          className="mt-4 border-0 bg-transparent px-0 py-4 shadow-none"
        />
      )}

      <form
        className="mt-4 space-y-3 rounded-[var(--radius-chip)] border border-subtle bg-[var(--surface-2)] p-3"
        onSubmit={submit}
      >
        <p className="text-sm font-medium text-ink">{editingId ? "Edit block" : "Add block"}</p>

        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1 text-sm text-ink-muted">
            Day
            <Select
              value={draft.isoWeekday}
              onChange={(e) => setDraft((d) => ({ ...d, isoWeekday: Number(e.target.value) }))}
            >
              {WEEKDAY_LABELS.map((label, i) => (
                <option key={label} value={i}>
                  {label}
                </option>
              ))}
            </Select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-ink-muted">
            Category
            <Select
              value={draft.category}
              onChange={(e) =>
                setDraft((d) => ({ ...d, category: e.target.value as ProjectCategory }))
              }
            >
              {PROJECT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {categoryLabel(c)}
                </option>
              ))}
            </Select>
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm text-ink-muted">
          Label <span className="text-ink-faint">(optional)</span>
          <Input
            value={draft.label}
            maxLength={200}
            placeholder={categoryLabel(draft.category)}
            onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <input
            type="checkbox"
            checked={draft.allDay}
            onChange={(e) => setDraft((d) => ({ ...d, allDay: e.target.checked }))}
          />
          All day (no fixed clock time)
        </label>

        {!draft.allDay ? (
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm text-ink-muted">
              Start
              <Select
                value={draft.startHour}
                onChange={(e) => setDraft((d) => ({ ...d, startHour: Number(e.target.value) }))}
              >
                {HOUR_OPTIONS.map((h) => (
                  <option key={h} value={h}>
                    {hourLabel(h)}
                  </option>
                ))}
              </Select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-ink-muted">
              End
              <Select
                value={draft.endHour}
                onChange={(e) => setDraft((d) => ({ ...d, endHour: Number(e.target.value) }))}
              >
                {HOUR_OPTIONS.map((h) => (
                  <option key={h} value={h}>
                    {hourLabel(h)}
                  </option>
                ))}
              </Select>
            </label>
          </div>
        ) : null}

        {!draft.allDay && draft.endHour <= draft.startHour ? (
          <p className="text-sm text-critical" role="alert">
            End must be after start.
          </p>
        ) : null}

        <div className="flex gap-2">
          <Button
            type="submit"
            className="text-sm"
            disabled={
              upsertMutation.isPending || (!draft.allDay && draft.endHour <= draft.startHour)
            }
          >
            {editingId ? "Save" : "Add block"}
          </Button>
          {editingId ? (
            <Button type="button" variant="ghost" className="text-sm" onClick={cancelEdit}>
              Cancel
            </Button>
          ) : null}
        </div>

        {upsertMutation.isError ? (
          <p className="text-sm text-critical" role="alert">
            Could not save. Try again.
          </p>
        ) : null}
      </form>
    </section>
  );
}
