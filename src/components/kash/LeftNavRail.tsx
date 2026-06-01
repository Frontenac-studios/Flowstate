"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  /** Active when the pathname starts with one of these prefixes. */
  match: string[];
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

const TOP_ITEMS: NavItem[] = [
  { href: "/plan", label: "Today", icon: SunIcon, match: ["/plan"] },
  { href: "/this-week", label: "This Week", icon: WeekIcon, match: ["/this-week"] },
  { href: "/projects", label: "Projects", icon: ProjectsIcon, match: ["/projects"] },
];

const SETTINGS_ITEM: NavItem = {
  href: "/settings",
  label: "Settings",
  icon: SettingsIcon,
  match: ["/settings"],
};

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      title={item.label}
      className={`flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-[var(--kash-radius-control)] transition ${
        active
          ? "bg-[var(--kash-accent-soft)] text-kash-accent"
          : "text-kash-ink-muted hover:bg-white/40 hover:text-kash-ink"
      }`}
    >
      {item.icon}
      <span className="text-[9px] font-medium leading-none">{item.label}</span>
    </Link>
  );
}

export function LeftNavRail() {
  const pathname = usePathname();
  const isActive = (item: NavItem) =>
    item.match.some((m) => pathname === m || pathname.startsWith(`${m}/`));

  return (
    <nav
      aria-label="Primary"
      className="glass-panel sticky top-6 flex h-[calc(100vh-3rem)] flex-col items-center gap-1 px-2 py-3"
    >
      <span
        className="mb-2 select-none text-base font-semibold tracking-tight text-kash-ink"
        aria-hidden
      >
        K
      </span>
      {TOP_ITEMS.map((item) => (
        <NavLink key={item.href} item={item} active={isActive(item)} />
      ))}
      <div className="mt-auto">
        <NavLink item={SETTINGS_ITEM} active={isActive(SETTINGS_ITEM)} />
      </div>
    </nav>
  );
}
