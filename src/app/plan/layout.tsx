import { AppShell } from "@/components/kash/AppShell";

export default function PlanRouteLayout({ children }: { children: React.ReactNode }) {
  return <AppShell proactiveNudges>{children}</AppShell>;
}
