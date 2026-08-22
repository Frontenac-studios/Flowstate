"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";

import { kashIconProps, Pin, Search } from "@/components/kash/ui/icon";
import { ChatToggleButton } from "@/components/kash/chat/ChatToggleButton";
import { FLAGS } from "@/lib/flags";
import { OPEN_PALETTE_EVENT } from "@/components/kash/chrome-events";
import {
  isNavItemActive,
  NAV_GROUPS,
  SETTINGS_ITEM,
  type NavItem,
} from "@/components/kash/nav-items";
import { SyncFooterIndicator } from "@/components/kash/nav/SyncFooterIndicator";
import { formatHeaderDate } from "@/lib/dates/local-day";
import { useDesktopFullscreen } from "@/hooks/useDesktopFullscreen";
import { readNavRailPinned, writeNavRailPinned } from "@/lib/nav/nav-rail-storage";

const NAV_ICON_PROPS = kashIconProps({ tokenSize: "lg" });

const NAV_LINK_FOCUS = "focus:outline-none focus-visible:bg-ink focus-visible:text-on-accent";

function NavLink({
  item,
  active,
  pending,
  expanded,
  onSelect,
}: {
  item: NavItem;
  active: boolean;
  pending: boolean;
  expanded: boolean;
  onSelect?: (href: string) => void;
}) {
  const Icon = item.icon;
  // `pending` highlights the just-clicked item immediately, before the
  // destination commits, so repeated clicks feel acknowledged.
  const highlighted = active || pending;
  return (
    <Link
      href={item.href}
      onClick={() => onSelect?.(item.href)}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      aria-busy={pending || undefined}
      title={item.label}
      className={`flex h-nav-item items-center rounded-control transition ${expanded ? "pr-2" : ""} ${NAV_LINK_FOCUS} ${
        highlighted
          ? "bg-[var(--surface-selected)] text-ink"
          : "text-ink hover:bg-[var(--surface-2)]"
      }`}
    >
      <span
        className={`flex h-nav-item shrink-0 items-center justify-center ${
          expanded ? "w-nav-rail" : "w-full"
        }`}
      >
        <Icon {...NAV_ICON_PROPS} />
      </span>
      {/* Label is always rendered so it can fade in on expand; when collapsed the
          full-width icon span pushes it past the rail's overflow-hidden edge. */}
      <span
        className={`nav-cascade-item whitespace-nowrap text-sm ${
          highlighted ? "font-semibold" : "font-medium"
        }`}
      >
        {item.label}
      </span>
    </Link>
  );
}

function NavSections({
  expanded,
  isActive,
  isPending,
  onSelect,
}: {
  expanded: boolean;
  isActive: (item: NavItem) => boolean;
  isPending: (item: NavItem) => boolean;
  onSelect?: (href: string) => void;
}) {
  return (
    <>
      {NAV_GROUPS.map((group, index) => {
        return (
          <Fragment key={group.label}>
            <div className="px-1 pb-1 pt-2">
              {expanded ? (
                <span className="whitespace-nowrap px-1 text-caption font-semibold uppercase tracking-wide text-ink-muted">
                  {group.label}
                </span>
              ) : index > 0 ? (
                <div className="mx-2 h-px bg-[var(--border-subtle)]" />
              ) : null}
            </div>
            {group.items.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={isActive(item)}
                pending={isPending(item)}
                expanded={expanded}
                onSelect={onSelect}
              />
            ))}
          </Fragment>
        );
      })}
      <div className="mt-auto">
        <SyncFooterIndicator expanded={expanded} />
        <NavLink
          item={SETTINGS_ITEM}
          active={isActive(SETTINGS_ITEM)}
          pending={isPending(SETTINGS_ITEM)}
          expanded={expanded}
          onSelect={onSelect}
        />
      </div>
    </>
  );
}

/**
 * Palette launcher styled as a search control. The command palette IS the
 * search UI, so this is semantically a button, not an input. When the rail is
 * expanded it rests as a square icon and grows into a field-like pill on
 * hover/focus; collapsed it centers like the other rail icons.
 */
