"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import type { ConstraintType } from "@/lib/about-me/constants";
import { CONSTRAINT_TYPE_META } from "@/lib/about-me/constraints";
import { useTRPC } from "@/trpc/client";

import ConstraintForm, { type ConstraintDraft } from "./ConstraintForm";
import ConstraintRow from "./ConstraintRow";
import SectionSuggestions from "./SectionSuggestions";

function parseScheduleForDraft(raw: unknown): ConstraintDraft["schedule"] {
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as ConstraintDraft["schedule"];
    } catch {
      return null;
    }
  }
  return raw as ConstraintDraft["schedule"];
}

export default function ConstraintsSection() {
  const trpc = useTRPC();
  const { data: rows = [] } = useQuery(trpc.aboutMe.constraints.list.queryOptions());

  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingType, setAddingType] = useState<ConstraintType | null>(null);

  const closeForms = () => {
    setEditingId(null);
    setAddingType(null);
  };

  return (
    <section id="about-constraints" className="scroll-mt-24">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-subtitle font-medium text-ink">Constraints</h3>
        <span className="text-caption text-ink-faint">
          honored by scheduling &amp; Do Not Disturb
        </span>
      </div>
      <p className="mb-3 text-meta text-ink-muted">
        Working hours, recurring commitments, and preferences. Hard ones are never scheduled over;
        soft ones are avoided when possible.
      </p>

      <div className="space-y-5">
        {CONSTRAINT_TYPE_META.map((group) => {
          const groupRows = rows.filter((r) => r.type === group.type);
          const adding = addingType === group.type;
          return (
            <div key={group.type}>
              <p className="mb-2 text-meta text-ink-muted">{group.title}</p>
              <div className="space-y-1.5">
                {groupRows.map((row) =>
                  editingId === row.id ? (
                    <ConstraintForm
                      key={row.id}
                      initial={{
                        id: row.id,
                        type: row.type,
                        label: row.label,
                        schedule: parseScheduleForDraft(row.schedule),
                        severity: row.severity,
                      }}
                      onClose={closeForms}
                    />
                  ) : (
                    <ConstraintRow
                      key={row.id}
                      row={row}
                      onEdit={() => {
                        closeForms();
                        setEditingId(row.id);
                      }}
                    />
                  )
                )}

                {adding ? (
                  <ConstraintForm
                    initial={{ type: group.type, label: "", schedule: null, severity: "soft" }}
                    onClose={closeForms}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      closeForms();
                      setAddingType(group.type);
                    }}
                    className="rounded-row border border-dashed border-border px-3 py-1.5 text-meta text-ink-muted transition hover:border-ink hover:text-ink"
                  >
                    + Add {group.title.toLowerCase()}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <SectionSuggestions section="constraints" />
    </section>
  );
}
