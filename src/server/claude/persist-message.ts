import "server-only";

import { and, asc, eq, gt } from "drizzle-orm";

import { db } from "@/db";
import { chatMessages } from "@/db/tables";
import {
  assistantContentWithProposal,
  nudgeContent,
  textContent,
  type MessageContent,
  type MessageMeta,
} from "@/lib/chat/message-content";
import type { ProposedAction, ProposalStatus } from "@/lib/chat/proposed-actions";
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

  if (!row) throw new Error("Failed to insert chat message.");
  return row;
}

export async function appendUserMessage(userId: string, threadId: string, text: string) {
  return insertChatMessage({ userId, threadId, role: "user", content: textContent(text) });
}

export async function appendAssistantMessage(
  userId: string,
  threadId: string,
  text: string,
  meta?: MessageMeta,
  proposal?: ProposedAction
) {
  let content: MessageContent;
  if (proposal) content = assistantContentWithProposal(text, proposal);
  else if (meta?.source === "nudge" && meta.kind) content = nudgeContent(text, meta.kind);
  else content = textContent(text, meta);

  return insertChatMessage({ userId, threadId, role: "assistant", content });
}

export async function updateMessageProposalStatus(
  messageId: string,
  userId: string,
  status: ProposalStatus
) {
  const [row] = await db
    .select({ content: chatMessages.content })
    .from(chatMessages)
    .where(and(eq(chatMessages.id, messageId), eq(chatMessages.userId, userId)))
    .limit(1);

  if (!row) throw new Error("Message not found.");

  const content = row.content as MessageContent;
  const proposal = content.meta?.proposal;
  if (!proposal) throw new Error("Message has no proposal.");

  const nextContent: MessageContent = {
    ...content,
    meta: { ...content.meta, proposal: { ...proposal, status } },
  };

  await db
    .update(chatMessages)
    .set({ content: nextContent, updatedAt: new Date() })
    .where(and(eq(chatMessages.id, messageId), eq(chatMessages.userId, userId)));
}

export async function updateAssistantMessage(messageId: string, userId: string, text: string) {
  await db
    .update(chatMessages)
    .set({ content: textContent(text), updatedAt: new Date() })
    .where(and(eq(chatMessages.id, messageId), eq(chatMessages.userId, userId)));
}

export async function editUserMessageAndTruncateAfter(
  userId: string,
  threadId: string,
  messageId: string,
  text: string
) {
  const [row] = await db
    .select({ id: chatMessages.id, role: chatMessages.role, createdAt: chatMessages.createdAt })
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.id, messageId),
        eq(chatMessages.userId, userId),
        eq(chatMessages.threadId, threadId)
      )
    )
    .limit(1);

  if (!row || row.role !== "user") throw new Error("User message not found.");

  const now = new Date();
  await db
    .update(chatMessages)
    .set({ content: textContent(text.trim()), updatedAt: now })
    .where(and(eq(chatMessages.id, messageId), eq(chatMessages.userId, userId)));

  await db
    .delete(chatMessages)
    .where(
      and(
        eq(chatMessages.userId, userId),
        eq(chatMessages.threadId, threadId),
        gt(chatMessages.createdAt, row.createdAt)
      )
    );

  return { id: messageId };
}
