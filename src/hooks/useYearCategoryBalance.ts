"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { categoryBalance, type BingoGoal } from "@/lib/planning/bingo-grid";
import { type ProjectCategory } from "@/lib/projects/categories";
import { useTRPC } from "@/trpc/client";

/**
 * Category mix of a year's bingo goals, shaped for the balance bar. Mirrors the
 * card → goals → categoryBalance derivation in BingoCard so the Plan coach dock
 * can pin the same indicator the Goals view shows. Returns null until goals load.
 */
export function useYearCategoryBalance(year: number): Record<ProjectCategory, number> | null {
  const trpc = useTRPC();

  const cardQuery = useQuery(trpc.planning.getBingoCard.queryOptions({ cardYear: year }));
  const bingoCardId = cardQuery.data?.id;

  const goalsQuery = useQuery({
    ...trpc.planning.listGoals.queryOptions({ bingoCardId }),
    enabled: !!bingoCardId,
  });

  return useMemo(() => {
    if (!goalsQuery.data) return null;
    const goals: BingoGoal[] = goalsQuery.data.map((g) => ({
      id: g.id,
      title: g.title,
      category: g.category as ProjectCategory,
      cellIndex: g.cellIndex,
      state: g.state,
    }));
    return categoryBalance(goals);
  }, [goalsQuery.data]);
}
