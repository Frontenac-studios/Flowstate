"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";

import {
  Calendar,
  Compass,
  Folder,
  kashIconProps,
  Pin,
  SlidersHorizontal,
  Sparkles,
  Sprout,
  Sun,
} from "@/components/kash/ui/icon";
import IconButton from "@/components/kash/ui/IconButton";
import { SyncFooterIndicator } from "@/components/kash/nav/SyncFooterIndicator";
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
      { href: "/abyss", label: "Abyss", icon: Sparkles, match: ["/abyss"] },
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
  expanded,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  expanded: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      title={item.label}
      className={`flex h-12 items-center rounded-control pr-2 transition ${NAV_LINK_FOCUS} ${
        active
          ? "bg-[var(--surface-selected)] text-ink"
          : "text-ink-muted hover:bg-[var(--surface-2)] hover:text-ink"
      }`}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center">
        <Icon {...NAV_ICON_PROPS} />
      </span>
      <span
        className={`whitespace-nowrap text-sm font-medium transition-opacity duration-150 ${
          expanded ? "opacity-100" : "opacity-0"
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
  onNavigate,
}: {
  expanded: boolean;
  isActive: (item: NavItem) => boolean;
  onNavigate?: () => void;
}) {
  return (
    <>
      {NAV_GROUPS.map((group, index) => (
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
          {group.items.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(item)}
              expanded={expanded}
              onClick={onNavigate}
            />
          ))}
        </Fragment>
      ))}
      <div className="mt-auto">
        <SyncFooterIndicator expanded={expanded} />
        <NavLink
          item={SETTINGS_ITEM}
          active={isActive(SETTINGS_ITEM)}
          expanded={expanded}
          onClick={onNavigate}
        />
      </div>
    </>
  );
}

export function LeftNavRail() {
  const pathname = usePathname();
  const [pinned, setPinned] = useState(false);
  const [peek, setPeek] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const expanded = pinned || peek;

  const isActive = (item: NavItem) =>
    item.match.some((m) => pathname === m || pathname.startsWith(`${m}/`));

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
        className={`sticky top-6 z-sticky hidden h-[calc(100vh-3rem)] shrink-0 transition-[width] duration-200 lg:block ${
          pinned ? "w-44" : "w-16"
        }`}
      >
        <nav
          aria-label="Primary"
          onMouseEnter={() => setPeek(true)}
          onMouseLeave={() => setPeek(false)}
          onFocus={() => setPeek(true)}
          onBlur={() => setPeek(false)}
          className={`absolute inset-y-0 left-0 z-sticky flex flex-col gap-1 overflow-hidden px-2 py-3 transition-[width] duration-200 ${
            expanded ? "w-44" : "w-16"
          } ${
            expanded && !pinned
              ? "rounded-card border border-subtle bg-surface shadow-overlay"
              : "rounded-card border border-subtle bg-surface"
          }`}
        >
          <div className="mb-1 flex h-8 items-center px-1">
            <span
              className="select-none text-base font-semibold tracking-tight text-ink"
              aria-hidden
            >
              K
            </span>
            <button
              type="button"
              onClick={togglePinned}
              aria-pressed={pinned}
              aria-label={pinned ? "Unpin navigation" : "Pin navigation"}
              title={pinned ? "Unpin navigation" : "Pin navigation"}
              className={`ml-auto flex h-8 w-8 items-center justify-center rounded-control transition ${NAV_LINK_FOCUS} ${
                expanded ? "opacity-100" : "pointer-events-none opacity-0"
              } ${
                pinned
                  ? "bg-[var(--surface-selected)] text-ink"
                  : "text-ink-muted hover:bg-[var(--surface-2)] hover:text-ink"
              }`}
            >
              <Pin {...kashIconProps({ tokenSize: "md" })} />
            </button>
          </div>

          <NavSections expanded={expanded} isActive={isActive} />
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
            className="fixed inset-y-3 left-3 z-modal flex w-44 flex-col gap-1 overflow-y-auto rounded-card border border-border bg-surface p-3 shadow-overlay lg:hidden"
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

            <NavSections expanded isActive={isActive} onNavigate={() => setMobileOpen(false)} />
          </nav>
        </>
      ) : null}
    </>
  );
}
