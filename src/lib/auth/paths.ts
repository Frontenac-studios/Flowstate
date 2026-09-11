const PROTECTED_PREFIXES = [
  "/today",
  "/plan",
  "/this-week",
  "/projects",
  "/backlog",
  "/settings",
  // W17 — the capture panel is a real app surface in its own window, so an
  // unauthenticated hit has to bounce like any other rather than render a bar
  // that silently drops what you type.
  "/capture",
] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function isAuthPath(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/login/");
}
