"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Button from "@/components/kash/ui/Button";
import { categoryLabel } from "@/lib/projects/categories";
import { useTRPC } from "@/trpc/client";

import ProtectedBlockChip from "./ProtectedBlockChip";

type Props = {
  anchorDate: string;
  /** Execution surface: render the "no default week yet" prompt as a slim expandable hint. */
  compact?: boolean;
};

/**
 * Weekly protected-time ritual (WD4): propose the default week, review proposed
 * blocks, then confirm — never auto-applied.
 */
export default function ProtectedWeekBar({ anchorDate, compact = false }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const weekInput = { anchorDate };

  const { data: blocks = [] } = useQuery(trpc.protectedBlocks.listForWeek.queryOptions(weekInput));
  const { data: templates = [] } = useQuery(trpc.protectedBlocks.listTemplates.queryOptions());

  const proposed = blocks.filter((b) => b.status === "proposed");
  const confirmedFromTemplate = blocks.filter((b) => b.status === "confirmed" && b.templateId);
  const needsRitual =
    templates.length > 0 && proposed.length === 0 && confirmedFromTemplate.length === 0;

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: trpc.protectedBlocks.listForWeek.queryKey(weekInput),
    });
    void queryClient.invalidateQueries({
      queryKey: trpc.protectedBlocks.listForDate.queryKey(),
    });
  };

  const proposeMutation = useMutation(
    trpc.protectedBlocks.proposeFromTemplates.mutationOptions({ onSuccess: invalidate })
  );
  const confirmMutation = useMutation(
    trpc.protectedBlocks.confirmProposedForWeek.mutationOptions({ onSuccess: invalidate })
  );
  const removeMutation = useMutation(
    trpc.protectedBlocks.remove.mutationOptions({ onSuccess: invalidate })
  );

  if (templates.length === 0 && proposed.length === 0) {
    // Execution surface (compact): the header "Default week" button owns setup,
    // so the in-grid bar renders nothing until there's a ritual to propose or
    // confirm. Plan keeps the dashed setup hint.
    if (compact) return null;

    return (
      <div className="mt-4 rounded-card border border-dashed border-subtle bg-surface px-3 py-2 text-sm shadow-surface">
        <p className="text-ink-muted">
          Set up a{" "}
          <Link href="/settings" className="text-accent underline-offset-2 hover:underline">
            default week
          </Link>{" "}
          in Settings to propose protected time each week.
        </p>
      </div>
    );
  }

  if (!needsRitual && proposed.length === 0) return null;

  return (
    <section
      className="mt-4 rounded-card border border-subtle bg-surface px-3 py-3 text-sm shadow-surface"
      aria-label="Protected time planning"
    >
      <header className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h2 className="font-medium text-ink">Protected time</h2>
        {needsRitual ? (
          <span className="text-xs text-ink-muted">Propose your default week for this week</span>
        ) : (
          <span className="text-xs text-ink-muted">Review proposed blocks, then confirm</span>
        )}
      </header>

      {needsRitual ? (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-ink-muted">
            {templates.length} recurring block{templates.length === 1 ? "" : "s"} from your default
            week — adjust in{" "}
            <Link href="/settings" className="text-accent underline-offset-2 hover:underline">
              Settings
            </Link>
            .
          </p>
          <ul className="space-y-0.5 text-xs text-ink-muted" aria-label="Default week preview">
            {templates.map((t) => (
              <li key={t.id}>
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][t.isoWeekday]} ·{" "}
                {t.label?.trim() || categoryLabel(t.category)}
              </li>
            ))}
          </ul>
          <Button
            type="button"
            className="text-xs"
            disabled={proposeMutation.isPending}
            onClick={() => proposeMutation.mutate(weekInput)}
          >
            Propose for this week
          </Button>
        </div>
      ) : null}

      {proposed.length > 0 ? (
        <div className="mt-2 space-y-2">
          <ul className="space-y-1.5" aria-label="Proposed protected blocks">
            {proposed.map((block) => (
              <ProtectedBlockChip
                key={block.id}
                block={block}
                animatePlace
                onRemove={(id) => removeMutation.mutate({ id })}
              />
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className="text-xs"
              disabled={confirmMutation.isPending}
              onClick={() => confirmMutation.mutate(weekInput)}
            >
              Confirm week
            </Button>
            <span className="text-xs text-ink-muted">
              Remove any block you don&apos;t want before confirming.
            </span>
          </div>
        </div>
      ) : null}
    </section>
  );
}
