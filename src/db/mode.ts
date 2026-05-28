export function isSqliteMode(): boolean {
  return process.env.DATABASE_MODE === "sqlite";
}

export function isDesktopBuild(): boolean {
  return process.env.DESKTOP_BUILD === "1" || process.env.KASH_DESKTOP === "1";
}
