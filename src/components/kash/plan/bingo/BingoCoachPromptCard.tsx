"use client";

import { useEffect, useState } from "react";

/**
 * Static local list in the Goals-coach register — no AI call, works offline
 * and when the coach is disabled. Rotates deterministically by day of year.
 */
const PROMPTS = [
  "Which goal would feel best to finish this month?",
  "What's one square you could move an inch this week?",
  "Which goal keeps slipping — and what's it waiting on?",
  "If the year ended today, which square would you be proudest of?",
  "What would make the hardest goal here feel ten percent easier?",
  "Which goal is really about someone you care about?",
  "Is there a square that no longer fits the year you want?",
  "What did finishing your last goal teach you about the next one?",
  "Which two goals could share the same small step?",
  "What's the smallest version of your biggest goal?",
  "Which square would future-you thank you for starting now?",
  "What's one goal you could talk about out loud today?",
] as const;

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000);
}

export default function BingoCoachPromptCard() {
  // Set after mount so SSR and client never disagree on the date.
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(dayOfYear(new Date()) % PROMPTS.length);
  }, []);

  return (
    <section className="flex flex-col rounded-card border border-subtle bg-surface p-4 shadow-surface">
      <h3 className="text-caption font-medium text-ink-muted">Goals coach</h3>
      <div className="flex flex-1 items-center py-2">
        <p className="text-body text-ink">{PROMPTS[index]}</p>
      </div>
      <p className="text-caption text-ink-faint">Something to sit with today.</p>
    </section>
  );
}
