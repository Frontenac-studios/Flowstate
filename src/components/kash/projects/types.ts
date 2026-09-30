import type { inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "@/trpc/routers/_app";

type RouterOutputs = inferRouterOutputs<AppRouter>;

export type ProjectDetail = RouterOutputs["projects"]["getById"];
export type ProjectPhase = RouterOutputs["phases"]["listByProject"][number];
export type ProjectTask = RouterOutputs["tasks"]["listByProject"][number];
export type ProjectMilestone = RouterOutputs["projectMilestones"]["listByProject"][number];

/** The project page tabs (Spec v4; Timeline and Phases land in their own PRs). */
export type ProjectViewMode = "tasks" | "columns" | "calendar";
