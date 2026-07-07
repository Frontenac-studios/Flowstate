"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function AppShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  // Replay the cross-fade on navigation WITHOUT remounting the subtree. Keying
  // this element on `pathname` would tear down and rebuild the entire page tree
  // (state, effects, and live query subscriptions) on every nav — the dominant
  // source of navigation latency. Instead, restart the CSS animation by
  // removing the class, forcing a reflow, then re-adding it.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove("page-cross-fade");
    void el.offsetWidth;
    el.classList.add("page-cross-fade");
  }, [pathname]);

  return (
    <div ref={ref} className="page-cross-fade flex min-h-0 flex-1 flex-col">
      {children}
    </div>
  );
}
