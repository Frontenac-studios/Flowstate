import type Anthropic from "@anthropic-ai/sdk";

import type { PlanningChatSurface } from "@/lib/chat/planning-surface";
import { PROJECT_CATEGORIES } from "@/lib/projects/categories";
import type { KashRegister } from "@/server/claude/system-prompts";

const QUERY_TASKS_TOOL: Anthropic.Tool = {
  name: "query_tasks",
  description: "Find incomplete tasks.",
  input_schema: {
    type: "object",
    properties: {
      projectSlug: { type: "string" },
      titleContains: { type: "string" },
      scheduledFrom: { type: "string" },
      scheduledTo: { type: "string" },
      limit: { type: "number" },
    },
    additionalProperties: false,
  },
};

const QUERY_STATE_TOOL: Anthropic.Tool = {
  name: "query_state",
  description: "Read planner state.",
  input_schema: { type: "object", properties: {}, additionalProperties: false },
};

const QUERY_PROJECTS_TOOL: Anthropic.Tool = {
  name: "query_projects",
  description: "List projects.",
  input_schema: {
    type: "object",
    properties: { slugContains: { type: "string" } },
    additionalProperties: false,
  },
};

const QUERY_ABYSS_TOOL: Anthropic.Tool = {
  name: "query_abyss",
  description: "Search Backlog items.",
  input_schema: {
    type: "object",
    properties: { query: { type: "string" }, limit: { type: "number" } },
    additionalProperties: false,
  },
};

const DRAFT_WEEK_TOOL: Anthropic.Tool = {
  name: "draft_week",
  description: "Draft weekly plan.",
  input_schema: { type: "object", properties: {}, additionalProperties: false },
};

const DRAFT_EOD_TOOL: Anthropic.Tool = {
  name: "draft_eod",
  description: "Draft EoD review.",
  input_schema: { type: "object", properties: {}, additionalProperties: false },
};

const DRAFT_BALANCE_PASS_TOOL: Anthropic.Tool = {
  name: "draft_balance_pass",
  description: "Draft balance pass.",
  input_schema: { type: "object", properties: {}, additionalProperties: false },
};

const RESCHEDULE_TASKS_TOOL: Anthropic.Tool = {
  name: "reschedule_tasks",
  description: "Propose reschedule.",
  input_schema: {
    type: "object",
    properties: {
      assignments: { type: "array", items: { type: "object" } },
      summary: { type: "string" },
    },
    required: ["assignments"],
    additionalProperties: false,
  },
};

const CREATE_TASK_TOOL: Anthropic.Tool = {
  name: "create_task",
  description: "Propose create task.",
  input_schema: {
    type: "object",
    properties: {
      tasks: { type: "array", items: { type: "object" } },
      summary: { type: "string" },
    },
    required: ["tasks"],
    additionalProperties: false,
  },
};

const COMPLETE_TASK_TOOL: Anthropic.Tool = {
  name: "complete_task",
  description: "Propose complete task.",
  input_schema: {
    type: "object",
    properties: {
      taskIds: { type: "array", items: { type: "string" } },
      summary: { type: "string" },
    },
    required: ["taskIds"],
    additionalProperties: false,
  },
};

const PROPOSE_ABOUT_ME_EDIT_TOOL: Anthropic.Tool = {
  name: "propose_about_me_edit",
  description: "Propose About me edits.",
  input_schema: {
    type: "object",
    properties: { proposals: { type: "array", items: { type: "object" } } },
    required: ["proposals"],
    additionalProperties: false,
  },
};

const PARK_IN_ABYSS_TOOL: Anthropic.Tool = {
  name: "park_in_abyss",
  description: "Park in Backlog.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string" },
      type: { type: "string", enum: ["idea", "task"] },
      category: { type: "string", enum: [...PROJECT_CATEGORIES] },
      note: { type: "string" },
    },
    required: ["title"],
    additionalProperties: false,
  },
};

