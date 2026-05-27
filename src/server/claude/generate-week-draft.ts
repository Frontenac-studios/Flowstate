import "server-only";

import { datesInIsoWeek, toISODateString } from "@/lib/dates/local-day";
import { getAnthropicConfig, isAnthropicConfigured } from "@/lib/env";
import { templateWeekDraft, type WeekDraftProposal } from "@/lib/week/template-week-draft";

import { requireAnthropicClient } from "./client";
import type { WeekDraftContext } from "./fetch-week-draft-context";
import { buildSystemPrompt } from "./system-prompts";

export type { WeekDraftProposal };

function templateFromContext(ctx: WeekDraftContext): WeekDraftProposal {
  return templateWeekDraft(
    ctx.inbox.map((t) => ({ id: t.id, title: t.title, priority: t.priority }))
  );
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

  return {
    summary: proposal.summary,
    assignments: Array.from(byTask.values()),
  };
}

export async function generateWeekDraft(
  ctx: WeekDraftContext,
  now: Date = new Date()
): Promise<WeekDraftProposal> {
  const weekDates = new Set(datesInIsoWeek(now).map(toISODateString));
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
              `  id=${t.id} | ${t.title} | p${t.priority}${t.projectSlug ? ` #${t.projectSlug}` : ""}`
          )
          .join("\n");

  const scheduledLines =
    ctx.scheduledInWeek.length === 0
      ? "(none)"
      : ctx.scheduledInWeek.map((t) => `  id=${t.id} | ${t.scheduledDate} | ${t.title}`).join("\n");

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
    `Week: ${ctx.weekStartIso} through ${ctx.weekEndIso}`,
    `Triage backlog count: ${ctx.triageCount}`,
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