function RailSearchButton({ expanded }: { expanded: boolean }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(OPEN_PALETTE_EVENT))}
      aria-label="Search"
      title="Search & commands"
      className={`group flex items-center text-ink-muted transition ${NAV_LINK_FOCUS} ${
        expanded
          ? "h-9 self-start rounded-full border border-transparent hover:border-border hover:bg-surface hover:text-ink"
          : "h-9 w-full justify-center rounded-control hover:bg-[var(--surface-2)] hover:text-ink"
      }`}
    >
      <span className={`flex shrink-0 items-center justify-center ${expanded ? "h-9 w-9" : ""}`}>
        <Search {...kashIconProps({ tokenSize: "md" })} aria-hidden />
      </span>
      {expanded ? (
        <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm opacity-0 transition-all duration-200 group-hover:max-w-[8rem] group-hover:pr-3 group-hover:opacity-100 group-focus-visible:max-w-[8rem] group-focus-visible:pr-3 group-focus-visible:opacity-100">
          Search
        </span>
      ) : null}
    </button>
  );
}

export function LeftNavRail() {
  const pathname = usePathname();
  const router = useRouter();
  const isFullscreen = useDesktopFullscreen();
  const [pinned, setPinned] = useState(false);
  const [peek, setPeek] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  // Tracks the origin route we last warmed from, so we prefetch the rail's
  // destinations at most once per location rather than on every mouse enter.
  const warmedFrom = useRef<string | null>(null);

  useEffect(() => {
    setPinned(readNavRailPinned());
  }, []);

  useEffect(() => {
    // Destination committed — drop the optimistic pending highlight.
    setPendingHref(null);
  }, [pathname]);

  const onSelect = (href: string) => {
    setPendingHref(href);
  };

  // Warm every nav destination when the user reaches for the rail (peek/focus),
  // so the route is already in flight before they click. `router.prefetch` is a
  // no-op in `next dev`, so this only pays off in production builds. Results
  // live in the Router Cache; the ref guard just avoids redundant loops.
  const warmNavRoutes = () => {
    if (warmedFrom.current === pathname) return;
    warmedFrom.current = pathname;
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        if (item.href !== pathname) router.prefetch(item.href);
      }
    }
    if (SETTINGS_ITEM.href !== pathname) router.prefetch(SETTINGS_ITEM.href);
  };

  const expanded = pinned || peek || isFullscreen;
  const railExpanded = pinned || isFullscreen;
  // Hover-peek is the one state where the nav is wider than the space the outer
  // element reserves, so it hangs over the content instead of displacing it.
  // Drives the overlay affordances (shadow/border) and, via `elevated`, the
  // z-index lift below.
  const overlaying = expanded && !railExpanded;

  // The rail keeps overhanging content for the *whole* collapse: when peek ends
  // the nav is still visually wide as its 200ms width transition plays out. z-index
  // is a discrete class swap, so keying the lift on `overlaying` alone drops it to
  // z-sticky at t=0 of that animation, tying the later `.kash-shell-inner` sibling
  // and flashing the still-wide rail behind content. Instead assert the lift when
  // overlaying begins and release it only once the width transition ends (with a
  // fallback timer for reduced-motion, where transitionend never fires).
  const [elevated, setElevated] = useState(false);
  useEffect(() => {
    if (overlaying) {
      setElevated(true);
      return;
    }
    const settle = setTimeout(() => setElevated(false), 260);
    return () => clearTimeout(settle);
  }, [overlaying]);

  const isActive = (item: NavItem) => isNavItemActive(item, pathname);

  const isPending = (item: NavItem) => pendingHref === item.href && !isActive(item);

  const togglePinned = () => {
    setPinned((prev) => {
      const next = !prev;
      writeNavRailPinned(next);
      return next;
    });
  };

  return (
    // The z-index lives here rather than on the <nav> below: this element is
    // positioned *and* z-indexed, so it opens a stacking context the nav can
    // never escape — raising the nav's own z-index has no effect. `.kash-shell-inner`
    // is a later sibling at the same z-sticky, so at a tie it paints over the
    // peeking rail and swallows its clicks. z-overlay clears the content while
    // staying under z-modal/z-toast. `elevated` (not `overlaying`) holds the lift
    // through the collapse animation, so the pinned/fullscreen/collapsed states
    // still settle back to their existing stacking.
    <div
      className={`kash-left-rail sticky top-0 hidden h-screen shrink-0 transition-[width] duration-200 lg:block ${
        elevated ? "z-overlay" : "z-sticky"
      } ${railExpanded ? "w-nav-rail-expanded" : "w-nav-rail"}`}
    >
      <nav
        aria-label="Primary"
        data-expanded={expanded ? "true" : "false"}
        onMouseEnter={() => {
          if (!isFullscreen) {
            setPeek(true);
            warmNavRoutes();
          }
        }}
        onMouseLeave={() => {
          if (!isFullscreen) setPeek(false);
        }}
        onFocus={() => {
          if (!isFullscreen) {
            setPeek(true);
            warmNavRoutes();
          }
        }}
        onBlur={() => {
          if (!isFullscreen) setPeek(false);
        }}
        onTransitionEnd={(e) => {
          // Release the z-lift exactly when the rail's own width transition ends
          // (ignore bubbled child transitions). By now it has finished collapsing,
          // so it no longer overhangs content and can settle back to z-sticky.
          if (e.target === e.currentTarget && e.propertyName === "width" && !overlaying) {
            setElevated(false);
          }
        }}
        className={`absolute inset-y-0 left-0 z-sticky flex flex-col gap-1 overflow-hidden px-2 py-3 transition-[width] duration-200 ${
          expanded ? "w-nav-rail-expanded" : "w-nav-rail"
        } ${
          overlaying
            ? "rounded-r-card border-r border-subtle bg-surface shadow-overlay"
            : "border-r border-subtle bg-surface"
        }`}
      >
        {/* Identity strip doubles as the Tauri drag surface now that the top
              header is gone. Non-interactive children carry the attribute too
              because Tauri only starts a drag when mousedown lands directly on
              an element with data-tauri-drag-region; the pin button stays
              clickable because it never gets the attribute. */}
        <div
          data-tauri-drag-region
          className={`-mx-2 -mt-3 mb-1 flex h-11 items-center pt-3 ${expanded ? "justify-between px-3" : "justify-center"}`}
        >
          {expanded ? (
            <span
              data-tauri-drag-region
              className="select-none whitespace-nowrap text-base font-semibold tracking-tight text-ink"
            >
              Kash{" "}
              <span data-tauri-drag-region className="font-normal text-ink-muted" aria-hidden>
                ·
              </span>{" "}
              {/*
               * The date derives from `new Date()`, so server (request time)
               * and client (hydration time) values can differ — a legitimate
               * time-varying value. suppressHydrationWarning stops the
               * mismatch (React #418) that otherwise fires on every route.
               */}
              <time
                data-tauri-drag-region
                className="font-normal text-ink-muted"
                dateTime={new Date().toISOString().slice(0, 10)}
                suppressHydrationWarning
              >
                {formatHeaderDate()}
              </time>
            </span>
          ) : (
            <span
              data-tauri-drag-region
              className="select-none text-base font-semibold tracking-tight text-ink"
              aria-hidden
            >
              K
            </span>
          )}
          {expanded && !isFullscreen ? (
            <button
              type="button"
              onClick={togglePinned}
              aria-pressed={pinned}
              aria-label={pinned ? "Unpin navigation" : "Pin navigation"}
              title={pinned ? "Unpin navigation" : "Pin navigation"}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-control transition ${NAV_LINK_FOCUS} ${
                pinned
                  ? "bg-[var(--surface-selected)] text-ink"
                  : "text-ink-muted hover:bg-[var(--surface-2)] hover:text-ink"
              }`}
            >
              <Pin {...kashIconProps({ tokenSize: "md" })} />
            </button>
          ) : null}
        </div>

        {/* Header chrome absorbed from the retired AppHeader. */}
        <div className="mb-1 flex flex-col gap-1">
          <RailSearchButton expanded={expanded} />
          {FLAGS.chat ? <ChatToggleButton expanded={expanded} /> : null}
        </div>

        <NavSections
          expanded={expanded}
          isActive={isActive}
          isPending={isPending}
          onSelect={onSelect}
        />
      </nav>
    </div>
  );
}
