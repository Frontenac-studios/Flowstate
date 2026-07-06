"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useId, useState } from "react";

import Input from "@/components/kash/ui/Input";
import { WinFacetBadge } from "@/components/kash/daily-wins/WinFacetBadge";
import { assignProposalsToEmptySlots } from "@/lib/daily-wins/assign-proposals";
import { EMPTY_DAY_FOOTER, shouldShowEmptyDayFooter } from "@/lib/daily-wins/empty-day-tone";
import {
  facetInvitation,
  inferWinFacet,
  openFacetsFromSlots,
  SLOT_FACET,
} from "@/lib/daily-wins/facets";
import {
  markDailyWinsExplainerSeen,
  readDailyWinsExplainerSeen,
} from "@/lib/daily-wins/tracker-storage";
import { HERO_WIN_SLOTS, type HeroWinSlot, type WinProposal } from "@/lib/daily-wins/types";
import { cn } from "@/lib/cn";
import { useTRPC } from "@/trpc/client";

type DailyWinRow = {
  id: string;
  slot: number | null;
  source: string;
  refId: string | null;
  label: string | null;
  state: string;
  author: string;
};

type Props = {
  winDate: string;
  tzOffsetMinutes: number;
};

function winLabel(row: DailyWinRow): string {
  return row.label?.trim() || "Win";
}

function slotLabel(slot: HeroWinSlot): string {
  return String(slot + 1);
}

type SlotRowProps = {
  slot: HeroWinSlot;
  accepted: DailyWinRow | null;
  proposal: WinProposal | null;
  writable: boolean;
  manualOpen: boolean;
  settling: boolean;
  busy: boolean;
  onKeep: () => void;
  onDismiss: () => void;
  onOpenManual: () => void;
  onManualSubmit: (label: string) => void;
  onManualCancel: () => void;
  onRemove: () => void;
  onMove: (targetSlot: HeroWinSlot) => void;
};

function DailyWinSlotRow({
  slot,
  accepted,
  proposal,
  writable,
  manualOpen,
  settling,
  busy,
  onKeep,
  onDismiss,
  onOpenManual,
  onManualSubmit,
  onManualCancel,
  onRemove,
  onMove,
}: SlotRowProps) {
  const manualInputId = useId();
  const [manualDraft, setManualDraft] = useState("");

  useEffect(() => {
    if (!manualOpen) setManualDraft("");
  }, [manualOpen]);

  if (accepted) {
    const facet = inferWinFacet({
      source: accepted.source,
      label: winLabel(accepted),
      slot,
    });
    return (
      <li
        className={cn(
          "flex items-start justify-between gap-3 rounded-lg border border-subtle bg-surface px-3 py-2 text-sm transition duration-short",
          settling && "ghost-settle"
        )}
      >
        <div className="min-w-0 flex-1">
          <WinFacetBadge facet={facet} className="mb-1" />
          <span className="text-ink">{winLabel(accepted)}</span>
        </div>
        {writable ? (
          <div className="flex shrink-0 flex-col items-end gap-1">
            <div className="flex gap-1" role="group" aria-label={`Move win ${slotLabel(slot)}`}>
              {HERO_WIN_SLOTS.map((target) => (
                <button
                  key={target}
                  type="button"
                  disabled={busy || target === slot}
                  aria-label={`Move to slot ${slotLabel(target)}`}
                  aria-pressed={target === slot}
                  onClick={() => onMove(target)}
                  className={cn(
                    "rounded px-1.5 py-0.5 text-xs",
                    target === slot
                      ? "bg-ink/10 font-medium text-ink"
                      : "hover:bg-ink/5 text-ink-muted hover:text-ink"
                  )}
                >
                  {slotLabel(target)}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={busy}
              aria-label={`Remove win: ${winLabel(accepted)}`}
              onClick={onRemove}
              className="hover:bg-ink/5 rounded px-2 py-1 text-xs text-ink-muted hover:text-ink"
            >
              Remove
            </button>
          </div>
        ) : null}
      </li>
    );
  }

  if (manualOpen) {
    return (
      <li className="border-ink/25 bg-ink/[0.02] rounded-lg border border-dashed px-3 py-2 text-sm">
        <label className="sr-only" htmlFor={manualInputId}>
          Your win for slot {slotLabel(slot)}
        </label>
        <Input
          id={manualInputId}
          autoFocus
          disabled={busy}
          value={manualDraft}
          onChange={(e) => setManualDraft(e.target.value)}
          placeholder="Something good from today…"
          maxLength={500}
          className="w-full text-sm"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              onManualCancel();
              return;
            }
            if (e.key !== "Enter") return;
            e.preventDefault();
            const label = manualDraft.trim();
            if (!label) return;
            onManualSubmit(label);
          }}
        />
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            disabled={busy || !manualDraft.trim()}
            onClick={() => {
              const label = manualDraft.trim();
              if (!label) return;
              onManualSubmit(label);
            }}
            className="hover:bg-ink/5 rounded px-2 py-1 text-xs text-ink"
          >
            Save
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onManualCancel}
            className="hover:bg-ink/5 rounded px-2 py-1 text-xs text-ink-muted hover:text-ink"
          >
            Cancel
          </button>
        </div>
      </li>
    );
  }

  if (proposal) {
    return (
      <li className="border-ink/25 bg-ink/[0.02] flex flex-col gap-2 rounded-lg border border-dashed px-3 py-2 text-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="mr-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
              ✦ suggested
            </span>
            <span className="text-ink/70">{proposal.label}</span>
          </div>
          {writable ? (
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                disabled={busy}
                aria-label={`Keep win: ${proposal.label}`}
                onClick={onKeep}
                className="hover:bg-ink/5 rounded px-2 py-1 text-ink"
              >
                ✓
              </button>
              <button
                type="button"
                disabled={busy}
                aria-label={`Dismiss win: ${proposal.label}`}
                onClick={onDismiss}
                className="hover:bg-ink/5 rounded px-2 py-1 text-ink-muted"
              >
                ✕
              </button>
            </div>
          ) : null}
        </div>
        {writable ? (
          <button
            type="button"
            disabled={busy}
            onClick={onOpenManual}
            className="self-start rounded px-1 py-0.5 text-xs text-ink-muted hover:text-ink"
          >
            + Add your own instead
          </button>
        ) : null}
      </li>
    );
  }

  return (
    <li className="border-ink/25 bg-ink/[0.02] flex flex-col gap-1 rounded-lg border border-dashed px-3 py-2 text-sm">
      <WinFacetBadge facet={SLOT_FACET[slot]} />
      <span className="text-caption text-ink-muted">{facetInvitation(SLOT_FACET[slot])}</span>
      {writable ? (
        <button
          type="button"
          disabled={busy}
          onClick={onOpenManual}
          className="hover:bg-ink/5 self-start rounded px-2 py-1 text-xs text-ink-muted hover:text-ink"
        >
          + Add your own
        </button>
      ) : null}
    </li>
  );
}

