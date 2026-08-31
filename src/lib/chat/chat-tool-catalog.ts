import type { JSONSchema7 } from "json-schema";

import type { PlanningChatSurface } from "@/lib/chat/planning-surface";
import { PROJECT_CATEGORIES } from "@/lib/projects/categories";
import type { KashRegister } from "@/server/claude/system-prompts";

/**
 * A chat tool definition: name + description + a JSON Schema for the tool input. This is the
 * provider-neutral shape the model layer consumes — `generate.ts` wraps each `input_schema`
 * with the AI SDK's `jsonSchema()` when building the live tool set.
 */
export type ChatToolDef = {
  name: string;
  description: string;
  input_schema: JSONSchema7;
};

const QUERY_TASKS_TOOL: ChatToolDef = {
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

const QUERY_STATE_TOOL: ChatToolDef = {
  name: "query_state",
  description: "Read planner state.",
  input_schema: { type: "object", properties: {}, additionalProperties: false },
};

const QUERY_PROJECTS_TOOL: ChatToolDef = {
  name: "query_projects",
  description: "List projects.",
  input_schema: {
    type: "object",
    properties: { slugContains: { type: "string" } },
    additionalProperties: false,
  },
};

const QUERY_ABYSS_TOOL: ChatToolDef = {
  name: "query_abyss",
  description: "Search Backlog items.",
  input_schema: {
    type: "object",
    properties: { query: { type: "string" }, limit: { type: "number" } },
    additionalProperties: false,
  },
};

const DRAFT_WEEK_TOOL: ChatToolDef = {
  name: "draft_week",
  description: "Draft weekly plan.",
  input_schema: { type: "object", properties: {}, additionalProperties: false },
};

const DRAFT_EOD_TOOL: ChatToolDef = {
  name: "draft_eod",
  description: "Draft EoD review.",
  input_schema: { type: "object", properties: {}, additionalProperties: false },
};

const DRAFT_BALANCE_PASS_TOOL: ChatToolDef = {
  name: "draft_balance_pass",
  description: "Draft balance pass.",
  input_schema: { type: "object", properties: {}, additionalProperties: false },
};

const RESCHEDULE_TASKS_TOOL: ChatToolDef = {
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

const CREATE_TASK_ITEM_SCHEMA: JSONSchema7 = {
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
    tempId: {
      type: "string",
      description:
        'Optional local id for this row within the proposal (e.g. "lease"). Use with blocksTempIds to express dependencies.',
    },
    blocksTempIds: {
      type: "array",
      items: { type: "string" },
      description:
        'tempIds of other tasks in this same proposal that THIS task blocks (blocker finishes first). Example: email blocks packing → email.blocksTempIds=["packing"] is wrong; packing waits on email → email.blocksTempIds=["packing"].',
    },
  },
  required: ["title"],
  additionalProperties: false,
};

const CREATE_TASK_TOOL: ChatToolDef = {
  name: "create_task",
  description:
    "Propose create task(s) for a confirm card the user must Accept before anything is created. Never claim tasks were staged, created, or added until they accept. Optional tempId + blocksTempIds link dependencies within the same proposal (A.blocksTempIds includes B's tempId means A blocks B).",
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

const EDIT_TASK_TOOL: ChatToolDef = {
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

const DELETE_TASK_TOOL: ChatToolDef = {
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

const COMPLETE_TASK_TOOL: ChatToolDef = {
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

const SET_TOP3_TOOL: ChatToolDef = {
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

const SET_PROTECTED_BLOCK_TOOL: ChatToolDef = {
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

const SET_DAY_PRIORITIES_TOOL: ChatToolDef = {
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

const APPLY_BALANCE_SUGGESTIONS_TOOL: ChatToolDef = {
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

const CREATE_PROJECT_TOOL: ChatToolDef = {
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

const CREATE_PHASE_TOOL: ChatToolDef = {
  name: "create_phase",
  description:
    "Propose create phase or nested subphase (unlimited depth) for a confirm card the user must Accept before anything is created. Pass projectSlug without #, name, and optional parentPhaseId (UUID from context) or parentPhaseName. Never claim phases were created until they accept.",
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

const EDIT_PHASE_TOOL: ChatToolDef = {
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

const DELETE_PHASE_TOOL: ChatToolDef = {
  name: "delete_phase",
  description:
    "Propose delete phase(s). Cascades to nested child phases; tasks in those phases become unphased. Destructive — confirm card applies.",
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

const MOVE_TASK_TO_PHASE_TOOL: ChatToolDef = {
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

const REPLAN_PROJECT_DATES_TOOL: ChatToolDef = {
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

const PARK_IN_ABYSS_TOOL: ChatToolDef = {
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

const TOOL_BY_NAME: Record<string, ChatToolDef> = {
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
  create_phase: CREATE_PHASE_TOOL,
  edit_phase: EDIT_PHASE_TOOL,
  delete_phase: DELETE_PHASE_TOOL,
  move_task_to_phase: MOVE_TASK_TO_PHASE_TOOL,
  replan_project_dates: REPLAN_PROJECT_DATES_TOOL,
  park_in_abyss: PARK_IN_ABYSS_TOOL,
};

/** Phase structure tools — available on every planning surface. */
const PHASE_STRUCTURE_TOOLS = ["create_phase", "edit_phase", "delete_phase"] as const;

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
    ...PHASE_STRUCTURE_TOOLS,
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
    ...PHASE_STRUCTURE_TOOLS,
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
    ...PHASE_STRUCTURE_TOOLS,
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
    ...PHASE_STRUCTURE_TOOLS,
    "move_task_to_phase",
    "replan_project_dates",
  ],
  "loose-tasks": [
    "query_tasks",
    "create_task",
    "edit_task",
    "delete_task",
    "complete_task",
    ...PHASE_STRUCTURE_TOOLS,
  ],
  backlog: ["query_abyss", "park_in_abyss", "query_tasks", "create_task", ...PHASE_STRUCTURE_TOOLS],
  reviews: [
    "query_tasks",
    "query_state",
    "query_abyss",
    "draft_eod",
    "draft_balance_pass",
    "complete_task",
    "apply_balance_suggestions",
    ...PHASE_STRUCTURE_TOOLS,
  ],
  care: ["query_tasks", "query_state", "draft_eod", "complete_task", ...PHASE_STRUCTURE_TOOLS],
  "morning-handoff": ["query_tasks", "query_state", "create_task", ...PHASE_STRUCTURE_TOOLS],
};

export const PLANNING_CHAT_TOOLS: ChatToolDef[] = [
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
  CREATE_PHASE_TOOL,
  EDIT_PHASE_TOOL,
  DELETE_PHASE_TOOL,
  MOVE_TASK_TO_PHASE_TOOL,
  REPLAN_PROJECT_DATES_TOOL,
  PARK_IN_ABYSS_TOOL,
];

export const FOCUS_CHAT_TOOLS: ChatToolDef[] = [
  QUERY_TASKS_TOOL,
  COMPLETE_TASK_TOOL,
  PARK_IN_ABYSS_TOOL,
];

export const REFLECTION_CHAT_TOOLS: ChatToolDef[] = [
  QUERY_TASKS_TOOL,
  QUERY_STATE_TOOL,
  QUERY_ABYSS_TOOL,
  DRAFT_EOD_TOOL,
  DRAFT_BALANCE_PASS_TOOL,
  RESCHEDULE_TASKS_TOOL,
  COMPLETE_TASK_TOOL,
  APPLY_BALANCE_SUGGESTIONS_TOOL,
];

function pickTools(names: readonly string[]): ChatToolDef[] {
  return names.map((name) => TOOL_BY_NAME[name]).filter((t): t is ChatToolDef => t != null);
}

export function toolsForRegister(register: KashRegister): ChatToolDef[] {
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
): ChatToolDef[] {
  if (register === "focus") return FOCUS_CHAT_TOOLS;
  if (register === "reflection") return REFLECTION_CHAT_TOOLS;
  if (!surface) return PLANNING_CHAT_TOOLS;
  return pickTools(SURFACE_TOOL_NAMES[surface]);
}
