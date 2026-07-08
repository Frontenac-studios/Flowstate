"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useState, type CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";

import {
  Calendar,
  Compass,
  Folder,
  GalleryVerticalEnd,
  kashIconProps,
  Pin,
  SlidersHorizontal,
  Sprout,
  Sun,
} from "@/components/kash/ui/icon";
import IconButton from "@/components/kash/ui/IconButton";
import { SyncFooterIndicator } from "@/components/kash/nav/SyncFooterIndicator";
import { useDesktopFullscreen } from "@/hooks/useDesktopFullscreen";
import { readNavRailPinned, writeNavRailPinned } from "@/lib/nav/nav-rail-storage";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  match: string[];
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const NAV_ICON_PROPS = kashIconProps({ tokenSize: "lg" });

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Do now",
    items: [
      { href: "/today", label: "Today", icon: Sun, match: ["/today"] },
      { href: "/this-week", label: "Week", icon: Calendar, match: ["/this-week"] },
      { href: "/projects", label: "Projects", icon: Folder, match: ["/projects"] },
    ],
  },
  {
    label: "Reflect & plan",
    items: [
      { href: "/plan", label: "Plan", icon: Compass, match: ["/plan"] },
      { href: "/backlog", label: "Backlog", icon: GalleryVerticalEnd, match: ["/backlog"] },
      { href: "/care", label: "Care", icon: Sprout, match: ["/care"] },
    ],
  },
];

const SETTINGS_ITEM: NavItem = {
  href: "/settings",
  label: "Settings",
  icon: SlidersHorizontal,
  match: ["/settings"],
};

export const NAV_DRAWER_TOGGLE_EVENT = "kash:nav-drawer-toggle";

const NAV_LINK_FOCUS = "focus:outline-none focus-visible:bg-ink focus-visible:text-on-accent";

