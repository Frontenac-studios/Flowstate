"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

import Button from "@/components/kash/ui/Button";

export default function AppError({
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
    <div className="relative flex min-h-screen items-center justify-center px-6 py-12">
      <div className="relative z-sticky w-full max-w-md rounded-card border border-subtle bg-surface px-8 py-10 text-center shadow-surface">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Something went wrong</h1>
        <p className="mt-3 text-ink-muted">
          An unexpected error interrupted this page. You can try again, or head back to your plan.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={() => reset()}>Try again</Button>
          <Link
            href="/today"
            className="text-accent underline underline-offset-2 transition hover:text-ink"
          >
            Back to plan
          </Link>
        </div>
      </div>
    </div>
  );
}
