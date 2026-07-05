"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

import Button from "@/components/kash/ui/Button";

export default function HealthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="relative min-h-screen">
      <div className="relative z-sticky mx-auto flex min-h-screen max-w-3xl flex-col items-start gap-6 px-6 py-12">
        <header className="rounded-card border border-subtle bg-surface px-6 py-5">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Health checks</h1>
          <p className="mt-2 text-ink-muted">
            Something went wrong loading the health page. The database may be temporarily
            unreachable.
          </p>
        </header>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => reset()}>Try again</Button>
          <Link
            href="/today"
            className="text-accent underline underline-offset-2 transition hover:text-ink"
          >
            ← Back to plan
          </Link>
        </div>
      </div>
    </div>
  );
}
