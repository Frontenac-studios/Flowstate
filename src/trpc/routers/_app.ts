import { z } from "zod";

import { baseProcedure, createTRPCRouter } from "../init";
import { abyssRouter } from "./abyss";
import { budgetRouter } from "./budget";
import { careRouter } from "./care";
import { calendarRouter } from "./calendar";
import { categorySettingsRouter } from "./category-settings";
import { chatRouter } from "./chat";
import { clientsRouter } from "./clients";
import { dayReviewsRouter } from "./day-reviews";
import { directionsRouter } from "./directions";
import { focusBlocksRouter } from "./focus-blocks";
import { invoicesRouter } from "./invoices";
import { learningRouter } from "./learning";
import { quarterReviewRouter } from "./quarter-review";
import { meRouter } from "./me";
import { moneyRouter } from "./money";
import { phasesRouter } from "./phases";
import { planningRouter } from "./planning";
import { projectMilestonesRouter } from "./project-milestones";
import { projectsRouter } from "./projects";
import { protectedBlocksRouter } from "./protected-blocks";
import { recurrenceRouter } from "./recurrence";
import { settingsRouter } from "./settings";
import { targetsRouter } from "./targets";
import { taskBulkImportsRouter } from "./task-bulk-imports";
import { tasksRouter } from "./tasks";
import { timeEntriesRouter } from "./time-entries";
import { timeTagsRouter } from "./time-tags";
import { syncRouter } from "./sync";
import { weekDraftRouter } from "./week-draft";
import { weekDayPrioritiesRouter } from "./week-day-priorities";
import { weekOverCommitRouter } from "./week-over-commit";
import { weekReviewsRouter } from "./week-reviews";

export const appRouter = createTRPCRouter({
  hello: baseProcedure.input(z.object({ text: z.string() })).query((opts) => {
    return { greeting: `hello ${opts.input.text}` };
  }),
  abyss: abyssRouter,
  budget: budgetRouter,
  care: careRouter,
  calendar: calendarRouter,
  categorySettings: categorySettingsRouter,
  chat: chatRouter,
  clients: clientsRouter,
  dayReviews: dayReviewsRouter,
  directions: directionsRouter,
  focusBlocks: focusBlocksRouter,
  invoices: invoicesRouter,
  learning: learningRouter,
  quarterReview: quarterReviewRouter,
  me: meRouter,
  money: moneyRouter,
  phases: phasesRouter,
  planning: planningRouter,
  projectMilestones: projectMilestonesRouter,
  projects: projectsRouter,
  protectedBlocks: protectedBlocksRouter,
  recurrence: recurrenceRouter,
  settings: settingsRouter,
  sync: syncRouter,
  targets: targetsRouter,
  taskBulkImports: taskBulkImportsRouter,
  tasks: tasksRouter,
  timeEntries: timeEntriesRouter,
  timeTags: timeTagsRouter,
  weekDraft: weekDraftRouter,
  weekDayPriorities: weekDayPrioritiesRouter,
  weekOverCommit: weekOverCommitRouter,
  weekReviews: weekReviewsRouter,
});

export type AppRouter = typeof appRouter;
