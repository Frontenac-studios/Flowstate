import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { chatMessages } from "@/db/schema/chat-messages";
import {
  nudgeContent,
  textContent,
  type MessageContent,
  type MessageMeta,
} from "@/lib/chat/message-content";
import { taskIdForThread } from "@/lib/chat/threads";

export async function listThreadMessages(userId: string, threadId: string, limit = 50) {
  return db
    .select({
      id: chatMessages.id,
      role: chatMessages.role,
      content: chatMessages.content,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .where(and(eq(chatMessages.userId, userId), eq(chatMessages.threadId, threadId)))
    .orderBy(asc(chatMessages.createdAt))
    .limit(limit);
}

export async function insertChatMessage(params: {
  userId: string;
  threadId: string;
  role: "user" | "assistant" | "system";
  content: MessageContent;
  taskId?: string | null;
}) {
  const taskId = params.taskId ?? taskIdForThread(params.threadId);

  const [row] = await db
    .insert(chatMessages)
    .values({
      userId: params.userId,
      threadId: params.threadId,
      role: params.role,
      content: params.content,
      taskId,
    })
    .returning({ id: chatMessages.id });

  if (!row) {
    throw new Error("Failed to insert chat message.");
  }

  return row;
}

export async function appendUserMessage(userId: string, threadId: string, text: string) {
  return insertChatMessage({
    userId,
    threadId,
    role: "user",
    content: textContent(text),
  });
}

export async function appendAssistantMessage(
  userId: string,
  threadId: string,
  text: string,
  meta?: MessageMeta
) {
  const content = meta?.source === "nudge" ? nudgeContent(text, meta.kind) : textContent(text);
  return insertChatMessage({
    userId,
    threadId,
    role: "assistant",
    content,
  });
}

export async function updateAssistantMessage(messageId: string, userId: string, text: string) {
  await db
    .update(chatMessages)
    .set({ content: textContent(text) })
    .where(and(eq(chatMessages.id, messageId), eq(chatMessages.userId, userId)));
}
