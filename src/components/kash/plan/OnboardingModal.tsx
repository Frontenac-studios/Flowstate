"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { COMPOSER_DRAFT_KEYS } from "@/lib/composer/composer-draft-constants";
import {
  formatHoldSlotLabel,
  type HandoffPlanTask,
} from "@/lib/morning-handoff/handoff-task-filters";
import type { StagedCapture } from "@/lib/morning-handoff/staged-capture";
import { MAX_CATEGORY_LABEL_LENGTH } from "@/lib/projects/category-settings";
import type { ProjectCategory } from "@/lib/projects/categories";
import { categoryFillVar, categorySolidVar, categoryTextVar } from "@/lib/projects/category-tokens";
import { cn } from "@/lib/cn";

import Button from "@/components/kash/ui/Button";
import Input from "@/components/kash/ui/Input";
import { RitualSheet } from "@/components/kash/ui/RitualSheet";

import { MorningHandoffModal } from "./MorningHandoffModal";
import { QuickInput, type QuickInputHandle } from "./QuickInput";

export type OnboardingStep = "capture" | "pin" | "hold" | "categories" | "handoff";

type CategoryRow = {
  category: ProjectCategory;
  label: string;
};

type HoldPreview = {
  startMin: number;
  endMin: number;
  category: ProjectCategory;
};

type Props = {
  localDate: string;
  step: OnboardingStep;
  tasks: HandoffPlanTask[];
  pinnedBySlot: Map<number, HandoffPlanTask & { top3Order: number }>;
  categories: CategoryRow[];
  holdPreview: HoldPreview | null;
  holdDeclined: boolean;
  isPending: boolean;
  onTaskCreated: () => void;
  onPin: (taskId: string) => void;
  onConfirmHold: () => void;
  onDeclineHold: () => void;
  onSaveCategoryLabel: (category: ProjectCategory, label: string) => void;
  onContinue: () => void;
  onSkipHold: () => void;
  onFinish: () => void;
};

const MIN_CAPTURE_TASKS = 2;

// Onboarding's handoff preview never has staged captures of its own — stable
// empty refs so the memoized cart in MorningHandoffModal doesn't churn.
const EMPTY_STAGED_CAPTURES: StagedCapture[] = [];
const EMPTY_STAGED_PINNED_BY_SLOT = new Map<number, string>();

function StepDots({ step }: { step: OnboardingStep }) {
  const order: OnboardingStep[] = ["capture", "pin", "hold", "categories", "handoff"];
  const active = order.indexOf(step);
  return (
    <div className="flex items-center gap-1.5" aria-hidden>
      {order.map((id, i) => (
        <span
          key={id}
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            i <= active ? "bg-accent" : "bg-[var(--border)]"
          )}
        />
      ))}
    </div>
  );
}

