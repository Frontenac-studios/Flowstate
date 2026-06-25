import * as sqliteSchema from "@kash/db-local/schema";
import { appSettings as pgAppSettings } from "./schema/app-settings";
import { categorySettings as pgCategorySettings } from "./schema/category-settings";
import { chatCustomSuggestions as pgChatCustomSuggestions } from "./schema/chat-custom-suggestions";
import { chatMessages as pgChatMessages } from "./schema/chat-messages";
import { dayReviews as pgDayReviews } from "./schema/day-reviews";
import { focusBlocks as pgFocusBlocks } from "./schema/focus-blocks";
import { nudgeEvents as pgNudgeEvents } from "./schema/nudge-events";
import { phases as pgPhases } from "./schema/phases";
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
import { taskTimeEntries as pgTaskTimeEntries } from "./schema/task-time-entries";

import { isSqliteMode } from "./mode";

/** Runtime table handles; typed as Postgres for Drizzle query compatibility. */
export const tasks = (isSqliteMode() ? sqliteSchema.tasks : pgTasks) as typeof pgTasks;
export const projects = (isSqliteMode() ? sqliteSchema.projects : pgProjects) as typeof pgProjects;
export const phases = (isSqliteMode() ? sqliteSchema.phases : pgPhases) as typeof pgPhases;
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
export const dayReviews = (
  isSqliteMode() ? sqliteSchema.dayReviews : pgDayReviews
) as typeof pgDayReviews;
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