export function DailyWinsTracker({ winDate, tzOffsetMinutes }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [manualSlot, setManualSlot] = useState<HeroWinSlot | null>(null);
  const [settlingSlot, setSettlingSlot] = useState<HeroWinSlot | null>(null);
  const [showExplainer, setShowExplainer] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const dayQuery = useQuery(trpc.dailyWins.getDay.queryOptions({ winDate, tzOffsetMinutes }));
  const reflectionBeatQuery = useQuery(
    trpc.dailyWins.getReflectionBeat.queryOptions({ winDate, tzOffsetMinutes })
  );

  useEffect(() => {
    setShowExplainer(!readDailyWinsExplainerSeen());
  }, []);

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: trpc.dailyWins.getDay.queryKey({ winDate, tzOffsetMinutes }),
    });
    void queryClient.invalidateQueries({
      queryKey: trpc.dailyWins.getReflectionBeat.queryKey({ winDate, tzOffsetMinutes }),
    });
  }, [
    queryClient,
    trpc.dailyWins.getDay,
    trpc.dailyWins.getReflectionBeat,
    winDate,
    tzOffsetMinutes,
  ]);

  const acceptMutation = useMutation(trpc.dailyWins.accept.mutationOptions());
  const dismissMutation = useMutation(trpc.dailyWins.dismiss.mutationOptions());
  const addManualMutation = useMutation(trpc.dailyWins.addManual.mutationOptions());
  const updateMutation = useMutation(trpc.dailyWins.update.mutationOptions());
  const removeMutation = useMutation(trpc.dailyWins.remove.mutationOptions());

  const busy =
    acceptMutation.isPending ||
    dismissMutation.isPending ||
    addManualMutation.isPending ||
    updateMutation.isPending ||
    removeMutation.isPending;

  const triggerSettle = useCallback((slot: HeroWinSlot) => {
    setSettlingSlot(slot);
    window.setTimeout(() => setSettlingSlot(null), 300);
  }, []);

  const dismissExplainer = useCallback(() => {
    markDailyWinsExplainerSeen();
    setShowExplainer(false);
  }, []);

  const handleKeep = async (slot: HeroWinSlot, proposal: WinProposal) => {
    dismissExplainer();
    setActionError(null);
    try {
      await acceptMutation.mutateAsync({
        winDate,
        tzOffsetMinutes,
        slot,
        source: proposal.source,
        refId: proposal.refId,
        label: proposal.label,
        author: "ai",
      });
      triggerSettle(slot);
      invalidate();
    } catch {
      setActionError("Couldn't save that win — try again.");
    }
  };

  const handleDismiss = async (proposal: WinProposal) => {
    dismissExplainer();
    setActionError(null);
    try {
      await dismissMutation.mutateAsync({
        winDate,
        tzOffsetMinutes,
        source: proposal.source,
        refId: proposal.refId,
      });
      invalidate();
    } catch {
      setActionError("Couldn't dismiss that suggestion — try again.");
    }
  };

  const handleManualSubmit = async (slot: HeroWinSlot, label: string) => {
    dismissExplainer();
    setActionError(null);
    try {
      await addManualMutation.mutateAsync({
        winDate,
        tzOffsetMinutes,
        slot,
        label,
      });
      setManualSlot(null);
      triggerSettle(slot);
      invalidate();
    } catch {
      setActionError("Couldn't add your win — try again.");
    }
  };

  const handleRemove = async (row: DailyWinRow) => {
    setActionError(null);
    try {
      await removeMutation.mutateAsync({ id: row.id, tzOffsetMinutes });
      invalidate();
    } catch {
      setActionError("Couldn't remove that win — try again.");
    }
  };

  const handleMove = async (row: DailyWinRow, targetSlot: HeroWinSlot) => {
    if (row.slot === targetSlot) return;
    setActionError(null);
    try {
      await updateMutation.mutateAsync({
        id: row.id,
        tzOffsetMinutes,
        slot: targetSlot,
      });
      invalidate();
    } catch {
      setActionError("Couldn't move that win — try again.");
    }
  };

  if (dayQuery.isLoading || reflectionBeatQuery.isLoading) {
    return (
      <section aria-label="Three daily wins">
        <p className="text-body text-ink-muted">Loading wins…</p>
      </section>
    );
  }

  if (!dayQuery.data || !reflectionBeatQuery.data) return null;

  const { slots, writable } = dayQuery.data;
  const { proposals, gentlePrompt } = reflectionBeatQuery.data;
  const proposalBySlot = assignProposalsToEmptySlots(slots, proposals);
  const filledCount = slots.filter(Boolean).length;
  const showEmptyDayFooter = shouldShowEmptyDayFooter({
    writable,
    filledCount,
    proposalCount: proposals.length,
  });
  const openFacetInvitations = openFacetsFromSlots(slots).map((facet) => facetInvitation(facet));

  return (
    <section className="space-y-[var(--space-3)]" aria-label="Three daily wins">
      <div>
        <p className="text-caption font-medium uppercase tracking-wide text-ink-muted">
          Three wins
        </p>
        {showExplainer ? (
          <p className="mt-[var(--space-1)] text-body text-ink-muted">
            Three small wins from today — keep what resonates, add your own, or leave it quiet.
          </p>
        ) : gentlePrompt ? (
          <p className="mt-[var(--space-1)] text-body text-ink-muted">{gentlePrompt}</p>
        ) : openFacetInvitations.length > 0 && filledCount > 0 ? (
          <p className="mt-[var(--space-1)] text-body text-ink-muted">{openFacetInvitations[0]}</p>
        ) : null}
      </div>

      <ul className="flex flex-col gap-2">
        {HERO_WIN_SLOTS.map((slot) => {
          const accepted = slots[slot] as DailyWinRow | null;
          const proposal = accepted ? null : (proposalBySlot.get(slot) ?? null);
          return (
            <DailyWinSlotRow
              key={slot}
              slot={slot}
              accepted={accepted}
              proposal={proposal}
              writable={writable}
              manualOpen={manualSlot === slot}
              settling={settlingSlot === slot}
              busy={busy}
              onKeep={() => {
                if (!proposal) return;
                void handleKeep(slot, proposal);
              }}
              onDismiss={() => {
                if (!proposal) return;
                void handleDismiss(proposal);
              }}
              onOpenManual={() => {
                dismissExplainer();
                setManualSlot(slot);
              }}
              onManualSubmit={(label) => {
                void handleManualSubmit(slot, label);
              }}
              onManualCancel={() => setManualSlot(null)}
              onRemove={() => {
                if (!accepted) return;
                void handleRemove(accepted);
              }}
              onMove={(targetSlot) => {
                if (!accepted) return;
                void handleMove(accepted, targetSlot);
              }}
            />
          );
        })}
      </ul>

      {!writable ? (
        <p className="text-caption text-ink-faint">Yesterday&apos;s wins are read-only now.</p>
      ) : null}

      {showEmptyDayFooter ? <p className="text-body text-ink-muted">{EMPTY_DAY_FOOTER}</p> : null}

      {actionError ? (
        <p className="text-body text-critical" role="alert">
          {actionError}
        </p>
      ) : null}
    </section>
  );
}
