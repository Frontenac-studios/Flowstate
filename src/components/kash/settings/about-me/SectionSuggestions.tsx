"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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

  const { data: all = [] } = useQuery(trpc.aboutMe.suggestions.list.queryOptions());
  const suggestions = (all as Suggestion[]).filter((s) => s.targetSection === section);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: trpc.aboutMe.suggestions.list.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.aboutMe.values.list.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.aboutMe.sections.get.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.aboutMe.constraints.list.queryKey() });
  };

  const acceptMutation = useMutation(
    trpc.aboutMe.suggestions.accept.mutationOptions({ onSuccess: invalidate })
  );
  const dismissMutation = useMutation(
    trpc.aboutMe.suggestions.dismiss.mutationOptions({ onSuccess: invalidate })
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
