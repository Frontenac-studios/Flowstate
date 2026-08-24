import * as sqliteSchema from "@kash/db-local/schema";
import { abyssItems as pgAbyssItems } from "./schema/abyss-items";
import { appSettings as pgAppSettings } from "./schema/app-settings";
import { calendarConnections as pgCalendarConnections } from "./schema/calendar-connections";
import { clients as pgClients } from "./schema/clients";
import { rates as pgRates } from "./schema/rates";
import { externalCalendarEvents as pgExternalCalendarEvents } from "./schema/external-calendar-events";
import { careActivities as pgCareActivities } from "./schema/care-activities";
import { careEvents as pgCareEvents } from "./schema/care-events";
import { careReflections as pgCareReflections } from "./schema/care-reflections";
import { goalMilestones as pgGoalMilestones } from "./schema/goal-milestones";
import { goals as pgGoals } from "./schema/goals";
import { reservedDays as pgReservedDays } from "./schema/reserved-days";
import { categorySettings as pgCategorySettings } from "./schema/category-settings";
import { chatCustomSuggestions as pgChatCustomSuggestions } from "./schema/chat-custom-suggestions";
import { chatMessages as pgChatMessages } from "./schema/chat-messages";
import { dayReviews as pgDayReviews } from "./schema/day-reviews";
import { focusBlocks as pgFocusBlocks } from "./schema/focus-blocks";
import { phases as pgPhases } from "./schema/phases";
import { projectMilestones as pgProjectMilestones } from "./schema/project-milestones";
import { projectTemplates as pgProjectTemplates } from "./schema/project-templates";
import { projects as pgProjects } from "./schema/projects";
import { protectedBlockTemplates as pgProtectedBlockTemplates } from "./schema/protected-block-templates";
import { protectedBlocks as pgProtectedBlocks } from "./schema/protected-blocks";
import {
  taskBulkImportItems as pgTaskBulkImportItems,
  taskBulkImports as pgTaskBulkImports,
} from "./schema/task-bulk-imports";
import { taskOccurrenceOverrides as pgTaskOccurrenceOverrides } from "./schema/task-occurrence-overrides";
import { taskRecurrence as pgTaskRecurrence } from "./schema/task-recurrence";
import { tasks as pgTasks } from "./schema/tasks";
import { weekDayPriorities as pgWeekDayPriorities } from "./schema/week-day-priorities";
import { weekReviews as pgWeekReviews } from "./schema/week-reviews";
import { timeEntries as pgTimeEntries } from "./schema/time-entries";
import { timeTags as pgTimeTags } from "./schema/time-tags";
import { orgMemberships as pgOrgMemberships } from "./schema/org-memberships";
import { orgs as pgOrgs } from "./schema/orgs";

import { isSqliteMode } from "./mode";

/** Runtime table handles; typed as Postgres for Drizzle query compatibility. */
export const tasks = (isSqliteMode() ? sqliteSchema.tasks : pgTasks) as typeof pgTasks;
export const projects = (isSqliteMode() ? sqliteSchema.projects : pgProjects) as typeof pgProjects;
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
export const timeEntries = (
  isSqliteMode() ? sqliteSchema.timeEntries : pgTimeEntries
) as typeof pgTimeEntries;
export const timeTags = (isSqliteMode() ? sqliteSchema.timeTags : pgTimeTags) as typeof pgTimeTags;
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
export const focusBlocks = (
  isSqliteMode() ? sqliteSchema.focusBlocks : pgFocusBlocks
) as typeof pgFocusBlocks;
export const protectedBlockTemplates = (
  isSqliteMode() ? sqliteSchema.protectedBlockTemplates : pgProtectedBlockTemplates
) as typeof pgProtectedBlockTemplates;
export const protectedBlocks = (
  isSqliteMode() ? sqliteSchema.protectedBlocks : pgProtectedBlocks
) as typeof pgProtectedBlocks;
export const abyssItems = (
  isSqliteMode() ? sqliteSchema.abyssItems : pgAbyssItems
) as typeof pgAbyssItems;
export const goals = (isSqliteMode() ? sqliteSchema.goals : pgGoals) as typeof pgGoals;
export const goalMilestones = (
  isSqliteMode() ? sqliteSchema.goalMilestones : pgGoalMilestones
) as typeof pgGoalMilestones;
export const reservedDays = (
  isSqliteMode() ? sqliteSchema.reservedDays : pgReservedDays
) as typeof pgReservedDays;
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
export const weekReviews = (
  isSqliteMode() ? sqliteSchema.weekReviews : pgWeekReviews
) as typeof pgWeekReviews;
export const calendarConnections = (
  isSqliteMode() ? sqliteSchema.calendarConnections : pgCalendarConnections
) as typeof pgCalendarConnections;
export const externalCalendarEvents = (
  isSqliteMode() ? sqliteSchema.externalCalendarEvents : pgExternalCalendarEvents
) as typeof pgExternalCalendarEvents;
export const clients = (isSqliteMode() ? sqliteSchema.clients : pgClients) as typeof pgClients;
export const rates = (isSqliteMode() ? sqliteSchema.rates : pgRates) as typeof pgRates;
export const orgs = (isSqliteMode() ? sqliteSchema.orgs : pgOrgs) as typeof pgOrgs;
export const orgMemberships = (
  isSqliteMode() ? sqliteSchema.orgMemberships : pgOrgMemberships
) as typeof pgOrgMemberships;
