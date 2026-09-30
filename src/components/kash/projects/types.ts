import type { inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "@/trpc/routers/_app";

type RouterOutputs = inferRouterOutputs<AppRouter>;

export type ProjectDetail = RouterOutputs["projects"]["getById"];
export type ProjectPhase = RouterOutputs["phases"]["listByProject"][number];
export type ProjectTask = RouterOutputs["tasks"]["listByProject"][number];
export type ProjectMilestone = RouterOutputs["projectMilestones"]["listByProject"][number];

/** The project page tabs (Spec v4; Phases lands in its own PR). */
export type ProjectViewMode = "tasks" | "timeline" | "columns" | "calendar";
