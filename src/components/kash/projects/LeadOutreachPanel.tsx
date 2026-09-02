"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Button from "@/components/kash/ui/Button";
import Textarea from "@/components/kash/ui/Textarea";
import { useOptionalToast } from "@/components/kash/ui/ToastProvider";
import { buildMailto } from "@/lib/sourcing/outreach";
import { useTRPC } from "@/trpc/client";

/**
 * The outreach drafts for one lead (W10e): opener + aging-clock follow-ups. Draft /
 * regenerate calls the model; each message is editable in place, then copy or
 * open-in-mail and mark-sent — Flowstate drafts, you send (Law 1).
 */
export default function LeadOutreachPanel({ leadId }: { leadId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const toast = useOptionalToast();

  const { data: messages = [], isLoading } = useQuery(
    trpc.sourcing.listOutreach.queryOptions({ leadId })
  );
  const invalidate = () => queryClient.invalidateQueries(trpc.sourcing.listOutreach.pathFilter());

  const draft = useMutation(
    trpc.sourcing.draftOutreach.mutationOptions({
      onSuccess: invalidate,
      onError: (e) => toast?.toast({ message: e.message, variant: "error" }),
    })
  );
  const updateBody = useMutation(
    trpc.sourcing.updateOutreachBody.mutationOptions({
      onSuccess: invalidate,
      onError: (e) => toast?.toast({ message: e.message, variant: "error" }),
    })
  );
  const markSent = useMutation(
    trpc.sourcing.markOutreachSent.mutationOptions({
      onSuccess: () => {
        void invalidate();
        void queryClient.invalidateQueries(trpc.sourcing.listLeads.pathFilter());
      },
      onError: (e) => toast?.toast({ message: e.message, variant: "error" }),
    })
  );

  async function copy(body: string) {
    try {
      await navigator.clipboard.writeText(body);
      toast?.toast({ message: "Copied to clipboard." });
    } catch {
      toast?.toast({ message: "Couldn't copy — select and copy manually.", variant: "error" });
    }
  }

  function label(kind: string, followUpIndex: number) {
    return kind === "opener" ? "Opener" : `Follow-up ${followUpIndex}`;
  }

  const hasDrafts = messages.length > 0;
  let followUp = 0;

  return (
    <div className="flex flex-col gap-3 border-t border-subtle pt-3">
      <div className="flex items-center justify-between">
        <span className="text-caption font-medium text-ink-muted">Outreach</span>
        <Button
          type="button"
          variant="ghost"
          onClick={() => draft.mutate({ leadId })}
          disabled={draft.isPending}
          className="text-sm"
        >
          {draft.isPending ? "Drafting…" : hasDrafts ? "Regenerate" : "Draft outreach"}
        </Button>
      </div>

      {isLoading ? null : !hasDrafts ? (
        <p className="text-caption text-ink-muted">
          No drafts yet. Draft an opener and follow-ups mirrored to your voice — you edit and send.
        </p>
      ) : (
        messages.map((m) => {
          const isFollowUp = m.kind === "follow_up";
          if (isFollowUp) followUp += 1;
          const sent = m.status === "sent";
          return (
            <div key={m.id} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-caption font-medium text-ink">{label(m.kind, followUp)}</span>
                {sent ? (
                  <span className="rounded-pill bg-surface-2 px-2 py-0.5 text-caption text-ink-muted">
                    sent
                  </span>
                ) : null}
              </div>
              <Textarea
                defaultValue={m.body}
                aria-label={`${label(m.kind, followUp)} draft`}
                className="text-sm"
                onBlur={(e) => {
                  const next = e.target.value.trim();
                  if (next && next !== m.body) updateBody.mutate({ id: m.id, body: next });
                }}
              />
              <div className="flex items-center gap-3 text-caption">
                <button
                  type="button"
                  onClick={() => copy(m.body)}
                  className="text-ink-muted transition hover:text-ink"
                >
                  Copy
                </button>
                <a href={buildMailto(m.body)} className="text-ink-muted transition hover:text-ink">
                  Open in mail
                </a>
                {sent ? null : (
                  <button
                    type="button"
                    onClick={() => markSent.mutate({ id: m.id })}
                    disabled={markSent.isPending}
                    className="text-ink-muted transition hover:text-ink"
                  >
                    Mark sent
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
