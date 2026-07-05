const PROTECTED_PREFIXES = [
  "/today",
  "/plan",
  "/this-week",
  "/projects",
  "/backlog",
  "/abyss",
  "/care",
  "/settings",
  "/health",
] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function isAuthPath(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/login/");
}
