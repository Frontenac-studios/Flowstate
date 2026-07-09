import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

import { CALENDAR_OAUTH_STATE_TTL_MS } from "@/lib/calendar/constants";

import { getGoogleCalendarEnv } from "./env";

type OAuthStatePayload = {
  userId: string;
  ts: number;
};

function getStateSecret(): string {
  return getGoogleCalendarEnv().CALENDAR_TOKEN_ENCRYPTION_KEY;
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Signed OAuth state binding the Google redirect to a Kash user. */
export function signOAuthState(userId: string): string {
  const payload: OAuthStatePayload = { userId, ts: Date.now() };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", getStateSecret()).update(payloadB64).digest("base64url");
  return `${payloadB64}.${signature}`;
}

export function verifyOAuthState(state: string): string | null {
  const [payloadB64, signature] = state.split(".");
  if (!payloadB64 || !signature) return null;

  const expected = createHmac("sha256", getStateSecret()).update(payloadB64).digest("base64url");
  if (!safeEqual(signature, expected)) return null;

  let payload: OAuthStatePayload;
  try {
    payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8")
    ) as OAuthStatePayload;
  } catch {
    return null;
  }

  if (typeof payload.userId !== "string" || typeof payload.ts !== "number") return null;
  if (Date.now() - payload.ts > CALENDAR_OAUTH_STATE_TTL_MS) return null;
  return payload.userId;
}
