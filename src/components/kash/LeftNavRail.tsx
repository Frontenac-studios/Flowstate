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
    strokeLinejoin="round"
    aria-hidden
  >
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path d="M3 9h18M8 2v4M16 2v4" />
    <path d="M7.5 13h.01M12 13h.01M16.5 13h.01M7.5 17h.01M12 17h.01" />
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
    <circle cx="12" cy="12" r="9" />
    <path d="M15.6 8.4l-2.2 5.2-5.2 2.2 2.2-5.2z" />
  </svg>
);

const AbyssIcon = (
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
    <path d="M12 3l1.6 4L18 8.6l-4.4 1.6L12 14l-1.6-3.8L6 8.6 10.4 7z" />
    <path d="M18.4 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
  </svg>
);

const CareIcon = (
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
    <path d="M12 21v-8" />
    <path d="M12 13c0-3.3 2.2-5.5 5.5-5.5C17.5 10.8 15.3 13 12 13z" />
    <path d="M12 15c0-2.5-2-4-5-4 0 2.5 2 4 5 4z" />
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
    <path d="M4 7h8M16 7h4M4 12h2M10 12h10M4 17h7M15 17h5" />
    <circle cx="14" cy="7" r="2" />
    <circle cx="8" cy="12" r="2" />
    <circle cx="13" cy="17" r="2" />
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
          ? "bg-[var(--surface-selected)] text-kash-ink"
          : "text-kash-ink-muted hover:bg-[var(--surface-2)] hover:text-kash-ink"
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
      className={`sticky top-6 z-30 h-[calc(100vh-3rem)] shrink-0 transition-[width] duration-200 ${
        pinned ? "w-44" : "w-16"
      }`}
    >
      <nav
        aria-label="Primary"
        onMouseEnter={() => setPeek(true)}
        onMouseLeave={() => setPeek(false)}
        onFocus={() => setPeek(true)}
        onBlur={() => setPeek(false)}
        className={`absolute inset-y-0 left-0 z-20 flex flex-col gap-1 overflow-hidden px-2 py-3 transition-[width] duration-200 ${
          expanded ? "w-44" : "w-16"
        } ${
          // When peeked-but-not-pinned the rail floats over the content column;
          // use an opaque surface + elevation so labels don't bleed through. The
          // pinned/collapsed rail reserves its own width (no overlap), so the
          // lighter glass is fine there.
          expanded && !pinned ? "glass-panel-opaque shadow-xl" : "glass-panel"
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
                ? "bg-[var(--surface-selected)] text-kash-ink"
                : "text-kash-ink-muted hover:bg-[var(--surface-2)] hover:text-kash-ink"
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
                <div className="mx-2 h-px bg-[var(--border-subtle)]" />
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
