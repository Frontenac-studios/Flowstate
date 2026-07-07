import { readFileSync } from "node:fs";
import path from "node:path";

import { isSqliteMode } from "@/db/mode";

export const dynamic = "force-dynamic";

/**
 * Next.js build id, read once at module load. The desktop shell compares this
 * against the build id baked into the bundled sidecar so it never attaches to a
 * stale or foreign sidecar squatting on the shared port (see apps/desktop
 * src-tauri/src/lib.rs). Best-effort: `null` when the file isn't present (e.g.
 * during dev, where the shell doesn't gate on it).
 */
const BUILD_ID: string | null = (() => {
  try {
    return readFileSync(path.join(process.cwd(), ".next/BUILD_ID"), "utf8").trim();
  } catch {
    return null;
  }
})();

export async function GET() {
  return Response.json({
    ok: true,
    mode: isSqliteMode() ? "sqlite" : "postgres",
    desktop: process.env.KASH_DESKTOP === "1",
    build: BUILD_ID,
    timestamp: new Date().toISOString(),
  });
}
