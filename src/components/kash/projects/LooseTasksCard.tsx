"use client";

import Link from "next/link";

export default function LooseTasksCard({ count }: { count: number }) {
  const label = count === 1 ? "1 task" : `${count} tasks`;

  return (
    <Link
      href="/projects/loose"
      className="kash-focus-visible block rounded-card border-2 border-dashed border-subtle bg-surface p-4 shadow-surface outline-none transition hover:bg-surface-2"
    >
      <h3 className="font-medium text-ink">Loose tasks</h3>
      <p className="mt-3 text-caption text-ink-faint">{label} · no project</p>
    </Link>
  );
}
