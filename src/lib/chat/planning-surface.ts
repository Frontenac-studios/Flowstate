import { z } from "zod";
export const planningChatSurfaces = [
  "today",
  "week",
  "plan",
  "projects",
  "loose-tasks",
  "backlog",
  "reviews",
  "care",
  "morning-handoff",
  "goals",
] as const;
export type PlanningChatSurface = (typeof planningChatSurfaces)[number];
export const planningSurfaceSchema = z.enum(planningChatSurfaces);
export function planningSurfaceFromPathname(pathname: string): PlanningChatSurface | null {
  if (pathname === "/today" || pathname.startsWith("/today/")) return "today";
  if (pathname === "/this-week" || pathname.startsWith("/this-week/")) return "week";
  if (pathname === "/plan" || pathname.startsWith("/plan/")) return "plan";
  if (pathname === "/projects" || pathname.startsWith("/projects/")) return "projects";
  if (pathname === "/backlog" || pathname.startsWith("/backlog/")) return "backlog";
  if (pathname === "/abyss" || pathname.startsWith("/abyss/")) return "backlog";
  if (pathname === "/care" || pathname.startsWith("/care/")) return "care";
  return null;
}
