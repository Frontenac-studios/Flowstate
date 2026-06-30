"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { useTRPC } from "@/trpc/client";

import ConstraintsSection from "./ConstraintsSection";
import ProseSection from "./ProseSection";
import ValuesSection from "./ValuesSection";

type SectionId = "values" | "work" | "life" | "constraints";

const CHIPS: { id: SectionId; label: string }[] = [
  { id: "values", label: "Values" },
  { id: "work", label: "Work" },
  { id: "life", label: "Life" },
  { id: "constraints", label: "Constraints" },
];

export default function AboutMeSection() {
  const trpc = useTRPC();
  const { data: bodies } = useQuery(trpc.aboutMe.sections.get.queryOptions());

  const [active, setActive] = useState<SectionId>("values");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const sections = CHIPS.map((c) => root.querySelector(`#about-${c.id}`)).filter(
      (el): el is Element => el != null
    );
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          setActive(visible.target.id.replace("about-", "") as SectionId);
        }
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: [0, 0.5, 1] }
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const jumpTo = (id: SectionId) => {
    containerRef.current
      ?.querySelector(`#about-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div ref={containerRef}>
      <div className="mb-1 text-title font-medium text-ink">About me</div>
      <p className="mb-4 text-meta text-ink-muted">
        The context Kash plans with. You can read, edit, or delete anything here — changes shape
        future suggestions, never your past.
      </p>

      <nav
        aria-label="About me sections"
        className="bg-surface/95 sticky top-0 z-10 -mx-1 mb-5 flex gap-1 px-1 py-2 backdrop-blur"
      >
        {CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => jumpTo(chip.id)}
            aria-current={active === chip.id}
            className={cn(
              "rounded-pill px-3 py-1 text-meta transition",
              active === chip.id ? "bg-active-surface text-ink" : "text-ink-muted hover:text-ink"
            )}
          >
            {chip.label}
          </button>
        ))}
      </nav>

      <div className="space-y-8">
        <ValuesSection />
        <ProseSection
          section="work"
          title="Work"
          body={bodies?.work ?? ""}
          placeholder="Where you work, how you like to work, what you're focusing on…"
        />
        <ProseSection
          section="life"
          title="Life"
          body={bodies?.life ?? ""}
          placeholder="The bigger picture — people, commitments, what matters outside work…"
        />
        <ConstraintsSection />
      </div>
    </div>
  );
}
