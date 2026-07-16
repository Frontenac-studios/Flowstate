import type { LucideIcon } from "lucide-react";

import {
  Calendar,
  Compass,
  Folder,
  GalleryVerticalEnd,
  SlidersHorizontal,
  Sprout,
  Sun,
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
    { href: "/today", label: "Today", icon: Sun, match: ["/today"] },
    { href: "/this-week", label: "Week", icon: Calendar, match: ["/this-week"] },
    { href: "/projects", label: "Projects", icon: Folder, match: ["/projects"] },
  ],
};

export const NAV_GROUP_REFLECT_PLAN: NavGroup = {
  label: "Reflect & plan",
  items: [
    { href: "/plan", label: "Plan", icon: Compass, match: ["/plan"] },
    { href: "/backlog", label: "Backlog", icon: GalleryVerticalEnd, match: ["/backlog"] },
    { href: "/care", label: "Care", icon: Sprout, match: ["/care"] },
  ],
};

export const NAV_GROUPS: NavGroup[] = [NAV_GROUP_DO_NOW, NAV_GROUP_REFLECT_PLAN];

export const SETTINGS_ITEM: NavItem = {
  href: "/settings",
  label: "Settings",
  icon: SlidersHorizontal,
  match: ["/settings"],
};

/** True when `pathname` is the item's route or nested under it. */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  return item.match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
}
