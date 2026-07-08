import { and, desc, eq, lt } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { chatMessages } from "@/db/tables";
import { messageContentSchema, textContent } from "@/lib/chat/message-content";
import {
  createTaskItemEditSchema,
  filterPayloadByItemIds,
  mergeCreateTaskEdits,
  proposedActionSchema,
} from "@/lib/chat/proposed-actions";
import { captureContextSchema } from "@/lib/chat/capture-context";
import { confirmUndoFrameSchema } from "@/lib/chat/confirm-undo";
import { GLOBAL_THREAD_ID, taskIdForThread, threadIdSchema } from "@/lib/chat/threads";
import { isAnthropicConfigured } from "@/lib/env";
import { buildWorkOnSuggestion } from "@/server/chat/build-work-on-suggestion";
import { applyProposedActionPayload } from "@/server/claude/apply-proposed-action";
import {
  editUserMessageAndTruncateAfter,
  updateMessageProposalStatus,
} from "@/server/claude/persist-message";
import {
  listPromotedSuggestions,
  recordCustomSuggestionUsage,
  recordPhraseSend,
} from "@/server/chat/custom-suggestions";

import { createTRPCRouter, protectedProcedure } from "../init";

const localCalendarInputSchema = z.object({
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tzOffsetMinutes: z.number().int().min(-840).max(840),
});

