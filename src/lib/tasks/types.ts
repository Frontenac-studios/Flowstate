import type { InferSelectModel } from "drizzle-orm";

import type { projects, tasks } from "@/db/schema";

export type Task = InferSelectModel<typeof tasks>;
export type Project = InferSelectModel<typeof projects>;
