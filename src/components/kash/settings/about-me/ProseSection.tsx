"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import Textarea from "@/components/kash/ui/Textarea";
import { SECTION_BODY_MAX } from "@/lib/about-me/constants";
import { useTRPC } from "@/trpc/client";

type ProseSectionId = "work" | "life";

const SAVE_DEBOUNCE_MS = 800;

export default function ProseSection({
  section,
  title,
  body,
  placeholder,
}: {
  section: ProseSectionId;
  title: string;
  body: string;
  placeholder: string;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState(body);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedBody = useRef(body);

  // Reseed from the server when it loads/changes, but only if the user hasn't typed
  // ahead of what's saved (avoids clobbering an in-flight edit).
  useEffect(() => {
    if (draft === savedBody.current) {
      setDraft(body);
    }
    savedBody.current = body;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body]);

  const updateMutation = useMutation(
    trpc.aboutMe.sections.updateBody.mutationOptions({
      onSuccess: (res) => {
        savedBody.current = res.body;
        setStatus("saved");
        void queryClient.invalidateQueries({ queryKey: trpc.aboutMe.sections.get.queryKey() });
      },
    })
  );

  const save = (next: string) => {
    if (next === savedBody.current) {
      setStatus("idle");
      return;
    }
    setStatus("saving");
    updateMutation.mutate({ section, body: next });
  };

  const onChange = (next: string) => {
    setDraft(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(next), SAVE_DEBOUNCE_MS);
  };

  const onBlur = () => {
    if (timer.current) clearTimeout(timer.current);
    save(draft);
  };

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  return (
    <section id={`about-${section}`} className="scroll-mt-24">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-subtitle font-medium text-ink">{title}</h3>
        <span className="text-caption text-ink-faint" aria-live="polite">
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : ""}
        </span>
      </div>
      <Textarea
        value={draft}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        maxLength={SECTION_BODY_MAX}
        placeholder={placeholder}
        aria-label={`${title} — about you`}
        className="min-h-24 w-full text-body leading-relaxed"
      />
    </section>
  );
}