function NavLink({
  item,
  active,
  pending,
  expanded,
  index,
  onSelect,
}: {
  item: NavItem;
  active: boolean;
  pending: boolean;
  expanded: boolean;
  index: number;
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
          : "text-ink-muted hover:bg-[var(--surface-2)] hover:text-ink"
      }`}
    >
      <span
        className={`flex h-nav-item shrink-0 items-center justify-center ${
          expanded ? "w-nav-rail" : "w-full"
        }`}
      >
        <Icon {...NAV_ICON_PROPS} />
      </span>
      {/* Label is always rendered so the cascade can transition it; when collapsed
          the full-width icon span pushes it past the rail's overflow-hidden edge. */}
      <span
        className="nav-cascade-item whitespace-nowrap text-sm font-medium"
        style={{ "--nav-i": index } as CSSProperties}
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
  const settingsIndex = NAV_GROUPS.reduce((count, group) => count + group.items.length, 0);
  return (
    <>
      {NAV_GROUPS.map((group, index) => {
        const indexOffset = NAV_GROUPS.slice(0, index).reduce(
          (count, prev) => count + prev.items.length,
          0
        );
        return (
          <Fragment key={group.label}>
            <div className="px-1 pb-1 pt-2">
              {expanded ? (
                <span className="px-1 text-caption font-semibold uppercase tracking-wide text-ink-muted">
                  {group.label}
                </span>
              ) : index > 0 ? (
                <div className="mx-2 h-px bg-[var(--border-subtle)]" />
              ) : null}
            </div>
            {group.items.map((item, itemIndex) => (
              <NavLink
                key={item.href}
                item={item}
                active={isActive(item)}
                pending={isPending(item)}
                expanded={expanded}
                index={indexOffset + itemIndex}
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
          index={settingsIndex}
          onSelect={onSelect}
        />
      </div>
    </>
  );
}

export function LeftNavRail() {
  const pathname = usePathname();
  const isFullscreen = useDesktopFullscreen();
  const [pinned, setPinned] = useState(false);
  const [peek, setPeek] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPinned(readNavRailPinned());
  }, []);

  useEffect(() => {
    const onToggle = () => setMobileOpen((open) => !open);
    window.addEventListener(NAV_DRAWER_TOGGLE_EVENT, onToggle);
    return () => window.removeEventListener(NAV_DRAWER_TOGGLE_EVENT, onToggle);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    // Destination committed — drop the optimistic pending highlight.
    setPendingHref(null);
  }, [pathname]);

  const onSelect = (href: string) => {
    setPendingHref(href);
    setMobileOpen(false);
  };

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const expanded = pinned || peek || isFullscreen;
  const railExpanded = pinned || isFullscreen;

  const isActive = (item: NavItem) =>
    item.match.some((m) => pathname === m || pathname.startsWith(`${m}/`));

  const isPending = (item: NavItem) => pendingHref === item.href && !isActive(item);

  const togglePinned = () => {
    setPinned((prev) => {
      const next = !prev;
      writeNavRailPinned(next);
      return next;
    });
  };

  return (
    <>
      <div
        className={`top-shell sticky z-sticky hidden h-full shrink-0 transition-[width] duration-200 lg:block ${
          railExpanded ? "w-nav-rail-expanded" : "w-nav-rail"
        }`}
      >
        <nav
          aria-label="Primary"
          data-expanded={expanded ? "true" : "false"}
          onMouseEnter={() => {
            if (!isFullscreen) setPeek(true);
          }}
          onMouseLeave={() => {
            if (!isFullscreen) setPeek(false);
          }}
          onFocus={() => {
            if (!isFullscreen) setPeek(true);
          }}
          onBlur={() => {
            if (!isFullscreen) setPeek(false);
          }}
          className={`absolute inset-y-0 left-0 z-sticky flex flex-col gap-1 overflow-hidden px-2 py-3 transition-[width] duration-200 ${
            expanded ? "w-nav-rail-expanded" : "w-nav-rail"
          } ${
            expanded && !railExpanded
              ? "rounded-card border border-subtle bg-surface shadow-overlay"
              : "rounded-card border border-subtle bg-surface shadow-surface"
          }`}
        >
          <div
            className={`mb-1 flex h-8 items-center ${expanded ? "justify-between px-1" : "justify-center"}`}
          >
            <span
              className="select-none text-base font-semibold tracking-tight text-ink"
              aria-hidden
            >
              K
            </span>
            {expanded && !isFullscreen ? (
              <button
                type="button"
                onClick={togglePinned}
                aria-pressed={pinned}
                aria-label={pinned ? "Unpin navigation" : "Pin navigation"}
                title={pinned ? "Unpin navigation" : "Pin navigation"}
                className={`flex h-8 w-8 items-center justify-center rounded-control transition ${NAV_LINK_FOCUS} ${
                  pinned
                    ? "bg-[var(--surface-selected)] text-ink"
                    : "text-ink-muted hover:bg-[var(--surface-2)] hover:text-ink"
                }`}
              >
                <Pin {...kashIconProps({ tokenSize: "md" })} />
              </button>
            ) : null}
          </div>

          <NavSections
            expanded={expanded}
            isActive={isActive}
            isPending={isPending}
            onSelect={onSelect}
          />
        </nav>
      </div>

      {mobileOpen ? (
        <>
          <div
            className="fixed inset-0 z-overlay bg-black/30 lg:hidden"
            aria-hidden
            onClick={() => setMobileOpen(false)}
          />
          <nav
            aria-label="Primary"
            data-expanded="true"
            className="fixed inset-y-3 left-3 z-modal flex w-nav-rail-expanded flex-col gap-1 overflow-y-auto rounded-card border border-border bg-surface p-3 shadow-overlay lg:hidden"
          >
            <div className="mb-1 flex h-8 items-center px-1">
              <span
                className="select-none text-base font-semibold tracking-tight text-ink"
                aria-hidden
              >
                K
              </span>
              <IconButton
                type="button"
                onClick={() => setMobileOpen(false)}
                className="ml-auto"
                aria-label="Close navigation"
              >
                ✕
              </IconButton>
            </div>

            <NavSections expanded isActive={isActive} isPending={isPending} onSelect={onSelect} />
          </nav>
        </>
      ) : null}
    </>
  );
}
