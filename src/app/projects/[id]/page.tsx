import { TRPCError } from "@trpc/server";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/kash/AppShell";
import ProjectWorkspace from "@/components/kash/projects/ProjectWorkspace";
import type { ProjectDetail } from "@/components/kash/projects/types";
import { isAuthBypassed } from "@/lib/auth/auth-bypass";
import { createClient } from "@/lib/supabase/server";
import { getTRPCCaller } from "@/trpc/server";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProjectPage({ params }: Props) {
  const { id } = await params;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isAuthBypassed()) {
    redirect("/login");
  }

  const caller = await getTRPCCaller();
  let project: ProjectDetail;
  try {
    project = await caller.projects.getById({ id });
  } catch (error) {
    // A missing project or a malformed id both resolve to a 404.
    if (
      error instanceof TRPCError &&
      (error.code === "NOT_FOUND" || error.code === "BAD_REQUEST")
    ) {
      notFound();
    }
    throw error;
  }

  return (
    <AppShell>
      <ProjectWorkspace project={project} showBackToProjects />
    </AppShell>
  );
}
