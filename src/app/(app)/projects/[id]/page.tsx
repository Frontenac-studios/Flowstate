import { TRPCError } from "@trpc/server";
import { notFound } from "next/navigation";

import ProjectWorkspace from "@/components/kash/projects/ProjectWorkspace";
import type { ProjectDetail } from "@/components/kash/projects/types";
import { getTRPCCaller } from "@/trpc/server";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProjectPage({ params }: Props) {
  const { id } = await params;

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

  return <ProjectWorkspace project={project} showBackToProjects />;
}
