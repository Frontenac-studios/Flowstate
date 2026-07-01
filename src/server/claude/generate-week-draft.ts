import "server-only";

import { datesInIsoWeek, parseISODateString, toISODateString } from "@/lib/dates/local-day";
import { categoryLabel } from "@/lib/projects/categories";
import { adjustWeekDraftForCapacity } from "@/lib/week/adjust-week-draft-capacity";
import { getAnthropicConfig, isAnthropicConfigured } from "@/lib/env";
import { templateWeekDraft, type WeekDraftProposal } from "@/lib/week/template-week-draft";
import { weekDraftValidationContextFromSource } from "@/lib/week/week-draft-validation-context";

import { requireAnthropicClient } from "./client";
import type { WeekDraftContext } from "./fetch-week-draft-context";
import { buildSystemPrompt } from "./system-prompts";

export type { WeekDraftProposal };

function weekRefFromContext(ctx: WeekDraftContext): Date {
  return parseISODateString(ctx.weekStartIso);
}

function templateFromContext(ctx: WeekDraftContext): WeekDraftProposal {
  const proposal = templateWeekDraft(
    ctx.inbox.map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      category: t.category,
      categoryUnresolved: t.categoryUnresolved,
      loadWeight: t.loadWeight,
    })),
    weekRefFromContext(ctx),
    {
      protectedCountByDate: ctx.protectedCountByDate,
      categoryLoad: ctx.categoryLoad,
      balanceGapCategories: ctx.balanceGaps.map((gap) => gap.category),
      overCommitThreshold: ctx.overCommitThreshold,
      existingTasksByDate: Object.fromEntries(
        ctx.weekDates.map((iso) => [
          iso,
          ctx.scheduledInWeek.filter((t) => t.scheduledDate === iso).map((t) => ({ id: t.id })),
        ])
      ),
      taskWeightById: Object.fromEntries(
        [...ctx.inbox, ...ctx.scheduledInWeek].map((task) => [task.id, task.loadWeight])
      ),
      userConstraints: ctx.userConstraints,
    }
  );

  return {
    ...proposal,
    assignments: adjustWeekDraftForCapacity(
      proposal.assignments,
      weekDraftValidationContextFromSource(ctx),
      ctx.weekDates
    ),
  };
}

function parseWeekDraftResponse(text: string): WeekDraftProposal | null {
  const trimmed = text.trim();
  try {
    const json = JSON.parse(trimmed) as {
      summary?: string;
      assignments?: { taskId?: string; scheduledDate?: string; rationale?: string }[];
    };
    if (json.summary && Array.isArray(json.assignments)) {
      return {
        summary: json.summary.trim(),
        assignments: json.assignments
          .filter((a) => a.taskId && a.scheduledDate)
          .map((a) => ({
            taskId: a.taskId!,
            scheduledDate: a.scheduledDate!,
            rationale: a.rationale?.trim(),
          })),
      };
    }
  } catch {
    /* fall through */
  }
  return null;
}

function sanitizeProposal(
  proposal: WeekDraftProposal,
  ctx: WeekDraftContext,
  weekDates: Set<string>
): WeekDraftProposal {
  const knownIds = new Set([
    ...ctx.inbox.map((t) => t.id),
    ...ctx.scheduledInWeek.map((t) => t.id),
  ]);

  const byTask = new Map<string, WeekDraftProposal["assignments"][number]>();
  for (const row of proposal.assignments) {
    if (!knownIds.has(row.taskId)) continue;
    if (!weekDates.has(row.scheduledDate)) continue;
    byTask.set(row.taskId, row);
  }

  const assignments = adjustWeekDraftForCapacity(
    Array.from(byTask.values()),
    weekDraftValidationContextFromSource(ctx),
    ctx.weekDates
  );

  return {
    summary: proposal.summary,
    assignments,
  };
}

function formatProtectedBlocks(ctx: WeekDraftContext): string {
  if (ctx.protectedBlocks.length === 0) return "(none)";
  return ctx.protectedBlocks
    .map((block) => {
      const time =
        block.startMin != null && block.endMin != null
          ? ` ${block.startMin}-${block.endMin}min`
          : " all-day";
      const label = block.label ? ` "${block.label}"` : "";
      return `  ${block.scheduledDate} | ${categoryLabel(block.category)}${label}${time} (${block.status})`;
    })
    .join("\n");
}

