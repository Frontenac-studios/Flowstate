import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-6 py-12">
      <div className="relative z-sticky w-full max-w-md rounded-card border border-subtle bg-surface px-8 py-10 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-ink-muted">404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Page not found</h1>
        <p className="mt-3 text-ink-muted">
          We couldn&apos;t find what you were looking for. It may have been moved or removed.
        </p>
        <div className="mt-6 flex justify-center">
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
