# Chat-first task creation — build plan

> Locked Jul 8, 2026. Makes chat the primary capture path across surfaces, with typing as fallback. Addresses inbox model, capture context, category/phase placement, and confirm-card parity.

## Definition of done

Chat-first is complete when:

1. **Every capture surface** defaults to chat (+ popover), with manual typing as quiet fallback
2. **Context travels with +** — Kash knows surface, project, phase, and category intent
3. **One inbox contract** — new tasks land unscheduled with optional suggested day, consistently
4. **Full placement on create** — category, project, and phase/subphase when context warrants it
5. **Confirm card matches reality** — user can see and edit placement before applying
6. **Tight feedback loop** — confirm → task appears in inbox (or project column) with visual feedback

## Current state (Jul 2026)

| Layer               | Built                                                  | Gap                                                                                                 |
| ------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| + popover           | Week, Today, Projects (`AddTaskPopover`)               | Opens chat with no capture intent — bare `openRail()`                                               |
| Inbox model         | `suggestedScheduledDate`, Accept chip, Week inbox      | Today manual path schedules to today; manual Week path doesn't always set `bucketOverride: "later"` |
| `create_task` tool  | Inbox landing, optional `#projectSlug`, suggested date | No `category`, `phaseId`/`phaseName`, tags, estimate; tool item schema underspecified               |
| Confirm card        | Editable title, date, project, priority                | No category or phase picker; no category preview stripe                                             |
| Category resolution | AI ladder at apply time                                | Hidden at confirm; chat can't set category explicitly on create                                     |
| Phase placement     | `move_task_to_phase` on Projects surface               | Not on create — two-step for structured projects                                                    |
| Chat context        | Today/Week buckets, Top 3, `#slug`                     | No category balance, loose-task counts, phase trees, selected project/phase                         |
| Surface tools       | Per-surface subsets in `chat-tool-catalog.ts`          | Projects chat lacks selected project/phase in context                                               |

**Spine that works:** propose → confirm card → apply → inbox (`apply-proposed-action`, `ConfirmActionCard`, `WeekInbox`).

## Product decisions

### Locked

- **Conservative autonomy:** writes go through confirm card; no auto-apply on Planning register
- **Inbox-first for Week/Plan:** chat-created tasks are unscheduled (`scheduledDate: null`, `bucketOverride: "later"`) with optional `suggestedScheduledDate`
- **Today capture (Option B):** chat from Today → inbox (unscheduled + optional suggested date); manual Today composer → today bucket (scheduled today). `defaultBucket: "today"` on capture context guides chat proposals; apply still lands inbox until Phase 3 wires precedence.
- **Category and project are orthogonal:** loose Adulting tasks are `projectId: null`, `phaseId: null`; category from explicit → project → AI → lastUsed → unresolved fallback
- **Phases are project-scoped only:** subphases never exist at category level; placement is `project → phase → subphase → task`

## Architecture: CaptureContext

Session-scoped client state passed when user clicks "Ask chat" from +:

```ts
type CaptureContext = {
  surface: PlanningChatSurface;
  projectId?: string;
  projectSlug?: string;
  phaseId?: string | null; // null = project loose bucket
  phaseName?: string;
  category?: ProjectCategory;
  defaultBucket?: "inbox" | "today";
  openedAt: string; // ISO
};
```

**Precedence at apply time:** inline confirm edits > proposal fields > capture context defaults > resolver ladder.

## Phases

### Phase 1 — Capture intent (UI → chat bridge) ← START HERE

**Goal:** + button passes where the user is; Kash receives it each turn.

**Tasks:**

- [ ] Add `CaptureContext` type in `src/lib/chat/capture-context.ts` (Zod schema for API)
- [ ] Extend `ChatProvider`: `openRail({ captureContext? })`, store in React state (session-scoped)
- [ ] Update all `AddTaskPopover` callers to pass context:
  - `WeekCanvas` — surface `week`, defaultBucket `inbox`
  - `DayPlanCanvas` — surface `today`, defaultBucket TBD
  - `MillerColumnsView` — surface `projects`, projectId/slug, phaseId/phaseName from selected column
- [ ] Pass `captureContext` on `/api/claude/stream` body (alongside `planningSurface`)
- [ ] Inject capture block in `assembleChatContext` or stream route context assembly
- [ ] Add prompt modifier in `system-prompts.ts` when capture context present
- [ ] Optional: chat composer placeholder when opened from + (e.g. "Add tasks for Demolition…")
- [ ] Tests: Zod schema, context serialization, prompt includes capture block

**Acceptance criteria:**

- Open + from Projects/Demolition → stream request includes project slug + phase name
- Open + from Week → context says inbox default, no project
- Kash system prompt mentions capture source on that turn
- No behavior change to task creation yet (context only)

