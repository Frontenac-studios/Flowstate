"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { defaultReservedDayLabel } from "@/lib/planning/reserved-day-category";
import { useTRPC } from "@/trpc/client";

type ReservedDay = {
  id: string;
  type: "outside" | "personal";
  label: string | null;
  resolvedDate: string | null;
};

type Props = {
  year: number;
  month: number;
  reservedDays: ReservedDay[];
};

export default function ReservedDaysPanel({ year, month, reservedDays }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [pickId, setPickId] = useState<string | null>(null);
  const [pickDate, setPickDate] = useState("");

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: trpc.planning.listReservedDays.queryKey({ year, month }),
    });
    void queryClient.invalidateQueries({
      queryKey: trpc.protectedBlocks.listForMonth.queryKey({ year, month }),
    });
  };

  const createMutation = useMutation(
    trpc.planning.createReservedDay.mutationOptions({ onSuccess: invalidate })
  );
  const removeMutation = useMutation(
    trpc.planning.removeReservedDay.mutationOptions({ onSuccess: invalidate })
  );
  const resolveMutation = useMutation(
    trpc.planning.resolveReservedDay.mutationOptions({
      onSuccess: () => {
        setPickId(null);
        setPickDate("");
        invalidate();
      },
    })
  );

  const canAdd = reservedDays.length < 2;

  // Bound the manual date picker to this month so a reserved day can't resolve
  // to a date outside the month it belongs to.
  const monthStr = String(month).padStart(2, "0");
  const monthMin = `${year}-${monthStr}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthMax = `${year}-${monthStr}-${String(lastDay).padStart(2, "0")}`;
  const pickWithinMonth = pickDate >= monthMin && pickDate <= monthMax;

  return (
    <section className="flex flex-col gap-3 rounded-card border border-subtle bg-surface p-4 shadow-surface">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-caption font-medium uppercase tracking-wide text-ink-muted">
          Reserved days
        </h3>
        {canAdd ? (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate({ year, month, type: "outside", label: null })}
              className="text-caption text-ink-muted transition hover:text-ink disabled:opacity-40"
            >
              + Outside
            </button>
            <button
              type="button"
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate({ year, month, type: "personal", label: null })}
              className="text-caption text-ink-muted transition hover:text-ink disabled:opacity-40"
            >
              + Personal
            </button>
          </div>
        ) : null}
      </div>

      {reservedDays.length === 0 ? (
        <p className="text-sm text-ink-faint">
          Reserve 1–2 flexible self-care days for this month.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {reservedDays.map((day) => (
            <li
              key={day.id}
              className="flex flex-col gap-2 rounded-control border border-subtle px-3 py-2 text-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-medium text-ink">
                    {day.label ?? defaultReservedDayLabel(day.type)}
                  </span>
                  <span className="ml-2 text-caption text-ink-muted">
                    {day.type === "outside" ? "Outside" : "Personal"}
                    {day.resolvedDate ? ` · ${day.resolvedDate}` : " · flexible"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeMutation.mutate({ id: day.id })}
                  className="shrink-0 text-caption text-ink-muted hover:text-ink"
                  aria-label={`Remove ${day.label ?? defaultReservedDayLabel(day.type)}`}
                >
                  ✕
                </button>
              </div>

              {!day.resolvedDate ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPickId((cur) => (cur === day.id ? null : day.id));
                      setPickDate("");
                    }}
                    className="text-caption text-ink-muted underline-offset-2 hover:text-ink hover:underline"
                  >
                    Pick manually
                  </button>
                  {pickId === day.id ? (
                    <>
                      <input
                        type="date"
                        value={pickDate}
                        min={monthMin}
                        max={monthMax}
                        onChange={(e) => setPickDate(e.target.value)}
                        className="rounded-control border border-subtle px-2 py-1 text-sm"
                      />
                      <button
                        type="button"
                        disabled={!pickDate || !pickWithinMonth || resolveMutation.isPending}
                        onClick={() =>
                          resolveMutation.mutate({ id: day.id, resolvedDate: pickDate })
                        }
                        className="btn-outline px-2 py-1 text-caption"
                      >
                        Set date
                      </button>
                    </>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
