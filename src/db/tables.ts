import * as sqliteSchema from "@kash/db-local/schema";
import { abyssItems as pgAbyssItems } from "./schema/abyss-items";
import { appSettings as pgAppSettings } from "./schema/app-settings";
import { calendarConnections as pgCalendarConnections } from "./schema/calendar-connections";
import { clients as pgClients } from "./schema/clients";
import { directions as pgDirections } from "./schema/directions";
import { targets as pgTargets } from "./schema/targets";
import { leads as pgLeads } from "./schema/leads";
import { sourcingSettings as pgSourcingSettings } from "./schema/sourcing-settings";
import { leadOutreach as pgLeadOutreach } from "./schema/lead-outreach";
import { rates as pgRates } from "./schema/rates";
import { invoices as pgInvoices } from "./schema/invoices";
import { invoiceLines as pgInvoiceLines } from "./schema/invoice-lines";
import { moneySettings as pgMoneySettings } from "./schema/money-settings";
import { businessExpenses as pgBusinessExpenses } from "./schema/business-expenses";
import { ledgerPeriods as pgLedgerPeriods } from "./schema/ledger-periods";
import { projectFees as pgProjectFees } from "./schema/project-fees";
import { ownerDraws as pgOwnerDraws } from "./schema/owner-draws";
import { externalCalendarEvents as pgExternalCalendarEvents } from "./schema/external-calendar-events";
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
export const reservedDays = (
  isSqliteMode() ? sqliteSchema.reservedDays : pgReservedDays
) as typeof pgReservedDays;
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
export const directions = (
  isSqliteMode() ? sqliteSchema.directions : pgDirections
) as typeof pgDirections;
export const targets = (isSqliteMode() ? sqliteSchema.targets : pgTargets) as typeof pgTargets;
export const leads = (isSqliteMode() ? sqliteSchema.leads : pgLeads) as typeof pgLeads;
export const sourcingSettings = (
  isSqliteMode() ? sqliteSchema.sourcingSettings : pgSourcingSettings
) as typeof pgSourcingSettings;
export const leadOutreach = (
  isSqliteMode() ? sqliteSchema.leadOutreach : pgLeadOutreach
) as typeof pgLeadOutreach;
export const rates = (isSqliteMode() ? sqliteSchema.rates : pgRates) as typeof pgRates;
export const invoices = (isSqliteMode() ? sqliteSchema.invoices : pgInvoices) as typeof pgInvoices;
export const invoiceLines = (
  isSqliteMode() ? sqliteSchema.invoiceLines : pgInvoiceLines
) as typeof pgInvoiceLines;
export const moneySettings = (
  isSqliteMode() ? sqliteSchema.moneySettings : pgMoneySettings
) as typeof pgMoneySettings;
export const businessExpenses = (
  isSqliteMode() ? sqliteSchema.businessExpenses : pgBusinessExpenses
) as typeof pgBusinessExpenses;
export const ownerDraws = (
  isSqliteMode() ? sqliteSchema.ownerDraws : pgOwnerDraws
) as typeof pgOwnerDraws;
export const ledgerPeriods = (
  isSqliteMode() ? sqliteSchema.ledgerPeriods : pgLedgerPeriods
) as typeof pgLedgerPeriods;
export const projectFees = (
  isSqliteMode() ? sqliteSchema.projectFees : pgProjectFees
) as typeof pgProjectFees;
export const orgs = (isSqliteMode() ? sqliteSchema.orgs : pgOrgs) as typeof pgOrgs;
export const orgMemberships = (
  isSqliteMode() ? sqliteSchema.orgMemberships : pgOrgMemberships
) as typeof pgOrgMemberships;
