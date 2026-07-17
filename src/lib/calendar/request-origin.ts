/** Resolve the browser-facing origin for OAuth redirects (desktop uses 127.0.0.1). */
export function requestOriginFromHeaders(req: Request): string {
  const url = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) {
    const protoHeader = req.headers.get("x-forwarded-proto");
    const proto = protoHeader?.split(",")[0]?.trim() || url.protocol.replace(":", "") || "http";
    return `${proto}://${host}`;
  }
  return url.origin;
}
