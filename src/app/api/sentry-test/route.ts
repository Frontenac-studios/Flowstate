export const dynamic = "force-dynamic";

export function GET() {
  throw new Error("Sentry test error");
}

export function POST() {
  return GET();
}
