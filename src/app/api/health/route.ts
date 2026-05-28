import { isSqliteMode } from "@/db/mode";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    mode: isSqliteMode() ? "sqlite" : "postgres",
    desktop: process.env.KASH_DESKTOP === "1",
    timestamp: new Date().toISOString(),
  });
}
