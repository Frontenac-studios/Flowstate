import { z } from "zod";

/** Planning chat rail surfaces — register stays Planning; tools/context narrow by route. */
export const planningChatSurfaces = ["today", "week", "plan", "projects", "abyss"] as const;
export type PlanningChatSurface = (typeof planningChatSurfaces)[number];

export const planningSurfaceSchema = z.enum(planningChatSurfaces);

export function planningSurfaceFromPathname(pathname: string): PlanningChatSurface | null {
  if (pathname === "/today" || pathname.startsWith("/today/")) return "today";
  if (pathname === "/this-week" || pathname.startsWith("/this-week/")) return "week";
  if (pathname === "/plan" || pathname.startsWith("/plan/")) return "plan";
  if (pathname === "/projects" || pathname.startsWith("/projects/")) return "projects";
  if (pathname === "/abyss" || pathname.startsWith("/abyss/")) return "abyss";
  return null;
}
