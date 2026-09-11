# W18 — The MCP endpoint: plan in Claude, confirm in Claude, write to Flowstate

Status: **planned, not started.** Written 2026-09-06, rewritten 2026-09-08 after the
decisions in §1. Recon in §2 is against `origin/main` at 2026-09-08.

## 0. What this is for

Katharine plans in Claude — a scoping document, a call transcript, a brain dump — and
wants the result to land in Flowstate with its phases, dates, estimates and money
intact, without a copy-paste step.

Today that round trip goes through the `flowstate-tasks` skill, which produces
paste-ready composer lines. That works, and it keeps working. This removes the paste,
and adds the two things a paste cannot carry: **dates and estimates**.

The route is **Claude Desktop over remote MCP**, not the Claude API. That distinction
does most of the design work for us: Claude reads the document, so Flowstate needs no
file upload, no storage bucket, and no server-side parser. The document never touches
this app.

## 1. Decisions locked (2026-09-08)

1. **Draft in Claude, approve in Claude, then write.** Claude composes the full plan —
   phases, dates, estimates, money — and shows it in the conversation. Nothing reaches
   Flowstate until Katharine approves it there. **This replaces the 2026-09-06 design's
   "high-risk writes land as proposals in Flowstate."** The review surface is the Claude
   conversation, not a pending strip in the app.
2. **Existing projects are in scope**, not just new ones. A call transcript can add a
   phase or re-date a project that already exists.
3. **The ingest carries estimates and money** — phase `estimate_hours`, `billing_type`,
   fee and rate floor. This is the cheapest path to making W15's burn signal real: the
   numbers are already written in the document, and today 0 of 44 hosted phases carry an
   estimate.
4. **Reads ship first.** Tokens plus the five read tools, proving transport and auth
   against real data before any write exists.

### What §1.1 changes about the old plan

The 2026-09-06 draft called for a `proposals` table and a pending-review strip on Today
and the project page, and correctly called that "the majority of this build." Decision 1
removes it. Claude Desktop already prompts before every tool call, so the approval
primitive exists in the client and does not need rebuilding in the app.

What survives is much smaller: a **draft store**, described in §5. It exists so that what
gets written is byte-for-byte what was reviewed — not a re-send that Claude might quietly
alter between showing and applying.

## 2. Engineering ground-truth (verified 2026-09-08)

- `src/trpc/init.ts` exports `createCallerFactory`. The MCP route can build a context by
  hand and call existing procedures directly. **No business logic is reimplemented** —
  every ownership check and `syncXRow` call keeps working because it is the same code
  path the UI uses.
- **The write path is granular, not one call.** `phases.create` accepts only
  `{ projectId, parentPhaseId?, name }`. Dates come from `phases.update`
  (`startDate`/`endDate`, which validates `endDate >= startDate`), and hours from
  `phases.setEstimate`. So applying one phase is three calls. `apply_plan` orchestrates;
  it does not wrap a single procedure.
- **A real undo already exists.** `task_bulk_imports` has an `undo` procedure, an
  `undoneAt` column, and `listTasksForImport`. Every batch of tasks this endpoint writes
  is recorded as one import, so one click reverses a whole Claude-created plan.
- `project_fees` is the `financial`-class home for fee, rate floor and proposal amount
  (settled by W10f). Money does not become a column on `projects`.
- There is **no file upload anywhere in the app** except `XeroImport.tsx` (expenses CSV),
  and no Supabase Storage usage at all. Nothing here changes that.
- The AI layer runs on OpenRouter and is unrelated to this endpoint. **MCP calls cost no
  model tokens on Flowstate's side** — Claude Desktop is the model; this app is a tool
  server.

## 3. Shape

