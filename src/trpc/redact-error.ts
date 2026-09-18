/**
 * What the client is told when a procedure fails for an unexpected reason.
 *
 * tRPC passes a thrown error's message through to the browser verbatim. That put
 * a raw Drizzle failure — `Failed query: select "org_id", "role" from
 * "org_memberships" … params: <user uuid>` — on screen in Settings, leaking the
 * schema and the caller's id into the UI. Errors we raise deliberately (a
 * `TRPCError` with a specific code) are written for the user and still shown; an
 * INTERNAL_SERVER_ERROR is not, so it is replaced. The real cause keeps going to
 * the server log via `errorLoggingMiddleware`.
 */
export const INTERNAL_ERROR_MESSAGE = "Something went wrong on our end. Try again in a moment.";

export function clientSafeMessage(code: string, message: string): string {
  return code === "INTERNAL_SERVER_ERROR" ? INTERNAL_ERROR_MESSAGE : message;
}