export const chatRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        threadId: threadIdSchema,
        beforeMessageId: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const limit = input.limit;
      let beforeCreatedAt: Date | undefined;
      if (input.beforeMessageId) {
        const [cursor] = await db
          .select({ createdAt: chatMessages.createdAt })
          .from(chatMessages)
          .where(
            and(
              eq(chatMessages.userId, ctx.userId),
              eq(chatMessages.threadId, input.threadId),
              eq(chatMessages.id, input.beforeMessageId)
            )
          )
          .limit(1);
        if (!cursor) return { messages: [], hasMore: false };
        beforeCreatedAt = cursor.createdAt;
      }
      const conditions = [
        eq(chatMessages.userId, ctx.userId),
        eq(chatMessages.threadId, input.threadId),
      ];
      if (beforeCreatedAt) conditions.push(lt(chatMessages.createdAt, beforeCreatedAt));
      const rows = await db
        .select({
          id: chatMessages.id,
          role: chatMessages.role,
          content: chatMessages.content,
          taskId: chatMessages.taskId,
          createdAt: chatMessages.createdAt,
        })
        .from(chatMessages)
        .where(and(...conditions))
        .orderBy(desc(chatMessages.createdAt))
        .limit(limit + 1);
      const hasMore = rows.length > limit;
      const page = rows.slice(0, limit).reverse();
      return {
        messages: page.map((row) => ({
          id: row.id,
          role: row.role,
          content: messageContentSchema.parse(row.content),
          taskId: row.taskId,
          createdAt: row.createdAt,
        })),
        hasMore,
      };
    }),

  appendUser: protectedProcedure
    .input(
      z.object({
        threadId: threadIdSchema,
        text: z.string().min(1).max(8000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const taskId = taskIdForThread(input.threadId);
      const [row] = await db
        .insert(chatMessages)
        .values({
          userId: ctx.userId,
          threadId: input.threadId,
          role: "user",
          content: textContent(input.text),
          taskId,
        })
        .returning({ id: chatMessages.id });

      if (!row) {
        throw new Error("Failed to save message.");
      }

      return { id: row.id };
    }),

  appendAssistant: protectedProcedure
    .input(
      z.object({
        threadId: threadIdSchema,
        text: z.string().max(16000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const taskId = taskIdForThread(input.threadId);
      const [row] = await db
        .insert(chatMessages)
        .values({
          userId: ctx.userId,
          threadId: input.threadId,
          role: "assistant",
          content: textContent(input.text),
          taskId,
        })
        .returning({ id: chatMessages.id });

      if (!row) {
        throw new Error("Failed to save message.");
      }

      return { id: row.id };
    }),

  editUserMessage: protectedProcedure
    .input(
      z.object({
        threadId: threadIdSchema,
        messageId: z.string().uuid(),
        text: z.string().min(1).max(8000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await editUserMessageAndTruncateAfter(
          ctx.userId,
          input.threadId,
          input.messageId,
          input.text
        );
      } catch {
        throw new TRPCError({ code: "NOT_FOUND", message: "Message not found." });
      }
    }),

  markThreadRead: protectedProcedure
    .input(z.object({ threadId: threadIdSchema }))
    .mutation(async () => {
      return { ok: true as const };
    }),

  suggestWorkOn: protectedProcedure
    .input(
      z.object({
        threadId: threadIdSchema,
        lastWasLarge: z.boolean().optional(),
        ...localCalendarInputSchema.shape,
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.threadId !== GLOBAL_THREAD_ID) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Work-on suggestions are only available in global chat.",
        });
      }

      const suggestion = await buildWorkOnSuggestion({
        userId: ctx.userId,
        localDate: input.localDate,
        tzOffsetMinutes: input.tzOffsetMinutes,
        lastWasLarge: input.lastWasLarge,
      });

      const taskId = taskIdForThread(input.threadId);

      const [userRow] = await db
        .insert(chatMessages)
        .values({
          userId: ctx.userId,
          threadId: input.threadId,
          role: "user",
          content: textContent(suggestion.userText),
          taskId,
        })
        .returning({ id: chatMessages.id });

      if (!userRow) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save user message.",
        });
      }

      const [assistantRow] = await db
        .insert(chatMessages)
        .values({
          userId: ctx.userId,
          threadId: input.threadId,
          role: "assistant",
          content: textContent(suggestion.assistantText),
          taskId,
        })
        .returning({ id: chatMessages.id });

      if (!assistantRow) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save assistant message.",
        });
      }

      return {
        userMessageId: userRow.id,
        assistantMessageId: assistantRow.id,
        pick: suggestion.pick,
        lastWasLarge: suggestion.lastWasLarge,
      };
    }),

  isConfigured: protectedProcedure.query(() => {
    return { configured: isAnthropicConfigured() };
  }),

  listCustomSuggestions: protectedProcedure.query(async ({ ctx }) => {
    return listPromotedSuggestions(ctx.userId);
  }),

  recordPhraseSend: protectedProcedure
    .input(z.object({ text: z.string().min(1).max(8000) }))
    .mutation(async ({ ctx, input }) => {
      return recordPhraseSend({ userId: ctx.userId, text: input.text });
    }),

  recordCustomSuggestionUsage: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await recordCustomSuggestionUsage({ userId: ctx.userId, id: input.id });
      return { ok: true as const };
    }),

  applyProposedAction: protectedProcedure
    .input(
      z.object({
        messageId: z.string().uuid(),
        enabledItemIds: z.array(z.string().min(1)).optional(),
        // Inline edits from the draft card (create_task only). When present these
        // both select the enabled rows and carry edited field values.
        editedItems: z.array(createTaskItemEditSchema).optional(),
        captureContext: captureContextSchema.nullish(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .select({ id: chatMessages.id, content: chatMessages.content })
        .from(chatMessages)
        .where(and(eq(chatMessages.id, input.messageId), eq(chatMessages.userId, ctx.userId)))
        .limit(1);

      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Message not found." });

      const content = messageContentSchema.parse(row.content);
      const proposal = content.meta?.proposal;
      if (!proposal || proposal.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No pending proposal on this message.",
        });
      }

      const parsedProposal = proposedActionSchema.parse(proposal);
      let filtered: ReturnType<typeof filterPayloadByItemIds>;
      if (input.editedItems?.length) {
        // Re-validates the edited items against the schema (throws on bad input).
        filtered = mergeCreateTaskEdits(parsedProposal, input.editedItems);
      } else if (input.enabledItemIds?.length) {
        filtered = filterPayloadByItemIds(parsedProposal, input.enabledItemIds);
      } else {
        filtered = parsedProposal;
      }

      if (!filtered) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No items selected to apply." });
      }

      const result = await applyProposedActionPayload(ctx.userId, filtered, {
        captureContext: input.captureContext ?? null,
        createTaskEdits: input.editedItems,
      });
      await updateMessageProposalStatus(input.messageId, ctx.userId, "applied");
      const undoFrames = result.undoFrames.map((frame) => confirmUndoFrameSchema.parse(frame));
      return { applied: result.applied, titles: result.titles, undoFrames };
    }),

  dismissProposedAction: protectedProcedure
    .input(z.object({ messageId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .select({ id: chatMessages.id, content: chatMessages.content })
        .from(chatMessages)
        .where(and(eq(chatMessages.id, input.messageId), eq(chatMessages.userId, ctx.userId)))
        .limit(1);

      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Message not found." });

      const content = messageContentSchema.parse(row.content);
      const proposal = content.meta?.proposal;
      if (!proposal || proposal.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No pending proposal on this message.",
        });
      }

      await updateMessageProposalStatus(input.messageId, ctx.userId, "dismissed");
      return { ok: true as const };
    }),
});
