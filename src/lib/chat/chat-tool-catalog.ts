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

const CREATE_TASK_ITEM_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "Task title (required)." },
    scheduledDate: {
      type: "string",
      description:
        "Optional suggested day (YYYY-MM-DD). Task lands in inbox unscheduled; this becomes suggestedScheduledDate.",
    },
    projectSlug: { type: "string", description: "Optional #project slug." },
    phaseId: {
      type: "string",
      description: "Optional phase UUID. Use null for project loose bucket when project is set.",
    },
    phaseName: {
      type: "string",
      description: "Optional phase name (resolved within project when phaseId omitted).",
    },
    category: { type: "string", enum: [...PROJECT_CATEGORIES] },
    tags: { type: "array", items: { type: "string" } },
    timeEstimateMinutes: { type: "number", description: "Optional time estimate in minutes." },
    priority: { type: "number", description: "0–3 priority slot." },
  },
  required: ["title"],
  additionalProperties: false,
} as const;

const CREATE_TASK_TOOL: Anthropic.Tool = {
  name: "create_task",
  description:
    "Propose create task. Tasks land in the inbox (unscheduled) with optional suggested day.",
  input_schema: {
    type: "object",
    properties: {
      tasks: { type: "array", items: CREATE_TASK_ITEM_SCHEMA },
      summary: { type: "string" },
    },
    required: ["tasks"],
    additionalProperties: false,
  },
};

const EDIT_TASK_TOOL: Anthropic.Tool = {
  name: "edit_task",
  description: "Propose edit task fields.",
  input_schema: {
    type: "object",
    properties: {
      edits: { type: "array", items: { type: "object" } },
      summary: { type: "string" },
    },
    required: ["edits"],
    additionalProperties: false,
  },
};

const DELETE_TASK_TOOL: Anthropic.Tool = {
  name: "delete_task",
  description: "Propose delete tasks.",
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

const SET_TOP3_TOOL: Anthropic.Tool = {
  name: "set_top3",
  description: "Propose Top 3 slot assignments.",
  input_schema: {
    type: "object",
    properties: {
      slots: { type: "array", items: { type: "object" } },
      summary: { type: "string" },
    },
    required: ["slots"],
    additionalProperties: false,
  },
};

const SET_PROTECTED_BLOCK_TOOL: Anthropic.Tool = {
  name: "set_protected_block",
  description: "Propose protected time blocks.",
  input_schema: {
    type: "object",
    properties: {
      blocks: { type: "array", items: { type: "object" } },
      summary: { type: "string" },
    },
    required: ["blocks"],
    additionalProperties: false,
  },
};

const SET_DAY_PRIORITIES_TOOL: Anthropic.Tool = {
  name: "set_day_priorities",
  description: "Propose day priority pins for the week.",
  input_schema: {
    type: "object",
    properties: {
      priorities: { type: "array", items: { type: "object" } },
      summary: { type: "string" },
    },
    required: ["priorities"],
    additionalProperties: false,
  },
};

const APPLY_BALANCE_SUGGESTIONS_TOOL: Anthropic.Tool = {
  name: "apply_balance_suggestions",
  description: "Propose balance-pass task additions.",
  input_schema: {
    type: "object",
    properties: {
      suggestions: { type: "array", items: { type: "object" } },
      summary: { type: "string" },
    },
    required: ["suggestions"],
    additionalProperties: false,
  },
};

const CREATE_PROJECT_TOOL: Anthropic.Tool = {
  name: "create_project",
  description: "Propose create project.",
  input_schema: {
    type: "object",
    properties: {
      projects: { type: "array", items: { type: "object" } },
      summary: { type: "string" },
    },
    required: ["projects"],
    additionalProperties: false,
  },
};

const EDIT_PHASE_TOOL: Anthropic.Tool = {
  name: "edit_phase",
  description: "Propose edit phase metadata or dates.",
  input_schema: {
    type: "object",
    properties: {
      phases: { type: "array", items: { type: "object" } },
      summary: { type: "string" },
    },
    required: ["phases"],
    additionalProperties: false,
  },
};

const MOVE_TASK_TO_PHASE_TOOL: Anthropic.Tool = {
  name: "move_task_to_phase",
  description: "Propose move tasks between phases.",
  input_schema: {
    type: "object",
    properties: {
      moves: { type: "array", items: { type: "object" } },
      summary: { type: "string" },
    },
    required: ["moves"],
    additionalProperties: false,
  },
};

const REPLAN_PROJECT_DATES_TOOL: Anthropic.Tool = {
  name: "replan_project_dates",
  description: "Propose updated phase date ranges from slip/time data.",
  input_schema: {
    type: "object",
    properties: {
      projectSlug: { type: "string" },
      phases: { type: "array", items: { type: "object" } },
      summary: { type: "string" },
    },
    required: ["phases"],
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
  edit_task: EDIT_TASK_TOOL,
  delete_task: DELETE_TASK_TOOL,
  complete_task: COMPLETE_TASK_TOOL,
  set_top3: SET_TOP3_TOOL,
  set_protected_block: SET_PROTECTED_BLOCK_TOOL,
  set_day_priorities: SET_DAY_PRIORITIES_TOOL,
  apply_balance_suggestions: APPLY_BALANCE_SUGGESTIONS_TOOL,
  create_project: CREATE_PROJECT_TOOL,
  edit_phase: EDIT_PHASE_TOOL,
  move_task_to_phase: MOVE_TASK_TO_PHASE_TOOL,
  replan_project_dates: REPLAN_PROJECT_DATES_TOOL,
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
    "edit_task",
    "delete_task",
    "complete_task",
    "set_top3",
    "park_in_abyss",
  ],
  week: [
    "query_tasks",
    "query_state",
    "draft_week",
    "reschedule_tasks",
    "create_task",
    "edit_task",
    "delete_task",
    "complete_task",
    "set_top3",
    "set_protected_block",
    "set_day_priorities",
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
    "edit_task",
    "delete_task",
    "apply_balance_suggestions",
    "propose_about_me_edit",
  ],
  projects: [
    "query_tasks",
    "query_projects",
    "create_project",
    "create_task",
    "edit_task",
    "delete_task",
    "reschedule_tasks",
    "complete_task",
    "edit_phase",
    "move_task_to_phase",
    "replan_project_dates",
  ],
  "loose-tasks": ["query_tasks", "create_task", "edit_task", "delete_task", "complete_task"],
  backlog: ["query_abyss", "park_in_abyss", "query_tasks", "create_task"],
  reviews: [
    "query_tasks",
    "query_state",
    "query_abyss",
    "draft_eod",
    "draft_balance_pass",
    "complete_task",
    "apply_balance_suggestions",
    "propose_about_me_edit",
  ],
  care: ["query_tasks", "query_state", "draft_eod", "complete_task", "propose_about_me_edit"],
  "morning-handoff": ["query_tasks", "query_state", "create_task"],
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
  EDIT_TASK_TOOL,
  DELETE_TASK_TOOL,
  COMPLETE_TASK_TOOL,
  SET_TOP3_TOOL,
  SET_PROTECTED_BLOCK_TOOL,
  SET_DAY_PRIORITIES_TOOL,
  APPLY_BALANCE_SUGGESTIONS_TOOL,
  CREATE_PROJECT_TOOL,
  EDIT_PHASE_TOOL,
  MOVE_TASK_TO_PHASE_TOOL,
  REPLAN_PROJECT_DATES_TOOL,
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
  APPLY_BALANCE_SUGGESTIONS_TOOL,
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
