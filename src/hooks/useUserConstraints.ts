"use client";

import { useQuery } from "@tanstack/react-query";

import { toEvaluableConstraint } from "@/lib/about-me/constraint-eval";
import { useTRPC } from "@/trpc/client";

/** Client-side user constraints for scheduling + in-app quiet checks. */
export function useUserConstraints() {
  const trpc = useTRPC();
  const query = useQuery(trpc.aboutMe.constraints.list.queryOptions());

  const constraints = (query.data ?? []).map(toEvaluableConstraint);

  return { ...query, constraints };
}