const TOOL_BY_NAME: Record<string, Anthropic.Tool> = {
  query_tasks: QUERY_TASKS_TOOL,
  query_state: QUERY_STATE_TOOL,
  query_projects: QUERY_PROJECTS_TOOL,
  query_abyss: QUERY_ABYSS_TOOL,
  draft_week: DRAFT_WEEK_TOOL,
  draft_eod: DRAFT_EOD_TOOL,
  draft_balance_pass: DRAFT_BALANCE_PASS_TOOL,
  reschedule_tasks: RESCHEDULE_TASKS_TOOL,
  create_task: CREATE_TASK_TOOL,
  complete_task: COMPLETE_TASK_TOOL,
  propose_about_me_edit: PROPOSE_ABOUT_ME_EDIT_TOOL,
  park_in_abyss: PARK_IN_ABYSS_TOOL,
};

/** Per-surface tool subsets (§6B). Writes still flow through confirm cards. */
export const SURFACE_TOOL_NAMES: Record<PlanningChatSurface, readonly string[]> = {
  today: [
    "query_tasks",
    "query_state",
    "reschedule_tasks",
    "create_task",
    "complete_task",
    "park_in_abyss",
  ],
  week: [
    "query_tasks",
    "query_state",
    "draft_week",
    "reschedule_tasks",
    "create_task",
    "complete_task",
    "park_in_abyss",
  ],
  plan: [
    "query_tasks",
    "query_state",
    "query_projects",
    "draft_balance_pass",
    "draft_eod",
    "reschedule_tasks",
    "create_task",
    "propose_about_me_edit",
  ],
  projects: ["query_tasks", "query_projects", "create_task", "reschedule_tasks", "complete_task"],
  backlog: ["query_abyss", "park_in_abyss", "query_tasks"],
  reviews: [
    "query_tasks",
    "query_state",
    "query_abyss",
    "draft_eod",
    "draft_balance_pass",
    "complete_task",
    "propose_about_me_edit",
  ],
  care: ["query_tasks", "query_state", "draft_eod", "complete_task", "propose_about_me_edit"],
};

export const PLANNING_CHAT_TOOLS: Anthropic.Tool[] = [
  QUERY_TASKS_TOOL,
  QUERY_STATE_TOOL,
  QUERY_PROJECTS_TOOL,
  QUERY_ABYSS_TOOL,
  DRAFT_WEEK_TOOL,
  DRAFT_EOD_TOOL,
  DRAFT_BALANCE_PASS_TOOL,
  RESCHEDULE_TASKS_TOOL,
  CREATE_TASK_TOOL,
  COMPLETE_TASK_TOOL,
  PROPOSE_ABOUT_ME_EDIT_TOOL,
  PARK_IN_ABYSS_TOOL,
];

export const FOCUS_CHAT_TOOLS: Anthropic.Tool[] = [
  QUERY_TASKS_TOOL,
  COMPLETE_TASK_TOOL,
  PARK_IN_ABYSS_TOOL,
];

export const REFLECTION_CHAT_TOOLS: Anthropic.Tool[] = [
  QUERY_TASKS_TOOL,
  QUERY_STATE_TOOL,
  QUERY_ABYSS_TOOL,
  DRAFT_EOD_TOOL,
  DRAFT_BALANCE_PASS_TOOL,
  RESCHEDULE_TASKS_TOOL,
  COMPLETE_TASK_TOOL,
  PROPOSE_ABOUT_ME_EDIT_TOOL,
];

function pickTools(names: readonly string[]): Anthropic.Tool[] {
  return names.map((name) => TOOL_BY_NAME[name]).filter((t): t is Anthropic.Tool => t != null);
}

export function toolsForRegister(register: KashRegister): Anthropic.Tool[] {
  switch (register) {
    case "planning":
      return PLANNING_CHAT_TOOLS;
    case "focus":
      return FOCUS_CHAT_TOOLS;
    case "reflection":
      return REFLECTION_CHAT_TOOLS;
    default:
      return PLANNING_CHAT_TOOLS;
  }
}

export function toolsForSurface(
  register: KashRegister,
  surface: PlanningChatSurface | null | undefined
): Anthropic.Tool[] {
  if (register === "focus") return FOCUS_CHAT_TOOLS;
  if (register === "reflection") return REFLECTION_CHAT_TOOLS;
  if (!surface) return PLANNING_CHAT_TOOLS;
  return pickTools(SURFACE_TOOL_NAMES[surface]);
}