```
Claude Desktop  (reads the document; the file never leaves the client)
  │  1. draft_plan  → returns a structured plan + a diff for existing projects
  │                   Claude renders it; Katharine reads it and says yes
  │  2. apply_plan(draft_id)
  ▼
POST /api/mcp                        ← new route, thin
  │  verify bearer token → { userId, orgId, scopes }
  ▼
createCaller(ctx)                    ← the existing tRPC router
  ├─ projects.create / getById
  ├─ phases.create → phases.update (dates) → phases.setEstimate
  ├─ tasks, as ONE task_bulk_imports batch (undoable)
  └─ project_fees for billing type, fee, rate floor
```

The two-step is the whole safety model. `draft_plan` writes nothing. `apply_plan` writes
only what a stored draft says, and only when its id is passed back.

## 4. Auth

Unchanged from the 2026-09-06 spec, which still holds. A personal access token, not a
Supabase session and not OAuth 2.1: Claude Desktop cannot carry a Supabase cookie, and
OAuth is a great deal of surface for one user on one machine.

New table `mcp_tokens`, visibility class **personal**: `id`, `user_id`, `name`
("Claude Desktop, MacBook" — so revoking is legible), `token_hash` (SHA-256; the
plaintext is shown once at creation and never again), `token_prefix` (first 8 chars, so
the settings list can identify a token without storing it), `scopes` (`read`, `write`),
`last_used_at`, `expires_at`, `revoked_at`.

Format `fs_pat_` + 32 random bytes base64url — greppable in a leak scan, obvious in a
screenshot. Compare hashes in constant time. Never log the token, the prefix, or the
Authorization header. A revoked or expired token returns 401 with no detail about which.
Rate limit per token, not per IP.

Note the scope list lost `propose`; decision 1 removed the thing it guarded.

## 5. The draft store

New table `plan_drafts`, visibility class **org_shared** (it describes work and carries
no money of its own; the fee figures inside the payload are written through
`project_fees`, which stays `financial`):

| column                     | notes                                                                           |
| -------------------------- | ------------------------------------------------------------------------------- |
| `id`                       | uuid pk — this is what `apply_plan` takes                                       |
| `user_id`, `org_id`        | tenancy                                                                         |
| `project_id`               | null for a new project, set when amending an existing one                       |
| `payload`                  | jsonb: the exact plan that was shown, Zod-validated on write and again on apply |
| `summary`                  | one line, for the audit trail                                                   |
| `status`                   | `pending` \| `applied` \| `expired`                                             |
| `created_at`, `applied_at` |                                                                                 |
| `expires_at`               | default **+24 hours**                                                           |

Why it exists at all, given the review happens in Claude: without it, `apply_plan` would
have to accept the whole plan as an argument, and nothing would guarantee the payload
Claude sends is the payload Claude displayed. Storing the draft makes "approve what you
saw" literally true.

Why 24 hours rather than the 7 days the old proposals table used: a draft is not a to-do
item. It is the tail end of a conversation you are still having. A day-old draft should
be re-drafted against current data, not applied.

## 6. Tool surface

Deliberately small. The chat catalog's 23 tools were designed for a coach that could see
the screen; an MCP client cannot, so tools must be self-describing and return enough
context for Claude to reason without a second call. More tools make Claude worse at
choosing.

### Reads — `read` scope (ship first)

| tool            | wraps                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------- |
| `list_projects` | `projects.list` — state, client, next date, percent                                       |
| `get_project`   | `projects.getById` + `phases.listByProject` + `tasks.listByProject`, one call, whole tree |
| `list_clients`  | `clients.list`                                                                            |
| `list_tasks`    | `tasks.listIncomplete`, filterable by project and date range                              |
| `get_burn`      | `projects.burn` — estimate vs actual, per phase                                           |

Reads are not merely prudent to ship first — they are a **dependency**. To amend an
existing project, Claude must read its current tree before it can draft a diff.

### The ingest — `write` scope

