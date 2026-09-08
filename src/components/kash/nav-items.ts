import type { LucideIcon } from "lucide-react";

import {
  Archive,
  CalendarDays,
  CircleDollarSign,
  Coffee,
  Cog,
  Layers,
  TrendingUp,
} from "@/components/kash/ui/icon";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  match: string[];
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const NAV_GROUP_DO_NOW: NavGroup = {
  label: "Do now",
  items: [
    { href: "/today", label: "Today", icon: Coffee, match: ["/today"] },
    { href: "/this-week", label: "Week", icon: CalendarDays, match: ["/this-week"] },
    { href: "/projects", label: "Projects", icon: Layers, match: ["/projects"] },
    // Money is a MISSION.md law-4c surface; Clients lives inside it, so /clients
    // highlights Money too. Revenue/invoices arrive with W3/W4.
    { href: "/money", label: "Money", icon: CircleDollarSign, match: ["/money", "/clients"] },
  ],
};

export const NAV_GROUP_REFLECT_PLAN: NavGroup = {
  label: "Reflect & plan",
  items: [
    { href: "/plan", label: "Quarter", icon: TrendingUp, match: ["/plan"] },
    { href: "/backlog", label: "Backlog", icon: Archive, match: ["/backlog"] },
  ],
};

export const NAV_GROUPS: NavGroup[] = [NAV_GROUP_DO_NOW, NAV_GROUP_REFLECT_PLAN];

export const SETTINGS_ITEM: NavItem = {
  href: "/settings",
  label: "Settings",
  icon: Cog,
  match: ["/settings"],
};

/** True when `pathname` is the item's route or nested under it. */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  return item.match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
}
