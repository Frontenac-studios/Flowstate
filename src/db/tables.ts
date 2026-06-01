import * as sqliteSchema from "@kash/db-local/schema";
import { appSettings as pgAppSettings } from "./schema/app-settings";
import { chatMessages as pgChatMessages } from "./schema/chat-messages";
import { dayReviews as pgDayReviews } from "./schema/day-reviews";
import { focusBlocks as pgFocusBlocks } from "./schema/focus-blocks";
import { nudgeEvents as pgNudgeEvents } from "./schema/nudge-events";
import { projects as pgProjects } from "./schema/projects";
import { tasks as pgTasks } from "./schema/tasks";
import { taskTimeEntries as pgTaskTimeEntries } from "./schema/task-time-entries";

import { isSqliteMode } from "./mode";

/** Runtime table handles; typed as Postgres for Drizzle query compatibility. */
export const tasks = (isSqliteMode() ? sqliteSchema.tasks : pgTasks) as typeof pgTasks;
export const projects = (isSqliteMode() ? sqliteSchema.projects : pgProjects) as typeof pgProjects;
export const taskTimeEntries = (
  isSqliteMode() ? sqliteSchema.taskTimeEntries : pgTaskTimeEntries
) as typeof pgTaskTimeEntries;
export const chatMessages = (
  isSqliteMode() ? sqliteSchema.chatMessages : pgChatMessages
) as typeof pgChatMessages;
export const dayReviews = (
  isSqliteMode() ? sqliteSchema.dayReviews : pgDayReviews
) as typeof pgDayReviews;
export const appSettings = (
  isSqliteMode() ? sqliteSchema.appSettings : pgAppSettings
) as typeof pgAppSettings;
export const nudgeEvents = (
  isSqliteMode() ? sqliteSchema.nudgeEvents : pgNudgeEvents
) as typeof pgNudgeEvents;
export const focusBlocks = (
  isSqliteMode() ? sqliteSchema.focusBlocks : pgFocusBlocks
) as typeof pgFocusBlocks;
