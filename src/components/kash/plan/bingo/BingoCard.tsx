"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { readMotionDurationMs, MOTION_TOKEN } from "@/lib/animate/motion-tokens";

import GhostedAccept from "@/components/kash/plan/GhostedAccept";
import { Star, kashIconProps } from "@/components/kash/ui/icon";
import { useToast } from "@/components/kash/ui/ToastProvider";
import { nextEmptyCellIndex } from "@/lib/planning/bingo-cells";
import {
  buildGrid,
  cardProgress,
  categoryBalance,
  completedLines,
  type BingoGoal,
} from "@/lib/planning/bingo-grid";
import {
  isBlackoutComplete,
  newlyCompletedLines,
  readBingoRewardState,
  rewardTierForLineCount,
  rewardToastMessage,
  writeBingoRewardState,
} from "@/lib/planning/bingo-line-reward";
import { suggestSpellingFixes } from "@/lib/planning/bingo-spelling-pass";
import { recordBingoReward } from "@/lib/planning/stubs";
import { type ProjectCategory } from "@/lib/projects/categories";
import { useTRPC } from "@/trpc/client";

import BingoBalanceLegend from "./BingoBalanceLegend";
import BingoGoalPanel from "./BingoGoalPanel";
import BingoGrid from "./BingoGrid";
import BingoListView, { type BingoListGroupBy } from "./BingoListView";
import BingoOnboarding from "./BingoOnboarding";
import BingoQuickAdd from "./BingoQuickAdd";

const AWARDED_LINES_KEY = "kash-bingo-awarded-lines";

function readAwardedLineSignatures(year: number): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(`${AWARDED_LINES_KEY}-${year}`);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

function writeAwardedLineSignatures(year: number, signatures: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      `${AWARDED_LINES_KEY}-${year}`,
      JSON.stringify(Array.from(signatures))
    );
  } catch {
    /* ignore */
  }
}

type ViewMode = "card" | "list";

type Props = {
  year: number;
};