**Key files:** `ChatProvider.tsx`, `AddTaskPopover.tsx`, `WeekCanvas.tsx`, `DayPlanCanvas.tsx`, `MillerColumnsView.tsx`, `useChatPanel.ts`, `app/api/claude/stream/route.ts`, `assemble-chat-context.ts`, `system-prompts.ts`

---

### Phase 2 — Unify inbox contract (manual = chat)

**Goal:** Manual typing follows same rules as chat create.

**Tasks:**

- [ ] Lock Today policy (inbox vs today bucket)
- [ ] `QuickInput` + `createInInbox`: always `bucketOverride: "later"` when inbox mode
- [ ] Add `suggestedScheduledDate` to `tasks.create` tRPC when parser extracts a date in inbox mode
- [ ] `DayPlanCanvas`: align with chosen Today policy

**Acceptance criteria:**

- Week manual create matches chat: null schedule, later bucket, optional suggested date + Accept chip

---

### Phase 3 — Richer `create_task` schema

**Goal:** Create with category, phase, tags, estimate; apply uses capture context defaults.

**Tasks:**

- [ ] Extend `createTaskProposalItemSchema` (category, phaseId, phaseName, tags, timeEstimateMinutes)
- [ ] Document fields in `chat-tool-catalog.ts` CREATE_TASK_TOOL input_schema
- [ ] Apply logic: merge capture context → resolve phase by name → set projectId from phase
- [ ] Category: explicit > project > capture context > existing resolver
- [ ] Update `buildCreateTaskProposal` in `chat-tools.ts`
- [ ] Unit tests for apply precedence and phase name resolution

---

### Phase 4 — Confirm card parity

**Goal:** User edits category and phase before confirming.

**Tasks:**

- [ ] Category dropdown + `ComposerCategoryAccent` preview in `CreateTaskDraftEditor`
- [ ] Phase dropdown when project set (project loose + flattened phase list)
- [ ] Placement summary line (e.g. "Adulting · no project · inbox")
- [ ] Extend `CreateTaskItemEdit` + `mergeCreateTaskEdits`
- [ ] Optional: "Apply & schedule" (commits suggested date in one step)

---

### Phase 5 — Context the model can use

**Goal:** Kash sees category balance, loose tasks, project phase trees.

**Tasks:**

- [ ] Category on task lines in `fetch-plan-context.ts`
- [ ] Loose task counts by category in context block
- [ ] Project structure block when on `/projects/[slug]` (phases + counts + selected phase)
- [ ] Optional: `query_project_structure`, `query_loose_tasks` read tools

---

### Phase 6 — Post-create feedback loop

**Goal:** After confirm, user sees where tasks landed.

**Tasks:**

- [ ] Scroll/highlight new tasks in Week inbox or Miller column
- [ ] Chat ack message with placement summary
- [ ] Auto-expand Week inbox when collapsed and new tasks arrive

---

### Phase 7 — Surface-specific capture UX

**Tasks:**

- [ ] Today: implement chosen inbox policy
- [ ] Projects: chat defaults match `NewItemRow` phase targeting
- [ ] Backlog: add `create_task` or route to `park_in_abyss` with clear copy
- [ ] Projects index loose-tasks row: optional capture with `category` preset

---

### Phase 8 — QA matrix

| Scenario                               | Expected                                    |
| -------------------------------------- | ------------------------------------------- |
| Week + "pay water bill Thursday"       | Inbox, adulting, suggested Thu, Accept chip |
| Projects/Demolition + "order dumpster" | project + phase, per policy                 |
| Category lens + capture                | explicit category, no project               |
| Confirm card category edit             | stored, `categoryUnresolved: false`         |
| Manual `createInInbox` + `; tomorrow`  | suggested date, same as chat                |

## Dependency graph

```
Phase 1 (capture context) ──┬──► Phase 3 (rich create_task) ──► Phase 4 (confirm card)
                            │                              └──► Phase 6 (feedback loop)
                            └──► Phase 5 (model context) ──────► Phase 3

Phase 2 (inbox parity) ──► Phase 8 (QA)
Phase 7 (surface UX) ────► Phase 8 (QA)
```

## Deferred

- Recurrence / dependencies on chat create (use `edit_task` later)
- Auto-schedule without confirm (conflicts with autonomy spec)
- Category-level virtual projects
- Teaching chat the `;;;` project composer syntax (use capture context + phase name instead)

## Rough sizing

| Phase              | Effort    |
| ------------------ | --------- |
| 1 Capture context  | 1–2 days  |
| 2 Inbox parity     | 0.5 day   |
| 3 Rich create_task | 1–2 days  |
| 4 Confirm card     | 1 day     |
| 5 Model context    | 1–2 days  |
| 6 Post-create loop | 0.5–1 day |
| 7 Surface UX       | 1 day     |
| 8 QA               | 1 day     |

**Total:** ~1–1.5 weeks focused work.
