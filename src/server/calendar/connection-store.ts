import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { calendarConnections } from "@/db/tables";

import { decryptToken, encryptToken } from "./encrypt-tokens";
import type { GoogleOAuthTokens } from "./google-client";
import { refreshGoogleAccessToken } from "./google-client";

export type CalendarConnectionRow = typeof calendarConnections.$inferSelect;

export async function getGoogleConnection(userId: string): Promise<CalendarConnectionRow | null> {
  const [row] = await db
    .select()
    .from(calendarConnections)
    .where(and(eq(calendarConnections.userId, userId), eq(calendarConnections.provider, "google")))
    .limit(1);
  return row ?? null;
}

export async function upsertGoogleConnection(
  userId: string,
  accountEmail: string,
  tokens: GoogleOAuthTokens
): Promise<CalendarConnectionRow> {
  const now = new Date();
  const values = {
    userId,
    provider: "google" as const,
    accountEmail,
    refreshTokenEnc: encryptToken(tokens.refreshToken),
    accessTokenEnc: encryptToken(tokens.accessToken),
    tokenExpiresAt: tokens.expiryDate,
    status: "active" as const,
    lastError: null,
    syncCursor: null,
    updatedAt: now,
  };

  const [row] = await db
    .insert(calendarConnections)
    .values(values)
    .onConflictDoUpdate({
      target: [calendarConnections.userId, calendarConnections.provider],
      set: {
        accountEmail: values.accountEmail,
        refreshTokenEnc: values.refreshTokenEnc,
        accessTokenEnc: values.accessTokenEnc,
        tokenExpiresAt: values.tokenExpiresAt,
        status: values.status,
        lastError: values.lastError,
        syncCursor: values.syncCursor,
        updatedAt: now,
      },
    })
    .returning();

  if (!row) throw new Error("Failed to upsert Google calendar connection.");
  return row;
}

export async function updateGoogleConnectionTokens(
  connectionId: string,
  tokens: GoogleOAuthTokens
): Promise<void> {
  await db
    .update(calendarConnections)
    .set({
      refreshTokenEnc: encryptToken(tokens.refreshToken),
      accessTokenEnc: encryptToken(tokens.accessToken),
      tokenExpiresAt: tokens.expiryDate,
      updatedAt: new Date(),
    })
    .where(eq(calendarConnections.id, connectionId));
}

export async function markGoogleConnectionError(
  connectionId: string,
  message: string
): Promise<void> {
  await db
    .update(calendarConnections)
    .set({
      status: "error",
      lastError: message,
      updatedAt: new Date(),
    })
    .where(eq(calendarConnections.id, connectionId));
}

export async function deleteGoogleConnection(
  userId: string
): Promise<CalendarConnectionRow | null> {
  const connection = await getGoogleConnection(userId);
  if (!connection) return null;

  await db
    .delete(calendarConnections)
    .where(and(eq(calendarConnections.userId, userId), eq(calendarConnections.provider, "google")));

  return connection;
}

export function getDecryptedAccessToken(connection: CalendarConnectionRow): string {
  if (!connection.accessTokenEnc) {
    throw new Error("Calendar connection is missing an access token.");
  }
  return decryptToken(connection.accessTokenEnc);
}

export function getDecryptedRefreshToken(connection: CalendarConnectionRow): string {
  return decryptToken(connection.refreshTokenEnc);
}

const TOKEN_REFRESH_BUFFER_MS = 60_000;

export async function ensureFreshGoogleAccessToken(
  connection: CalendarConnectionRow
): Promise<{ accessToken: string; connection: CalendarConnectionRow }> {
  const expiresAt = connection.tokenExpiresAt?.getTime() ?? 0;
  const stillValid = expiresAt - Date.now() > TOKEN_REFRESH_BUFFER_MS;

  if (stillValid && connection.accessTokenEnc) {
    return { accessToken: getDecryptedAccessToken(connection), connection };
  }

  const refreshed = await refreshGoogleAccessToken(getDecryptedRefreshToken(connection));
  await updateGoogleConnectionTokens(connection.id, refreshed);

  const [updated] = await db
    .select()
    .from(calendarConnections)
    .where(eq(calendarConnections.id, connection.id))
    .limit(1);

  if (!updated) throw new Error("Failed to reload calendar connection after token refresh.");

  return { accessToken: refreshed.accessToken, connection: updated };
}
