const PROTECTED_PREFIXES = ["/plan", "/projects", "/settings"] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function isAuthPath(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/login/");
}
