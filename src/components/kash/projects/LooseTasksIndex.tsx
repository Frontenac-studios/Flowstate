"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { QueryErrorNotice } from "@/components/kash/ui/QueryErrorNotice";
import Button from "@/components/kash/ui/Button";
import { categoryFillVar, categorySolidVar, categoryTextVar } from "@/lib/projects/category-tokens";
import { PROJECT_CATEGORIES, categoryLabel, type ProjectCategory } from "@/lib/projects/categories";
import { createCaptureContext } from "@/lib/chat/capture-context";
import { useTRPC } from "@/trpc/client";

import { useChat } from "../chat/ChatProvider";
import LooseTaskRow from "./LooseTaskRow";

type CategoryFilter = ProjectCategory | "all";

export default function LooseTasksIndex() {
  const trpc = useTRPC();
  const { openRail } = useChat();
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  const categoryInput = categoryFilter === "all" ? undefined : categoryFilter;

  const {
    data: tasks = [],
    isLoading,
    isError,
    refetch,
  } = useQuery(
    trpc.projects.listLooseTasks.queryOptions(
      categoryInput ? { category: categoryInput } : undefined
    )
  );
  const { data: projects = [] } = useQuery(trpc.projects.list.queryOptions());

  const projectOptions = useMemo(
    () =>
      projects.map((project) => ({
        id: project.id,
        name: project.name,
        category: project.category,
      })),
    [projects]
  );

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <Link href="/projects" className="text-sm text-ink-muted transition hover:text-ink">
            ← Projects
          </Link>
          <h1 className="text-xl font-semibold text-ink">Loose tasks</h1>
          <p className="text-sm text-ink-muted">
            Tasks without a project — assign or recategorize.
          </p>
        </div>
        <Button
          type="button"
          onClick={() =>
            openRail({
              captureContext: createCaptureContext({
                surface: "loose-tasks",
                defaultBucket: "inbox",
                category: categoryFilter === "all" ? undefined : categoryFilter,
              }),
            })
          }
        >
          + Ask chat
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip
          label="All"
          selected={categoryFilter === "all"}
          onClick={() => setCategoryFilter("all")}
        />
        {PROJECT_CATEGORIES.map((category) => (
          <FilterChip
            key={category}
            label={categoryLabel(category)}
            selected={categoryFilter === category}
            category={category}
            onClick={() => setCategoryFilter(category)}
          />
        ))}
      </div>

      {isError ? (
        <QueryErrorNotice message="Loose tasks didn't load." onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading loose tasks">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-20 animate-pulse rounded-card border border-subtle bg-surface-2"
            />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <p className="rounded-card border border-dashed border-subtle px-4 py-8 text-center text-sm text-ink-muted">
          No loose tasks
          {categoryFilter === "all" ? "" : ` in ${categoryLabel(categoryFilter).toLowerCase()}`}.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {tasks.map((task) => (
            <LooseTaskRow key={task.id} task={task} projects={projectOptions} />
          ))}
        </div>
      )}
    </section>
  );
}

function FilterChip({
  label,
  selected,
  category,
  onClick,
}: {
  label: string;
  selected: boolean;
  category?: ProjectCategory;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="flex items-center gap-1.5 rounded-chip border px-3 py-1 text-sm font-medium transition focus:outline-none focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)]"
      style={
        selected && category
          ? {
              backgroundColor: categoryFillVar(category),
              color: categoryTextVar(category),
              borderColor: "transparent",
            }
          : selected
            ? {
                backgroundColor: "var(--surface-2)",
                color: "var(--ink)",
                borderColor: "var(--ink)",
              }
            : {
                borderColor: "var(--border)",
                color: "var(--ink-muted)",
              }
      }
    >
      {category ? (
        <span
          className="h-2 w-2 rounded-full"
          style={{
            backgroundColor: categorySolidVar(category),
            boxShadow: "0 0 0 1px var(--mark-ring)",
          }}
          aria-hidden
        />
      ) : null}
      {label}
    </button>
  );
}
