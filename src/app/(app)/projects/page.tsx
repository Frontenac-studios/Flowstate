import { SurfaceCoachLayout } from "@/components/kash/chat/SurfaceCoachLayout";
import ProjectsIndex from "@/components/kash/projects/ProjectsIndex";

export default function ProjectsPage() {
  return (
    <SurfaceCoachLayout surface="projects">
      <ProjectsIndex />
    </SurfaceCoachLayout>
  );
}
