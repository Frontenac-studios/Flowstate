"use client";

import { useEffect, useState } from "react";

function renderNarrationText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

type Props = {
  text: string | null;
  loading?: boolean;
};

export function TypedNarration({ text, loading }: Props) {
  const [visibleLength, setVisibleLength] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const onChange = () => setPrefersReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!text) {
      setVisibleLength(0);
      return;
    }

    if (prefersReducedMotion) {
      setVisibleLength(text.length);
      return;
    }

    setVisibleLength(0);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setVisibleLength(i);
      if (i >= text.length) clearInterval(id);
    }, 32);

    return () => clearInterval(id);
  }, [text, prefersReducedMotion]);

  if (loading) {
    return (
      <p className="mt-5 text-sm text-kash-ink-muted" aria-live="polite">
        Choosing…
      </p>
    );
  }

  if (!text) return null;

  const displayed = text.slice(0, visibleLength);
  const typing = visibleLength < text.length && !prefersReducedMotion;

  return (
    <p className="mt-5 text-sm text-kash-ink-muted" aria-live="polite">
      {renderNarrationText(displayed)}
      {typing ? <span className="ml-0.5 inline-block animate-pulse">▍</span> : null}
    </p>
  );
}
