import { and, asc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { chatMessages } from "@/db/tables";
import { messageContentSchema, textContent } from "@/lib/chat/message-content";
import { GLOBAL_THREAD_ID, taskIdForThread, threadIdSchema } from "@/lib/chat/threads";
import { isAnthropicConfigured } from "@/lib/env";
import { buildWorkOnSuggestion } from "@/server/chat/build-work-on-suggestion";
import { editUserMessageAndTruncateAfter } from "@/server/claude/persist-message";
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
    .input(z.object({ threadId: threadIdSchema }))
    .query(async ({ ctx, input }) => {
      const rows = await db
        .select({
          id: chatMessages.id,
          role: chatMessages.role,
          content: chatMessages.content,
          taskId: chatMessages.taskId,
          createdAt: chatMessages.createdAt,
        })
        .from(chatMessages)
        .where(and(eq(chatMessages.userId, ctx.userId), eq(chatMessages.threadId, input.threadId)))
        .orderBy(asc(chatMessages.createdAt))
        .limit(100);

      return rows.map((row) => ({
        id: row.id,
        role: row.role,
        content: messageContentSchema.parse(row.content),
        taskId: row.taskId,
        createdAt: row.createdAt,
      }));
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
});