function formatCategoryLoad(ctx: WeekDraftContext): string {
  const rows = Object.values(ctx.categoryLoad.byCategory).filter((row) => row.weight > 0);
  if (rows.length === 0) return "(nothing scheduled yet)";
  return rows
    .map(
      (row) =>
        `  ${categoryLabel(row.category)}: weight ${row.weight} (${row.taskCount} tasks, ${row.protectedBlockCount} protected)`
    )
    .join("\n");
}

function formatBalanceGaps(ctx: WeekDraftContext): string {
  if (ctx.balanceGaps.length === 0) return "(balanced enough — no urgent gaps)";
  return ctx.balanceGaps.map((gap) => `  - ${gap.label}`).join("\n");
}

export async function generateWeekDraft(ctx: WeekDraftContext): Promise<WeekDraftProposal> {
  const weekRef = weekRefFromContext(ctx);
  const weekDates = new Set(
    ctx.weekDates.length > 0 ? ctx.weekDates : datesInIsoWeek(weekRef).map(toISODateString)
  );
  const fallback = templateFromContext(ctx);

  if (!isAnthropicConfigured()) {
    return fallback;
  }

  const config = getAnthropicConfig();
  if (!config.configured) {
    return fallback;
  }

  const inboxLines =
    ctx.inbox.length === 0
      ? "(empty)"
      : ctx.inbox
          .map(
            (t) =>
              `  id=${t.id} | ${t.title} | p${t.priority} | ${categoryLabel(t.category)}${t.categoryUnresolved ? " (unresolved)" : ""}${t.projectSlug ? ` #${t.projectSlug}` : ""}`
          )
          .join("\n");

  const scheduledLines =
    ctx.scheduledInWeek.length === 0
      ? "(none)"
      : ctx.scheduledInWeek
          .map(
            (t) => `  id=${t.id} | ${t.scheduledDate} | ${t.title} | ${categoryLabel(t.category)}`
          )
          .join("\n");

  const completions =
    ctx.lastWeekCompletions.length === 0
      ? "(none recorded)"
      : ctx.lastWeekCompletions.map((c) => `  - ${c.title}`).join("\n");

  const top3 =
    ctx.top3Incomplete.length === 0
      ? "(all slots clear or complete)"
      : ctx.top3Incomplete.map((t) => `  slot ${t.slot}: ${t.title}`).join("\n");

  const userPayload = [
    "Draft a weekly plan by assigning existing tasks to days this week.",
    'Respond with JSON only: {"summary":"...","assignments":[{"taskId":"...","scheduledDate":"YYYY-MM-DD","rationale":"..."}]}',
    "summary: 2-3 sentences on last week + intent for this week.",
    "assignments: only task IDs from inbox below; scheduledDate must be Mon–Sun this week.",
    "Do not invent tasks. Do not create new tasks.",
    "",
    "Protected blocks are spoken-for time — do not pile work onto days that are already heavy with protected blocks.",
    `Day load threshold (Top-3-weighted units): ${ctx.overCommitThreshold}. Protected blocks count fully toward load.`,
    "Gently balance life categories where you can — prefer assigning inbox tasks whose category fills a gap, without forcing.",
    "",
    `Week: ${ctx.weekStartIso} through ${ctx.weekEndIso}`,
    `Triage backlog count: ${ctx.triageCount}`,
    "",
    "Protected blocks this week:",
    formatProtectedBlocks(ctx),
    "",
    "Current category load (scheduled + protected):",
    formatCategoryLoad(ctx),
    "",
    "Category balance gaps to lean toward:",
    formatBalanceGaps(ctx),
    "",
    "Inbox (unscheduled):",
    inboxLines,
    "",
    "Already scheduled this week:",
    scheduledLines,
    "",
    "Last week completions:",
    completions,
    "",
    "Top 3 still open:",
    top3,
  ].join("\n");

  try {
    const anthropic = requireAnthropicClient();
    const response = await anthropic.messages.create({
      model: config.model,
      max_tokens: 1024,
      system: buildSystemPrompt("weekDraft"),
      messages: [{ role: "user", content: userPayload }],
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    const parsed = parseWeekDraftResponse(text);
    if (!parsed) return fallback;

    return sanitizeProposal(parsed, ctx, weekDates);
  } catch {
    return fallback;
  }
}
