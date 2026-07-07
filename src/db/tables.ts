import * as sqliteSchema from "@kash/db-local/schema";
import { aboutMeSections as pgAboutMeSections } from "./schema/about-me-sections";
import { aboutMeSuggestions as pgAboutMeSuggestions } from "./schema/about-me-suggestions";
import { abyssItems as pgAbyssItems } from "./schema/abyss-items";
import { userConstraints as pgUserConstraints } from "./schema/user-constraints";
import { userValues as pgUserValues } from "./schema/user-values";
import { appSettings as pgAppSettings } from "./schema/app-settings";
import { bingoCards as pgBingoCards } from "./schema/bingo-cards";
import { careActivities as pgCareActivities } from "./schema/care-activities";
import { careEvents as pgCareEvents } from "./schema/care-events";
import { careReflections as pgCareReflections } from "./schema/care-reflections";
import { goalMilestones as pgGoalMilestones } from "./schema/goal-milestones";
import { goals as pgGoals } from "./schema/goals";
import { monthIntentions as pgMonthIntentions } from "./schema/month-intentions";
import { planningSuggestions as pgPlanningSuggestions } from "./schema/planning-suggestions";
import { quarterThemes as pgQuarterThemes } from "./schema/quarter-themes";
import { reservedDays as pgReservedDays } from "./schema/reserved-days";
import { categorySettings as pgCategorySettings } from "./schema/category-settings";
import { chatCustomSuggestions as pgChatCustomSuggestions } from "./schema/chat-custom-suggestions";
import { chatMessages as pgChatMessages } from "./schema/chat-messages";
import { dailyWins as pgDailyWins } from "./schema/daily-wins";
import { dayReviews as pgDayReviews } from "./schema/day-reviews";
import { evidenceEditions as pgEvidenceEditions } from "./schema/evidence-editions";
import { focusBlocks as pgFocusBlocks } from "./schema/focus-blocks";
import { nudgeEvents as pgNudgeEvents } from "./schema/nudge-events";
import { phases as pgPhases } from "./schema/phases";
import { projectMilestones as pgProjectMilestones } from "./schema/project-milestones";
import { projectSimilarity as pgProjectSimilarity } from "./schema/project-similarity";
import { projectTemplates as pgProjectTemplates } from "./schema/project-templates";
import { projects as pgProjects } from "./schema/projects";
import { protectedBlockTemplates as pgProtectedBlockTemplates } from "./schema/protected-block-templates";
import { protectedBlocks as pgProtectedBlocks } from "./schema/protected-blocks";
import {
  taskBulkImportItems as pgTaskBulkImportItems,
  taskBulkImports as pgTaskBulkImports,
} from "./schema/task-bulk-imports";
import { taskDependencies as pgTaskDependencies } from "./schema/task-dependencies";
import { taskOccurrenceOverrides as pgTaskOccurrenceOverrides } from "./schema/task-occurrence-overrides";
import { taskRecurrence as pgTaskRecurrence } from "./schema/task-recurrence";
import { tasks as pgTasks } from "./schema/tasks";
import { weekDayPriorities as pgWeekDayPriorities } from "./schema/week-day-priorities";
import { taskTimeEntries as pgTaskTimeEntries } from "./schema/task-time-entries";

import { isSqliteMode } from "./mode";

