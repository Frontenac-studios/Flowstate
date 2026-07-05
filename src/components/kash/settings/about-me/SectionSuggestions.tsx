"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useToast } from "@/components/kash/ui/ToastProvider";
import type { AboutMeSection } from "@/lib/about-me/constants";
import { useTRPC } from "@/trpc/client";

import SuggestionGhost, { type Suggestion } from "./SuggestionGhost";

/**
 * Renders the pending AI-proposed ghosts for one section, inline (§13 V2-2). The
 * §11 producer writes rows via propose_about_me_edit / register hooks.
 */
export default function SectionSuggestions({ section }: { section: AboutMeSection }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: all = [] } = useQuery(trpc.aboutMe.suggestions.list.queryOptions());
  const suggestions = (all as Suggestion[]).filter((s) => s.targetSection === section);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: trpc.aboutMe.suggestions.list.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.aboutMe.values.list.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.aboutMe.sections.get.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.aboutMe.constraints.list.queryKey() });
  };

  const acceptMutation = useMutation(
    trpc.aboutMe.suggestions.accept.mutationOptions({
      onSuccess: invalidate,
      onError: (err) => {
        toast({
          message:
            err.data?.code === "BAD_REQUEST"
              ? "You've reached the limit for this section. Remove one first."
              : "Couldn't accept that suggestion. Please try again.",
          variant: "error",
        });
      },
    })
  );
  const dismissMutation = useMutation(
    trpc.aboutMe.suggestions.dismiss.mutationOptions({
      onSuccess: invalidate,
      onError: () => {
        toast({ message: "Couldn't dismiss that suggestion. Please try again.", variant: "error" });
      },
    })
  );
  const busy = acceptMutation.isPending || dismissMutation.isPending;

  if (suggestions.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {suggestions.map((s) => (
        <SuggestionGhost
          key={s.id}
          suggestion={s}
          busy={busy}
          onAccept={() => acceptMutation.mutate({ id: s.id })}
          onDismiss={() => dismissMutation.mutate({ id: s.id })}
        />
      ))}
    </div>
  );
}
