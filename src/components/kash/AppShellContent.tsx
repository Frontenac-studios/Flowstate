"use client";

import { usePathname } from "next/navigation";

export function AppShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-cross-fade flex min-h-0 flex-1 flex-col">
      {children}
    </div>
  );
}
