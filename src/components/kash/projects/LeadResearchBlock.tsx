"use client";

import type { CompanyFacts } from "@/lib/sourcing/research";

/**
 * What the web said about a company (W10h), shown on the triage card beneath the
 * score. Two things it must do that a summary alone wouldn't:
 *
 *  - **Name what could not be confirmed.** Those are the same gaps that held the
 *    score's confidence down, so seeing them next to the number explains it.
 *  - **Show its sources.** A score formed from research you can't audit is a score
 *    you have to take on faith, which is the opposite of the point.
 */
export default function LeadResearchBlock({
  facts,
  researchedAt,
}: {
  facts: CompanyFacts;
  researchedAt: Date | string | null;
}) {
  const when = researchedAt ? new Date(researchedAt) : null;

  return (
    <div className="flex flex-col gap-1.5 border-t border-subtle pt-2">
      <div className="flex items-baseline gap-2">
        <span className="text-caption font-medium text-ink-muted">Research</span>
        {when ? (
          <span className="text-caption text-ink-faint">
            {when.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        ) : null}
      </div>

      <p className="text-caption text-ink">{facts.summary}</p>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-caption text-ink-muted">
        {facts.industry ? <span>{facts.industry}</span> : null}
        {facts.sizeBand ? <span>{facts.sizeBand}</span> : null}
        {facts.location ? <span>{facts.location}</span> : null}
      </div>

      {facts.signals.length ? (
        <p className="text-caption text-ink-muted">Signals: {facts.signals.join(" · ")}</p>
      ) : null}

      {facts.techStack.length ? (
        <p className="text-caption text-ink-muted">Builds: {facts.techStack.join(", ")}</p>
      ) : null}

      {facts.unverified.length ? (
        <p className="text-caption text-ink-faint">Unconfirmed: {facts.unverified.join("; ")}</p>
      ) : null}

      {facts.sources.length ? (
        <div className="flex flex-wrap gap-x-2 gap-y-1">
          {facts.sources.map((source) => (
            <a
              key={source.url}
              href={source.url}
              target="_blank"
              rel="noreferrer noopener"
              className="text-caption text-ink-faint underline-offset-2 hover:text-ink hover:underline"
            >
              {source.title || new URL(source.url).hostname}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