| tool         | does                                                                                                                                                |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `draft_plan` | Takes the plan Claude assembled from the document. Validates it, stores it, returns `{ draft_id, plan, diff? }`. **Writes nothing to the project.** |
| `apply_plan` | Takes `draft_id`. Applies it in one transaction, records tasks as one `task_bulk_imports` batch, returns what changed and the `import_id` for undo. |

Both tool descriptions must state plainly that `draft_plan` has not changed anything, or
Claude will tell her the work is done when it is not.

## 7. Amending an existing project

This is where the risk actually lives, and it needs three rules.

1. **`draft_plan` must return a diff, not just a plan.** For an existing project the
   draft shows what exists now beside what would change — phase by phase, date by date.
   A plan without a diff asks her to approve a change she cannot see.
2. **Add and modify only. No deletes through MCP, in this version.** Deleting a phase
   destroys its children and any logged time against them, and there is no undo for that
   the way there is for a task batch. If a document implies something should go away,
   Claude says so in prose and she does it in the app.
3. **Never touch `completed_at` or logged time.** Re-dating a project must not resurrect
   finished work — the same trap the completion sync lane was built to avoid.

## 8. Failure and honesty

- **Idempotency.** `apply_plan` is idempotent on `draft_id`: applying an already-applied
  draft returns the original result rather than doubling it. Claude retries.
- **Partial batches.** Tasks apply what parses and return per-line errors, the same
  contract the composer has. Never all-or-nothing on a 30-line plan.
- **Clock.** Tools take and return `YYYY-MM-DD` strings only. The server never infers
  "today" — Claude passes the date it means, because the desktop's timezone and the
  server's are not reliably the same. Relative language in a document ("six weeks from
  kickoff") is resolved by Claude at draft time and shown as an absolute date, so an
  error is visible before it is written.
- **Scope violations** return a plain refusal naming the missing scope.

## 9. Slices

| Slice | What                                                                                                                                                                                                                  | Size    |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| W18a  | **Transport spike.** Prove Claude Desktop reaches a remote MCP endpoint on Vercel with a bearer token, and confirm the account tier supports custom connectors. Gates everything; do it before writing anything else. | 2h      |
| W18b  | `mcp_tokens` + Settings UI to mint and revoke                                                                                                                                                                         | 4h      |
| W18c  | `POST /api/mcp` + the five read tools over `createCaller`                                                                                                                                                             | 6h      |
| W18d  | `plan_drafts` + `draft_plan`, including the diff for existing projects                                                                                                                                                | 6h      |
| W18e  | `apply_plan` — orchestration, one bulk-import batch, fees, idempotency, undo handle                                                                                                                                   | 8h      |
| W18f  | Amend-existing support end to end (§7)                                                                                                                                                                                | 6h      |
| W18g  | Rate limiting, `last_used_at`, audit line per applied draft                                                                                                                                                           | 3h      |
|       | **Total**                                                                                                                                                                                                             | **35h** |

**W18a–c is the useful half (12h)** and ships alone: a Claude that can read Flowstate —
"what is Great White at?", "what did I not finish this week?" — is worth having before a
Claude that can write to it.

## 10. Open questions

1. **Deletes.** §7.2 forbids them, which is my call, not yours. If a re-scope regularly
   means "these three phases are gone," that rule will chafe.
2. **Whether `apply_plan` should require the project to be untouched since the draft.**
   Strict is safer; it also means editing a task in the app invalidates a draft you were
   about to approve. Lean: warn in the result, do not block.
3. **Migration numbers.** Two tables here. #333 added a duplicate-number guard, so the
   next free numbers must be read off disk at build time rather than assumed.

## 11. Deliberately not in scope

- **OAuth.** A pasted token is right for one user and one machine.
- **Write access for anyone but the owner.** Roles exist in `org_memberships` and are
  enforced nowhere; MCP must not be the first place that changes.
- **A tool per tRPC procedure.** The router has hundreds.
- **Streaming or long-running tools.** Every call returns in one response.
- **File upload into Flowstate.** Claude reads the document. The app never sees it.