export function OnboardingModal({
  localDate,
  step,
  tasks,
  pinnedBySlot,
  categories,
  holdPreview,
  holdDeclined,
  isPending,
  onTaskCreated,
  onPin,
  onConfirmHold,
  onDeclineHold,
  onSaveCategoryLabel,
  onContinue,
  onSkipHold,
  onFinish,
}: Props) {
  const quickInputRef = useRef<QuickInputHandle>(null);
  const [pendingCaptureLines, setPendingCaptureLines] = useState(0);

  /** Onboarding counts any captured task — not only those on today's list (e.g. "tomorrow"). */
  const capturedTasks = useMemo(() => tasks.filter((t) => t.bucketOverride !== "later"), [tasks]);
  const captureCount = capturedTasks.length;
  const effectiveCaptureCount = captureCount + pendingCaptureLines;
  const pinnedTask = pinnedBySlot.get(1) ?? null;

  const handleCaptureContinue = async () => {
    const created = await quickInputRef.current?.submitDraft();
    const total = captureCount + (created ?? 0);
    if (total < MIN_CAPTURE_TASKS) return;
    onContinue();
  };

  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(categories.map((c) => [c.category, c.label]))
  );

  useEffect(() => {
    setDrafts(Object.fromEntries(categories.map((c) => [c.category, c.label])));
  }, [categories]);

  if (step === "handoff") {
    return (
      <MorningHandoffModal
        localDate={localDate}
        opener={null}
        tasks={tasks}
        projects={[]}
        pinnedBySlot={pinnedBySlot}
        stagedPinnedBySlot={EMPTY_STAGED_PINNED_BY_SLOT}
        stagedCaptures={EMPTY_STAGED_CAPTURES}
        holdPreview={holdDeclined ? null : holdPreview}
        holdDeclined={holdDeclined}
        isOverCommitted={false}
        goalOffer={null}
        isPending={isPending}
        previewBanner="Tomorrow morning opens on this ritual — you're already familiar."
        beginLabel="Start today"
        openerAcknowledged
        captureCommitMode="apply"
        onAcknowledgeOpener={() => undefined}
        onKeepCarryover={() => undefined}
        onDropCarryover={() => undefined}
        onConfirmRecurring={() => undefined}
        onSkipRecurring={() => undefined}
        onConfirmProjectTask={() => undefined}
        onDeferProjectTask={() => undefined}
        onPullProjectTask={() => undefined}
        onAcceptGoalOffer={() => undefined}
        onDismissGoalOffer={() => undefined}
        onPinTop3={() => undefined}
        onUnpinTop3={() => undefined}
        onPinStagedTop3={() => undefined}
        onUnpinStagedTop3={() => undefined}
        onRemoveStaged={() => undefined}
        onRemoveFromToday={() => undefined}
        onStageTasks={() => undefined}
        onTasksChanged={onTaskCreated}
        onConfirmHold={onConfirmHold}
        onDeclineHold={onDeclineHold}
        onSkip={onFinish}
        onBegin={onFinish}
      />
    );
  }

  const title =
    step === "capture"
      ? "Capture a few real tasks"
      : step === "pin"
        ? "Pin today's #1"
        : step === "hold"
          ? "Hold time for #1?"
          : "Confirm your categories";

  const footer =
    step === "capture" ? (
      <Button
        type="button"
        className="text-body"
        disabled={effectiveCaptureCount < MIN_CAPTURE_TASKS || isPending}
        onClick={() => void handleCaptureContinue()}
      >
        Continue
        {effectiveCaptureCount < MIN_CAPTURE_TASKS
          ? ` (${effectiveCaptureCount}/${MIN_CAPTURE_TASKS})`
          : ""}
      </Button>
    ) : step === "pin" ? (
      <Button
        type="button"
        className="text-body"
        disabled={!pinnedTask || isPending}
        onClick={onContinue}
      >
        Continue
      </Button>
    ) : step === "hold" ? (
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" className="text-body" onClick={onSkipHold}>
          Skip hold
        </Button>
        <Button
          type="button"
          className="text-body"
          disabled={!holdPreview || isPending}
          onClick={() => {
            onConfirmHold();
            onContinue();
          }}
        >
          Place hold
        </Button>
      </div>
    ) : (
      <Button type="button" className="text-body" disabled={isPending} onClick={onContinue}>
        Continue
      </Button>
    );

  return (
    <RitualSheet open title={title} dismissOnBackdrop={false} footer={footer}>
      <div className="space-y-[var(--space-5)]">
        <div className="flex items-center justify-between gap-3">
          <StepDots step={step} />
          <p className="text-caption text-ink-muted">First-run setup</p>
        </div>

        {step === "capture" ? (
          <div className="space-y-[var(--space-4)]">
            <p className="text-body text-ink-muted">
              Type 2–3 things you actually need to do. Property chips light up as you type — try{" "}
              <span className="font-medium text-ink">tomorrow</span>,{" "}
              <span className="font-medium text-ink">!!</span>, or a category.
            </p>
            <QuickInput
              ref={quickInputRef}
              draftStorageKey={COMPOSER_DRAFT_KEYS.planDay}
              onTaskCreated={onTaskCreated}
              onPendingValidLinesChange={setPendingCaptureLines}
            />
            {captureCount > 0 ? (
              <ul className="space-y-1.5" aria-label="Captured tasks">
                {capturedTasks.map((task) => (
                  <li
                    key={task.id}
                    className="flex items-center gap-2 rounded-row border border-subtle px-3 py-2"
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          task.category && !task.categoryUnresolved
                            ? categorySolidVar(task.category)
                            : "var(--ink-faint)",
                      }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 break-words text-body text-ink">
                      {task.title}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {step === "pin" ? (
          <div className="space-y-[var(--space-4)]">
            <p className="text-body text-ink-muted">
              Tap the star on the one thing that matters most today. It lands in Top 3 as priority
              #1.
            </p>
            <ul className="space-y-1.5">
              {capturedTasks.map((task) => {
                const isPinned = pinnedTask?.id === task.id;
                return (
                  <li key={task.id}>
                    <button
                      type="button"
                      onClick={() => onPin(task.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-row border px-3 py-2 text-left transition",
                        isPinned
                          ? "border-accent bg-[var(--accent-soft)]"
                          : "border-subtle hover:border-ink-muted"
                      )}
                      aria-pressed={isPinned}
                    >
                      <span
                        className="shrink-0 text-body"
                        style={{ color: isPinned ? "var(--accent)" : "var(--ink-faint)" }}
                        aria-hidden
                      >
                        {isPinned ? "★" : "☆"}
                      </span>
                      <span className="min-w-0 flex-1 break-words text-body text-ink">
                        {task.title}
                      </span>
                      {isPinned ? (
                        <span className="shrink-0 text-caption text-ink-muted">① today</span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {step === "hold" ? (
          <div className="space-y-[var(--space-4)]">
            <p className="text-body text-ink-muted">
              Optionally reserve 45 minutes on the timeline for{" "}
              <span className="font-medium text-ink">{pinnedTask?.title ?? "priority #1"}</span>.
              You can skip this.
            </p>
            {holdPreview ? (
              <div
                className="rounded-row border border-dashed px-3 py-3"
                style={{
                  borderColor: categorySolidVar(holdPreview.category),
                  backgroundColor: categoryFillVar(holdPreview.category),
                }}
              >
                <p
                  className="text-body font-medium"
                  style={{ color: categoryTextVar(holdPreview.category) }}
                >
                  45-minute hold
                </p>
                <p
                  className="mt-1 text-caption"
                  style={{ color: categoryTextVar(holdPreview.category) }}
                >
                  {formatHoldSlotLabel(holdPreview.startMin, holdPreview.endMin)}
                </p>
              </div>
            ) : (
              <p className="text-caption text-ink-muted">
                No open slot right now — skip and keep going.
              </p>
            )}
          </div>
        ) : null}

        {step === "categories" ? (
          <div className="space-y-[var(--space-4)]">
            <p className="text-body text-ink-muted">
              These five life areas color your day. Rename any that don&apos;t fit — colors stay
              with the theme.
            </p>
            <ul className="space-y-2">
              {categories.map((cat) => (
                <li
                  key={cat.category}
                  className="flex items-center gap-3 rounded-row border border-subtle px-3 py-2"
                >
                  <span
                    className="h-4 w-4 shrink-0 rounded-full"
                    style={{ backgroundColor: categorySolidVar(cat.category) }}
                    aria-hidden
                  />
                  <Input
                    className="flex-1"
                    value={drafts[cat.category] ?? ""}
                    maxLength={MAX_CATEGORY_LABEL_LENGTH}
                    aria-label={`Label for ${cat.label}`}
                    onChange={(e) => setDrafts((d) => ({ ...d, [cat.category]: e.target.value }))}
                    onBlur={() => {
                      const next = (drafts[cat.category] ?? "").trim();
                      if (next && next !== cat.label) {
                        onSaveCategoryLabel(cat.category, next);
                      }
                    }}
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </RitualSheet>
  );
}
