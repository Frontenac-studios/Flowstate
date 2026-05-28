import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { chatMessages } from "@/db/tables";
import { messageContentSchema, textContent } from "@/lib/chat/message-content";
import { taskIdForThread, threadIdSchema } from "@/lib/chat/threads";
import { isAnthropicConfigured } from "@/lib/env";

import { createTRPCRouter, protectedProcedure } from "../init";

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

  markThreadRead: protectedProcedure
    .input(z.object({ threadId: threadIdSchema }))
    .mutation(async () => {
      return { ok: true as const };
    }),

  isConfigured: protectedProcedure.query(() => {
    return { configured: isAnthropicConfigured() };
  }),
});