/** Runtime table handles; typed as Postgres for Drizzle query compatibility. */
export const tasks = (isSqliteMode() ? sqliteSchema.tasks : pgTasks) as typeof pgTasks;
export const projects = (isSqliteMode() ? sqliteSchema.projects : pgProjects) as typeof pgProjects;
export const projectSimilarity = (
  isSqliteMode() ? sqliteSchema.projectSimilarity : pgProjectSimilarity
) as typeof pgProjectSimilarity;
export const projectTemplates = (
  isSqliteMode() ? sqliteSchema.projectTemplates : pgProjectTemplates
) as typeof pgProjectTemplates;
export const phases = (isSqliteMode() ? sqliteSchema.phases : pgPhases) as typeof pgPhases;
export const projectMilestones = (
  isSqliteMode() ? sqliteSchema.projectMilestones : pgProjectMilestones
) as typeof pgProjectMilestones;
export const taskBulkImports = (
  isSqliteMode() ? sqliteSchema.taskBulkImports : pgTaskBulkImports
) as typeof pgTaskBulkImports;
export const taskBulkImportItems = (
  isSqliteMode() ? sqliteSchema.taskBulkImportItems : pgTaskBulkImportItems
) as typeof pgTaskBulkImportItems;
export const taskTimeEntries = (
  isSqliteMode() ? sqliteSchema.taskTimeEntries : pgTaskTimeEntries
) as typeof pgTaskTimeEntries;
export const taskDependencies = (
  isSqliteMode() ? sqliteSchema.taskDependencies : pgTaskDependencies
) as typeof pgTaskDependencies;
export const taskRecurrence = (
  isSqliteMode() ? sqliteSchema.taskRecurrence : pgTaskRecurrence
) as typeof pgTaskRecurrence;
export const taskOccurrenceOverrides = (
  isSqliteMode() ? sqliteSchema.taskOccurrenceOverrides : pgTaskOccurrenceOverrides
) as typeof pgTaskOccurrenceOverrides;
export const chatMessages = (
  isSqliteMode() ? sqliteSchema.chatMessages : pgChatMessages
) as typeof pgChatMessages;
export const chatCustomSuggestions = (
  isSqliteMode() ? sqliteSchema.chatCustomSuggestions : pgChatCustomSuggestions
) as typeof pgChatCustomSuggestions;
export const dailyWins = (
  isSqliteMode() ? sqliteSchema.dailyWins : pgDailyWins
) as typeof pgDailyWins;
export const dayReviews = (
  isSqliteMode() ? sqliteSchema.dayReviews : pgDayReviews
) as typeof pgDayReviews;
export const evidenceEditions = (
  isSqliteMode() ? sqliteSchema.evidenceEditions : pgEvidenceEditions
) as typeof pgEvidenceEditions;
export const appSettings = (
  isSqliteMode() ? sqliteSchema.appSettings : pgAppSettings
) as typeof pgAppSettings;
export const categorySettings = (
  isSqliteMode() ? sqliteSchema.categorySettings : pgCategorySettings
) as typeof pgCategorySettings;
export const nudgeEvents = (
  isSqliteMode() ? sqliteSchema.nudgeEvents : pgNudgeEvents
) as typeof pgNudgeEvents;
export const focusBlocks = (
  isSqliteMode() ? sqliteSchema.focusBlocks : pgFocusBlocks
) as typeof pgFocusBlocks;
export const protectedBlockTemplates = (
  isSqliteMode() ? sqliteSchema.protectedBlockTemplates : pgProtectedBlockTemplates
) as typeof pgProtectedBlockTemplates;
export const protectedBlocks = (
  isSqliteMode() ? sqliteSchema.protectedBlocks : pgProtectedBlocks
) as typeof pgProtectedBlocks;
export const bingoCards = (
  isSqliteMode() ? sqliteSchema.bingoCards : pgBingoCards
) as typeof pgBingoCards;
export const abyssItems = (
  isSqliteMode() ? sqliteSchema.abyssItems : pgAbyssItems
) as typeof pgAbyssItems;
export const goals = (isSqliteMode() ? sqliteSchema.goals : pgGoals) as typeof pgGoals;
export const goalMilestones = (
  isSqliteMode() ? sqliteSchema.goalMilestones : pgGoalMilestones
) as typeof pgGoalMilestones;
export const quarterThemes = (
  isSqliteMode() ? sqliteSchema.quarterThemes : pgQuarterThemes
) as typeof pgQuarterThemes;
export const monthIntentions = (
  isSqliteMode() ? sqliteSchema.monthIntentions : pgMonthIntentions
) as typeof pgMonthIntentions;
export const reservedDays = (
  isSqliteMode() ? sqliteSchema.reservedDays : pgReservedDays
) as typeof pgReservedDays;
export const planningSuggestions = (
  isSqliteMode() ? sqliteSchema.planningSuggestions : pgPlanningSuggestions
) as typeof pgPlanningSuggestions;
export const userValues = (
  isSqliteMode() ? sqliteSchema.userValues : pgUserValues
) as typeof pgUserValues;
export const aboutMeSections = (
  isSqliteMode() ? sqliteSchema.aboutMeSections : pgAboutMeSections
) as typeof pgAboutMeSections;
export const userConstraints = (
  isSqliteMode() ? sqliteSchema.userConstraints : pgUserConstraints
) as typeof pgUserConstraints;
export const aboutMeSuggestions = (
  isSqliteMode() ? sqliteSchema.aboutMeSuggestions : pgAboutMeSuggestions
) as typeof pgAboutMeSuggestions;
export const careActivities = (
  isSqliteMode() ? sqliteSchema.careActivities : pgCareActivities
) as typeof pgCareActivities;
export const careEvents = (
  isSqliteMode() ? sqliteSchema.careEvents : pgCareEvents
) as typeof pgCareEvents;
export const careReflections = (
  isSqliteMode() ? sqliteSchema.careReflections : pgCareReflections
) as typeof pgCareReflections;
export const weekDayPriorities = (
  isSqliteMode() ? sqliteSchema.weekDayPriorities : pgWeekDayPriorities
) as typeof pgWeekDayPriorities;
