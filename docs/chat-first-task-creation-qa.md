# Chat-first task creation — manual QA checklist

> Phase 8 companion to `chat-first-task-creation-plan.md`. Automated coverage lives in the Vitest suite (see "Automated coverage" below); this file is the human smoke test before shipping. Run against a seeded account with at least one structured project (e.g. a "Kitchen Reno" with a "Demolition" phase) and a few loose Adulting tasks.

## Matrix walkthrough

### Row 1 — Week capture with a day

- [ ] On `/this-week`, click **+** → "Ask chat".
- [ ] Send: `pay water bill Thursday`.
- [ ] Confirm card shows category **Adulting** (or an AI-resolved category) and placement summary `Adulting · no project · inbox`.
- [ ] Apply. Task appears in the **Week inbox** (not on Today, not on a weekday).
- [ ] Inbox row shows an **Accept** chip for Thursday. Clicking it moves the task onto Thursday.

### Row 2 — Projects/Demolition capture

- [ ] Open `/projects/<slug>`, select the **Demolition** phase column.
- [ ] Click **+** → "Ask chat". Send: `order dumpster`.
- [ ] Confirm card placement shows the project + **Demolition** phase.
- [ ] Apply. Task is visible in the **Demolition** Miller column (per Phase 7 policy) after confirm.

### Row 3 — Category lens / loose row capture

- [ ] From the Projects index loose-tasks row (or a category lens), click **+ Ask chat**.
- [ ] Send a task. Confirm card shows the **explicit category**, **no project**, **no phase**.
- [ ] Apply. Task lands in the inbox under that category with `projectId`/`phaseId` null.

### Row 4 — Confirm card category edit

- [ ] Trigger any `create_task` proposal.
- [ ] In the confirm card, change the **category** dropdown before applying.
- [ ] Apply. The stored task uses the chosen category and is **not** flagged unresolved (no "needs category" affordance).

### Row 5 — Manual Week create parity

- [ ] On `/this-week`, use the manual inbox composer (`createInInbox`).
- [ ] Type: `pay water bill; tomorrow`.
- [ ] Task lands unscheduled in the inbox (`bucketOverride: later`), with tomorrow as a **suggested date** and an **Accept** chip — identical to the chat path.

### Row 6 — Today chat vs Today manual

- [ ] On `/today`, click **+** → "Ask chat" and create a task → it lands in the **inbox** (unscheduled).
- [ ] On `/today`, type directly in the QuickInput composer → it lands **scheduled for today** (Option B).

### Row 7 — Backlog capture

- [ ] On `/abyss`, "park" intent (e.g. `save this idea for someday`) → item goes to the **abyss**.
- [ ] On `/abyss`, "Ask chat" a clearly actionable task → proposal creates an **inbox** task (per Phase 7 decision).

### Row 8 — Post-create feedback

- [ ] After confirming any create, the new task is **highlighted / scrolled into view** in the Week inbox or Miller column.
- [ ] The chat acknowledgement shows a **placement summary** line (e.g. `Added \`pay water bill\` · Adulting · no project · inbox`).

## Regressions

- [ ] **Dismiss confirm card** → no tasks are created (inbox unchanged).
- [ ] **Undo after create** (session undo) removes the created task(s).
- [ ] **Desktop sync**: a chat/manual inbox create with a `suggestedScheduledDate` syncs to the desktop mirror; **Accept** and **drag-to-weekday** (`scheduleToDate`) both propagate the cleared suggestion + new schedule to desktop.

## Automated coverage

Run `npm run test:run`. Matrix rows are covered by:

- `src/lib/chat/resolve-create-task-placement.test.ts` — placement precedence (edit > proposal > capture context > resolver) + rows 1–4.
- `src/lib/chat/build-create-task-proposal.test.ts` — `create_task` field mapping (category, phase, suggested date, capture-context fallback).
- `src/lib/chat/proposed-actions.test.ts` — confirm-card `mergeCreateTaskEdits` (category/phase overlay, row 4).
- `src/lib/tasks/inbox-create.test.ts` + `src/trpc/routers/tasks-suggested-date.test.ts` — manual inbox parity + Accept/schedule (rows 1 follow-up, 5).
- `src/lib/chat/format-plan-context.test.ts` — context markers (category, inbox, suggested — row 1 context side).
- `src/lib/chat/capture-context.test.ts` — capture context per surface (rows 2, 3, 7).
- `src/lib/chat/chat-task-created-events.test.ts` — post-create feedback event (row 8).
- `src/server/claude/system-prompts.test.ts` — surface + capture prompt modifiers.
