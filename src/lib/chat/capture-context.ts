import { z } from "zod";

import { categoryLabel, PROJECT_CATEGORIES } from "@/lib/projects/categories";

import { planningSurfaceSchema } from "./planning-surface";

export const captureContextSchema = z.object({
  surface: planningSurfaceSchema,
  projectId: z.string().uuid().optional(),
  projectSlug: z.string().min(1).optional(),
  phaseId: z.string().uuid().nullable().optional(),
  phaseName: z.string().min(1).optional(),
  category: z.enum(PROJECT_CATEGORIES).optional(),
  defaultBucket: z.enum(["inbox", "today"]).optional(),
  openedAt: z.string().datetime(),
});

export type CaptureContext = z.infer<typeof captureContextSchema>;

export function createCaptureContext(input: Omit<CaptureContext, "openedAt">): CaptureContext {
  return { ...input, openedAt: new Date().toISOString() };
}

export function formatCaptureContextBlock(ctx: CaptureContext): string {
  const lines = ["Capture intent (user opened + from this surface):"];
  lines.push(`- Surface: ${ctx.surface}`);
  if (ctx.defaultBucket) lines.push(`- Default bucket: ${ctx.defaultBucket}`);
  if (ctx.projectSlug) lines.push(`- Project: #${ctx.projectSlug}`);
  if (ctx.phaseName) lines.push(`- Phase: ${ctx.phaseName}`);
  else if (ctx.phaseId === null) lines.push("- Phase: (project loose)");
  if (ctx.category) lines.push(`- Category: ${ctx.category}`);
  return lines.join("\n");
}

export function captureContextPlaceholder(ctx: CaptureContext): string {
  if (ctx.surface === "projects") {
    if (ctx.phaseName) return `Add tasks for ${ctx.phaseName}…`;
    // Loose-tasks row on the projects index: category preset, no project.
    if (ctx.category && !ctx.projectSlug) return `Add ${categoryLabel(ctx.category)} tasks…`;
  }
  if (ctx.surface === "loose-tasks") return "Add a loose task…";
  if (ctx.surface === "week") return "Add tasks to inbox…";
  // Today capture (Option B): chat lands in the inbox, not today's list.
  if (ctx.surface === "today") return "Add tasks to your inbox…";
  if (ctx.surface === "morning-handoff") return "Reply or dump tasks for today…";
  if (ctx.surface === "backlog") return "Describe a task to plan…";
  return "Message Claude…";
}
