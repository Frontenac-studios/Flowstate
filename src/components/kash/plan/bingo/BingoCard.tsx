"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  buildGrid,
  cardProgress,
  categoryBalance,
  completedLines,
  type BingoGoal,
} from "@/lib/planning/bingo-grid";
import { type ProjectCategory } from "@/lib/projects/categories";
import { useTRPC } from "@/trpc/client";

import BingoBalanceLegend from "./BingoBalanceLegend";
import BingoGrid from "./BingoGrid";
import BingoQuickAdd from "./BingoQuickAdd";

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

  const goalsQuery = useQuery({
    ...trpc.planning.listGoals.queryOptions({ bingoCardId }),
    enabled: !!bingoCardId,
  });

  const [addingCell, setAddingCell] = useState<number | null>(null);
  const [pendingGoalId, setPendingGoalId] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [confirmingFinalize, setConfirmingFinalize] = useState(false);

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
    trpc.planning.getOrCreateBingoCard.mutationOptions({ onSuccess: () => void invalidateCard() })
  );

  const createGoalMutation = useMutation(
    trpc.planning.createGoal.mutationOptions({
      onSuccess: () => {
        setAddingCell(null);
        setAddError(null);
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
        void invalidateCard();
      },
    })
  );

  if (cardQuery.isLoading) {
    return <div className="rounded-card border border-subtle bg-surface p-8 text-ink-muted" />;
  }

  if (!card) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-card border border-subtle bg-surface p-8">
        <p className="text-body text-ink">
          Your {year} bingo card is a 5×5 grid of goals. Fill the squares, then check them off as
          you go — line up five for a win.
        </p>
        <button
          type="button"
          onClick={() => startMutation.mutate({ cardYear: year })}
          disabled={startMutation.isPending}
          className="rounded-control border-[1.5px] border-ink px-4 py-2 text-body font-medium text-ink transition hover:bg-surface-2 disabled:opacity-40"
        >
          {startMutation.isPending ? "Creating…" : `Start your ${year} card`}
        </button>
      </div>
    );
  }

  const goals: BingoGoal[] = (goalsQuery.data ?? []).map((g) => ({
    id: g.id,
    title: g.title,
    category: g.category as ProjectCategory,
    cellIndex: g.cellIndex,
    state: g.state,
  }));

  const grid = buildGrid(goals);
  const { done, total } = cardProgress(goals);
  const balance = categoryBalance(goals);
  const lineCount = completedLines(grid).length;

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
  const handleAddSubmit = (title: string, category: ProjectCategory) => {
    if (addingCell === null || !bingoCardId) return;
    createGoalMutation.mutate({ bingoCardId, cellIndex: addingCell, title, category });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-caption text-ink-muted">
          <span className="rounded-control border border-subtle px-2 py-0.5">
            {locked ? "Final" : "Draft"} · {year}
          </span>
          <span>
            {done} of {total} done
          </span>
          {lineCount > 0 ? (
            <span className="inline-flex items-center gap-1 font-medium text-ink">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
                <path d="m12 2 2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 21.4l1.4-6.8L2.2 9l6.9-.7z" />
              </svg>
              {lineCount} {lineCount === 1 ? "line" : "lines"}!
            </span>
          ) : null}
        </div>

        {!locked ? (
          confirmingFinalize ? (
            <div className="flex items-center gap-2 text-caption text-ink-muted">
              <span>Lock {year}? Goals can’t be edited after.</span>
              <button
                type="button"
                onClick={() => finalizeMutation.mutate({ id: card.id })}
                disabled={finalizeMutation.isPending}
                className="rounded-control border-[1.5px] border-ink px-3 py-1 font-medium text-ink transition hover:bg-surface-2 disabled:opacity-40"
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
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingFinalize(true)}
              disabled={total === 0}
              className="rounded-control border-[1.5px] border-ink px-3 py-1.5 text-caption font-medium text-ink transition hover:bg-surface-2 disabled:opacity-40"
            >
              Finalize card
            </button>
          )
        ) : null}
      </div>

      <BingoGrid
        grid={grid}
        locked={locked}
        pendingGoalId={pendingGoalId}
        onToggleDone={handleToggleDone}
        onBackburner={handleBackburner}
        onRemove={handleRemove}
        onAdd={(cellIndex) => {
          setAddError(null);
          setAddingCell(cellIndex);
        }}
      />

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
  );
}
