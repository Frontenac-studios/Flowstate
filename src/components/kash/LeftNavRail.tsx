"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, type ReactNode, useEffect, useState } from "react";

import { readNavRailPinned, writeNavRailPinned } from "@/lib/nav/nav-rail-storage";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  /** Active when the pathname starts with one of these prefixes. */
  match: string[];
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const SunIcon = (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    aria-hidden
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

const WeekIcon = (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    aria-hidden
  >
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path d="M3 9h18M8 2v4M16 2v4" />
  </svg>
);

const ProjectsIcon = (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </svg>
);

const PlanIcon = (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <circle cx="5" cy="6" r="1" />
    <circle cx="5" cy="12" r="1" />
    <circle cx="5" cy="18" r="1" />
    <path d="M9 6h11M9 12h11M9 18h11" />
  </svg>
);

const AbyssIcon = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
    <polygon points="9,4.5 10.26,7.74 13.5,9 10.26,10.26 9,13.5 7.74,10.26 4.5,9 7.74,7.74" />
    <polygon points="17,4 17.84,6.16 20,7 17.84,7.84 17,10 16.16,7.84 14,7 16.16,6.16" />
    <polygon points="15,14.6 15.67,16.33 17.4,17 15.67,17.67 15,19.4 14.33,17.67 12.6,17 14.33,16.33" />
  </svg>
);

const CareIcon = (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <path
      d="M11 20 C7 16 4 13 4 9.5 A3.5 3.5 0 0 1 11 8 A3.5 3.5 0 0 1 18 9.5 C18 13 15 16 11 20 Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <g fill="currentColor">
      <polygon points="4,3 4.56,4.44 6,5 4.56,5.56 4,7 3.44,5.56 2,5 3.44,4.44" />
      <polygon points="19,3.6 19.67,5.33 21.4,6 19.67,6.67 19,8.4 18.33,6.67 16.6,6 18.33,5.33" />
      <polygon points="19,14.2 19.5,15.5 20.8,16 19.5,16.5 19,17.8 18.5,16.5 17.2,16 18.5,15.5" />
    </g>
  </svg>
);

const SettingsIcon = (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const PinIcon = (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M9 4h6l-1 6 3 3H7l3-3-1-6Z" />
    <path d="M12 16v4" />
  </svg>
);

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Do now",
    items: [
      { href: "/today", label: "Today", icon: SunIcon, match: ["/today"] },
      { href: "/this-week", label: "This Week", icon: WeekIcon, match: ["/this-week"] },
      { href: "/projects", label: "Projects", icon: ProjectsIcon, match: ["/projects"] },
    ],
  },
  {
    label: "Reflect & plan",
    items: [
      { href: "/plan", label: "Plan", icon: PlanIcon, match: ["/plan"] },
      { href: "/abyss", label: "Abyss", icon: AbyssIcon, match: ["/abyss"] },
      { href: "/care", label: "Care", icon: CareIcon, match: ["/care"] },
    ],
  },
];

const SETTINGS_ITEM: NavItem = {
  href: "/settings",
  label: "Settings",
  icon: SettingsIcon,
  match: ["/settings"],
};

function NavLink({
  item,
  active,
  expanded,
}: {
  item: NavItem;
  active: boolean;
  expanded: boolean;
}) {
  return (
    <Link
      href={item.href}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      title={item.label}
      className={`flex h-12 items-center rounded-[var(--kash-radius-control)] pr-2 transition ${
        active
          ? "bg-[var(--kash-accent-soft)] text-kash-accent"
          : "text-kash-ink-muted hover:bg-white/40 hover:text-kash-ink"
      }`}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center">{item.icon}</span>
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

export function LeftNavRail() {
  const pathname = usePathname();
  const [pinned, setPinned] = useState(false);
  const [peek, setPeek] = useState(false);

  useEffect(() => {
    setPinned(readNavRailPinned());
  }, []);

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
    <div
      className={`sticky top-6 h-[calc(100vh-3rem)] shrink-0 transition-[width] duration-200 ${
        pinned ? "w-44" : "w-16"
      }`}
    >
      <nav
        aria-label="Primary"
        onMouseEnter={() => setPeek(true)}
        onMouseLeave={() => setPeek(false)}
        onFocus={() => setPeek(true)}
        onBlur={() => setPeek(false)}
        className={`glass-panel absolute inset-y-0 left-0 z-20 flex flex-col gap-1 overflow-hidden px-2 py-3 transition-[width] duration-200 ${
          expanded ? "w-44" : "w-16"
        }`}
      >
        <div className="mb-1 flex h-8 items-center px-1">
          <span
            className="select-none text-base font-semibold tracking-tight text-kash-ink"
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
            className={`ml-auto flex h-8 w-8 items-center justify-center rounded-[var(--kash-radius-control)] transition ${
              expanded ? "opacity-100" : "pointer-events-none opacity-0"
            } ${
              pinned
                ? "bg-[var(--kash-accent-soft)] text-kash-accent"
                : "text-kash-ink-muted hover:bg-white/40 hover:text-kash-ink"
            }`}
          >
            {PinIcon}
          </button>
        </div>

        {NAV_GROUPS.map((group, index) => (
          <Fragment key={group.label}>
            <div className="px-1 pb-1 pt-2">
              {expanded ? (
                <span className="px-1 text-[10px] font-semibold uppercase tracking-wide text-kash-ink-muted">
                  {group.label}
                </span>
              ) : index > 0 ? (
                <div className="mx-2 h-px bg-white/30" />
              ) : null}
            </div>
            {group.items.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(item)} expanded={expanded} />
            ))}
          </Fragment>
        ))}

        <div className="mt-auto">
          <NavLink item={SETTINGS_ITEM} active={isActive(SETTINGS_ITEM)} expanded={expanded} />
        </div>
      </nav>
    </div>
  );
}
