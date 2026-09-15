"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/**
 * `?focus=<id>` — a search result (⌘K, the capture panel) pointing at one row.
 * Returns the id and a `clearFocus` that drops only that param once the surface
 * has shown the row, so a reload or back-navigation doesn't replay the pulse.
 */
export function useFocusParam(): { focusId: string | null; clearFocus: () => void } {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const clearFocus = useCallback(() => {
    const next = new URLSearchParams(window.location.search);
    next.delete("focus");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [router, pathname]);

  return { focusId: searchParams.get("focus"), clearFocus };
}
