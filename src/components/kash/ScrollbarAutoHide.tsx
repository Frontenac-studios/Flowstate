"use client";

import { useEffect } from "react";

const HIDE_DELAY_MS = 800;

/**
 * Stamps data-scrolling="true" on whichever element is actively scrolling and
 * clears it shortly after the last scroll event. globals.css keys the scrollbar
 * thumb alpha off this attribute, so scrollbars only appear mid-scroll. Scroll
 * events don't bubble, but a capture-phase listener on window sees every
 * scrollable element — including the document itself (mapped to <html>, which
 * owns the page scrollbar styling).
 */
export function ScrollbarAutoHide() {
  useEffect(() => {
    const timers = new Map<Element, ReturnType<typeof setTimeout>>();

    const onScroll = (event: Event) => {
      const target = event.target === document ? document.documentElement : event.target;
      if (!(target instanceof Element)) return;
      target.setAttribute("data-scrolling", "true");
      const pending = timers.get(target);
      if (pending) clearTimeout(pending);
      timers.set(
        target,
        setTimeout(() => {
          target.removeAttribute("data-scrolling");
          timers.delete(target);
        }, HIDE_DELAY_MS)
      );
    };

    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll, { capture: true });
      timers.forEach((timer, element) => {
        clearTimeout(timer);
        element.removeAttribute("data-scrolling");
      });
    };
  }, []);

  return null;
}
