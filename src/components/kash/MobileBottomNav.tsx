"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Ellipsis, kashIconProps } from "@/components/kash/ui/icon";
import {
  isNavItemActive,
  NAV_GROUP_DO_NOW,
  NAV_GROUP_REFLECT_PLAN,
  SETTINGS_ITEM,
  type NavItem,
} from "@/components/kash/nav-items";
import { trapTab } from "@/lib/dom/focus-trap";

const TAB_ICON_PROPS = kashIconProps({ tokenSize: "lg" });
const SHEET_ICON_PROPS = kashIconProps({ tokenSize: "lg" });

/** Bottom-bar labels differ from the rail where the rail abbreviates. */
const TAB_LABELS: Record<string, string> = { "/this-week": "This Week" };

const PRIMARY_TABS: NavItem[] = NAV_GROUP_DO_NOW.items;
const MORE_ITEMS: NavItem[] = [...NAV_GROUP_REFLECT_PLAN.items, SETTINGS_ITEM];

const TAB_FOCUS = "focus:outline-none focus-visible:bg-ink focus-visible:text-on-accent";

function MoreSheet({
  titleId,
  pathname,
  onDismiss,
}: {
  titleId: string;
  pathname: string;
  onDismiss: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onDismiss();
        return;
      }
      if (e.key === "Tab") trapTab(e, panelRef.current);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onDismiss]);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-modal flex flex-col justify-end lg:hidden" role="presentation">
      <button
        type="button"
        className="modal-backdrop absolute inset-0 z-0 bg-black/30"
        aria-label="Dismiss"
        onClick={onDismiss}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="mobile-sheet-panel relative z-10 rounded-t-card border-t border-border bg-surface pb-[max(var(--space-4),env(safe-area-inset-bottom))] shadow-overlay focus:outline-none"
      >
        <header className="px-[var(--space-5)] pb-[var(--space-2)] pt-[var(--space-4)]">
          <h2
            id={titleId}
            className="text-meta font-semibold uppercase tracking-wide text-ink-muted"
          >
            More
          </h2>
        </header>
        <nav aria-label="More" className="flex flex-col px-[var(--space-3)]">
          {MORE_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isNavItemActive(item, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onDismiss}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 items-center gap-3 rounded-row px-3 transition ${TAB_FOCUS} ${
                  active
                    ? "bg-[var(--surface-selected)] text-ink"
                    : "text-ink hover:bg-[var(--surface-2)]"
                }`}
              >
                <Icon {...SHEET_ICON_PROPS} aria-hidden />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>,
    document.body
  );
}

/**
 * Mobile-only (below lg) fixed bottom tab bar: the three "Do now" destinations
 * plus a More button opening a bottom sheet with the remaining nav items.
 * Replaces the retired slide-in nav drawer.
 */
export default function MobileBottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  // Portal only after mount so SSR markup matches (document is client-only).
  const [mounted, setMounted] = useState(false);
  const sheetTitleId = useId();

  useEffect(() => setMounted(true), []);

  // Route committed — close the sheet.
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const moreActive = MORE_ITEMS.some((item) => isNavItemActive(item, pathname));

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-sticky border-t border-border bg-surface pb-[max(var(--space-1),env(safe-area-inset-bottom))] lg:hidden"
      >
        <div className="mx-auto flex h-[var(--mobile-nav-height)] max-w-md items-stretch">
          {PRIMARY_TABS.map((item) => {
            const Icon = item.icon;
            const active = isNavItemActive(item, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-control transition ${TAB_FOCUS} ${
                  active ? "text-ink" : "text-ink-muted hover:text-ink"
                }`}
              >
                <span
                  className={`flex h-7 w-12 items-center justify-center rounded-pill ${
                    active ? "bg-[var(--surface-selected)]" : ""
                  }`}
                >
                  <Icon {...TAB_ICON_PROPS} aria-hidden />
                </span>
                <span className="text-micro font-medium leading-none">
                  {TAB_LABELS[item.href] ?? item.label}
                </span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            aria-expanded={moreOpen}
            aria-haspopup="dialog"
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-control transition ${TAB_FOCUS} ${
              moreActive ? "text-ink" : "text-ink-muted hover:text-ink"
            }`}
          >
            <span
              className={`flex h-7 w-12 items-center justify-center rounded-pill ${
                moreActive ? "bg-[var(--surface-selected)]" : ""
              }`}
            >
              <Ellipsis {...TAB_ICON_PROPS} aria-hidden />
            </span>
            <span className="text-micro font-medium leading-none">More</span>
          </button>
        </div>
      </nav>

      {mounted && moreOpen ? (
        <MoreSheet
          titleId={sheetTitleId}
          pathname={pathname}
          onDismiss={() => setMoreOpen(false)}
        />
      ) : null}
    </>
  );
}