export default function BingoCard({ year }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const cardQuery = useQuery(trpc.planning.getBingoCard.queryOptions({ cardYear: year }));
  const card = cardQuery.data ?? null;
  const bingoCardId = card?.id;
  const locked = card?.status === "final";
  const [locking, setLocking] = useState(false);
  const prevLockedRef = useRef(locked);

  useEffect(() => {
    if (!prevLockedRef.current && locked) {
      setLocking(true);
      const timer = window.setTimeout(
        () => setLocking(false),
        readMotionDurationMs(MOTION_TOKEN.short)
      );
      prevLockedRef.current = locked;
      return () => window.clearTimeout(timer);
    }
    prevLockedRef.current = locked;
  }, [locked]);

  const goalsQuery = useQuery({
    ...trpc.planning.listGoals.queryOptions({ bingoCardId }),
    enabled: !!bingoCardId,
  });

  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [listGroupBy, setListGroupBy] = useState<BingoListGroupBy>("category");
  const [addingCell, setAddingCell] = useState<number | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [pendingGoalId, setPendingGoalId] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [confirmingFinalize, setConfirmingFinalize] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { toast } = useToast();
  const [spellingStaged, setSpellingStaged] = useState<Set<string>>(new Set());
  const [blackoutAnimating, setBlackoutAnimating] = useState(false);
  const awardedRef = useRef<Set<string>>(readAwardedLineSignatures(year));

  const invalidateCard = () =>
    queryClient.invalidateQueries({
      queryKey: trpc.planning.getBingoCard.queryKey({ cardYear: year }),
    });
  const invalidateGoals = () =>
    bingoCardId
      ? queryClient.invalidateQueries({
          queryKey: trpc.planning.listGoals.queryKey({ bingoCardId }),
        })
      : Promise.resolve();

  const startMutation = useMutation(
    trpc.planning.getOrCreateBingoCard.mutationOptions({
      onSuccess: () => {
        void invalidateCard();
        setShowOnboarding(true);
      },
    })
  );

  const createGoalMutation = useMutation(
    trpc.planning.createGoal.mutationOptions({
      onSuccess: () => {
        setAddingCell(null);
        setAddError(null);
        setShowOnboarding(false);
        void invalidateGoals();
      },
      onError: (err) => {
        setAddError(
          err.data?.code === "CONFLICT"
            ? "That square is already taken."
            : "Couldn't add the goal. Please try again."
        );
      },
    })
  );

  const updateGoalMutation = useMutation(
    trpc.planning.updateGoal.mutationOptions({
      onSettled: () => {
        setPendingGoalId(null);
        void invalidateGoals();
      },
    })
  );

  const removeGoalMutation = useMutation(
    trpc.planning.removeGoal.mutationOptions({
      onSettled: () => {
        setPendingGoalId(null);
        void invalidateGoals();
      },
    })
  );

  const finalizeMutation = useMutation(
    trpc.planning.finalizeBingoCard.mutationOptions({
      onSuccess: () => {
        setConfirmingFinalize(false);
        setSpellingStaged(new Set());
        void invalidateCard();
      },
    })
  );

  const goals: BingoGoal[] = useMemo(
    () =>
      (goalsQuery.data ?? []).map((g) => ({
        id: g.id,
        title: g.title,
        category: g.category as ProjectCategory,
        cellIndex: g.cellIndex,
        state: g.state,
      })),
    [goalsQuery.data]
  );

  const grid = useMemo(() => buildGrid(goals), [goals]);
  const { done, total } = cardProgress(goals);
  const balance = categoryBalance(goals);
  const lineCount = completedLines(grid).length;
  const blackoutComplete = isBlackoutComplete(grid);
  const blackoutFinaleShown = readBingoRewardState(year).blackoutShown;

  const spellingFixes = useMemo(
    () => (confirmingFinalize && !locked ? suggestSpellingFixes(goals) : []),
    [confirmingFinalize, locked, goals]
  );

  const spellingGhostItems = spellingFixes.map((fix) => ({
    id: fix.goalId,
    label: fix.suggestedTitle,
    detail: `Was: ${fix.currentTitle}`,
  }));

  const handleRewards = useCallback(async () => {
    if (!locked) return;

    const freshLines = newlyCompletedLines(grid, awardedRef.current);
    if (freshLines.length === 0 && !isBlackoutComplete(grid)) return;

    const rewardState = readBingoRewardState(year);

    if (isBlackoutComplete(grid) && !rewardState.blackoutShown) {
      setBlackoutAnimating(true);
      toast({ message: rewardToastMessage("blackout"), variant: "success" });
      writeBingoRewardState(year, { ...rewardState, blackoutShown: true });
      await recordBingoReward({ cardYear: year, lineType: "row" });
      window.setTimeout(() => setBlackoutAnimating(false), 540);
      return;
    }

    for (const entry of freshLines) {
      awardedRef.current.add(entry.signature);
      writeAwardedLineSignatures(year, awardedRef.current);

      rewardState.linesAwarded += 1;
      const tier = rewardTierForLineCount(rewardState.linesAwarded);
      toast({ message: rewardToastMessage(tier), variant: "success" });
      writeBingoRewardState(year, { ...rewardState });
      await recordBingoReward({ cardYear: year, lineType: entry.type });
    }
  }, [grid, locked, toast, year]);

  useEffect(() => {
    awardedRef.current = readAwardedLineSignatures(year);
  }, [year]);

  useEffect(() => {
    void handleRewards();
  }, [handleRewards]);

  const occupiedCells = useMemo(
    () => new Set(goals.map((g) => g.cellIndex).filter((i): i is number => i != null)),
    [goals]
  );

  const addGoalsFromLines = useCallback(
    async (lines: { title: string; category: ProjectCategory }[]) => {
      if (!bingoCardId) return;
      const occupied = new Set(occupiedCells);
      for (const line of lines) {
        const cell = nextEmptyCellIndex(occupied);
        if (cell == null) break;
        await createGoalMutation.mutateAsync({
          bingoCardId,
          cellIndex: cell,
          title: line.title,
          category: line.category,
        });
        occupied.add(cell);
      }
    },
    [bingoCardId, createGoalMutation, occupiedCells]
  );

  const handleToggleDone = (goal: BingoGoal) => {
    setPendingGoalId(goal.id);
    updateGoalMutation.mutate({ id: goal.id, state: goal.state === "done" ? "active" : "done" });
  };
  const handleBackburner = (goal: BingoGoal) => {
    setPendingGoalId(goal.id);
    updateGoalMutation.mutate({
      id: goal.id,
      state: goal.state === "backburnered" ? "active" : "backburnered",
    });
  };
  const handleRemove = (goal: BingoGoal) => {
    setPendingGoalId(goal.id);
    removeGoalMutation.mutate({ id: goal.id });
  };
  const handleAddSubmit = (title: string, category: ProjectCategory, valueId: string | null) => {
    if (addingCell === null || !bingoCardId) return;
    createGoalMutation.mutate({
      bingoCardId,
      cellIndex: addingCell,
      title,
      category,
      valueId,
    });
  };

  const applySpellingFixes = () => {
    for (const fix of spellingFixes) {
      if (!spellingStaged.has(fix.goalId)) continue;
      updateGoalMutation.mutate({ id: fix.goalId, title: fix.suggestedTitle });
    }
    if (card) finalizeMutation.mutate({ id: card.id });
  };

  if (cardQuery.isLoading) {
    return (
      <div className="rounded-card border border-subtle bg-surface p-8 text-ink-muted shadow-surface" />
    );
  }

  if (!card) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-card border border-subtle bg-surface p-8 shadow-surface">
        <p className="text-body text-ink">
          Your {year} bingo card is a 5×5 grid of goals. Fill the squares, then check them off as
          you go — line up five for a win.
        </p>
        <button
          type="button"
          onClick={() => startMutation.mutate({ cardYear: year })}
          disabled={startMutation.isPending}
          className="rounded-control border-emphasis border-ink px-4 py-2 text-body font-medium text-ink transition hover:bg-surface-2 disabled:opacity-40"
        >
          {startMutation.isPending ? "Creating…" : `Start your ${year} card`}
        </button>
      </div>
    );
  }

  if (showOnboarding && goals.length === 0) {
    return (
      <BingoOnboarding
        year={year}
        busy={createGoalMutation.isPending}
        onBrainDump={(lines) => void addGoalsFromLines(lines)}
        onBlank={() => setShowOnboarding(false)}
        onGuidedComplete={() => setShowOnboarding(false)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-caption text-ink-muted">
            <span className="rounded-control border border-subtle px-2 py-0.5">
              {locked ? "Final" : "Draft"} · {year}
            </span>
            <span>
              {done} of {total} done
            </span>
            {locked && lineCount > 0 ? (
              <span className="inline-flex items-center gap-1 font-medium text-ink">
                <Star
                  {...kashIconProps({ tokenSize: "sm", className: "fill-current" })}
                  aria-hidden
                />
                {lineCount} {lineCount === 1 ? "line" : "lines"}!
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-control border border-subtle p-0.5 text-caption">
              <button
                type="button"
                aria-pressed={viewMode === "card"}
                onClick={() => setViewMode("card")}
                className={`rounded-control px-2.5 py-1 font-medium ${
                  viewMode === "card" ? "bg-surface-2 text-ink" : "text-ink-muted"
                }`}
              >
                Card
              </button>
              <button
                type="button"
                aria-pressed={viewMode === "list"}
                onClick={() => setViewMode("list")}
                className={`rounded-control px-2.5 py-1 font-medium ${
                  viewMode === "list" ? "bg-surface-2 text-ink" : "text-ink-muted"
                }`}
              >
                List
              </button>
            </div>

            {!locked ? (
              confirmingFinalize ? (
                <div className="flex flex-col gap-3 rounded-card border border-subtle bg-surface p-3 shadow-surface">
                  {spellingGhostItems.length > 0 ? (
                    <GhostedAccept
                      items={spellingGhostItems}
                      stagedIds={spellingStaged}
                      applyLabel="Apply fixes & finalize"
                      onStage={(id) => {
                        setSpellingStaged((prev) => {
                          const next = new Set(prev);
                          if (next.has(id)) next.delete(id);
                          else next.add(id);
                          return next;
                        });
                      }}
                      onDismiss={() => {
                        /* skip individual fixes */
                      }}
                      onApply={applySpellingFixes}
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-caption text-ink-muted">
                      <span>Lock {year}? Goals can&apos;t be edited after.</span>
                      <button
                        type="button"
                        onClick={() => finalizeMutation.mutate({ id: card.id })}
                        disabled={finalizeMutation.isPending}
                        className="rounded-control border-emphasis border-ink px-3 py-1 font-medium text-ink transition hover:bg-surface-2 disabled:opacity-40"
                      >
                        {finalizeMutation.isPending ? "Finalizing…" : "Finalize"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingFinalize(false)}
                        className="px-2 py-1 text-ink-muted transition hover:text-ink"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingFinalize(true)}
                  disabled={total === 0}
                  className="rounded-control border-emphasis border-ink px-3 py-1.5 text-caption font-medium text-ink transition hover:bg-surface-2 disabled:opacity-40"
                >
                  Finalize card
                </button>
              )
            ) : null}
          </div>
        </div>

        {!locked ? (
          <p className="text-caption text-ink-faint">
            Draft — no bingo rewards until you finalize. Target finalize by Jan 31.
          </p>
        ) : null}

        {viewMode === "card" ? (
          <div className={blackoutAnimating ? "bingo-blackout-bounce" : undefined}>
            {blackoutComplete && locked && blackoutFinaleShown ? (
              <p className="plan-zoom-enter mb-2 text-center text-sm font-medium text-ink">
                Blackout — every square complete. What a year.
              </p>
            ) : null}
            <BingoGrid
              grid={grid}
              locked={locked}
              locking={locking}
              pendingGoalId={pendingGoalId}
              onToggleDone={handleToggleDone}
              onBackburner={handleBackburner}
              onRemove={handleRemove}
              onAdd={(cellIndex) => {
                setAddError(null);
                setAddingCell(cellIndex);
              }}
              onOpenGoal={(goal) => setSelectedGoalId(goal.id)}
            />
          </div>
        ) : (
          <BingoListView
            goals={goals}
            groupBy={listGroupBy}
            onGroupByChange={setListGroupBy}
            onSelectGoal={(goal) => setSelectedGoalId(goal.id)}
            locked={locked}
          />
        )}

        {addingCell !== null ? (
          <BingoQuickAdd
            squareLabel={addingCell + 1}
            busy={createGoalMutation.isPending}
            error={addError}
            onSubmit={handleAddSubmit}
            onCancel={() => {
              setAddingCell(null);
              setAddError(null);
            }}
          />
        ) : null}

        <BingoBalanceLegend balance={balance} />
      </div>

      {selectedGoalId ? (
        <div className="w-full shrink-0 lg:w-80">
          <BingoGoalPanel
            goalId={selectedGoalId}
            locked={locked}
            onClose={() => setSelectedGoalId(null)}
          />
        </div>
      ) : null}
    </div>
  );
}
