"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import NewProjectDialog from "@/components/kash/projects/NewProjectDialog";
import { OPEN_NEW_PROJECT_EVENT } from "@/components/kash/chrome-events";

/**
 * The create dialog, mounted once at the shell so it can be opened from anywhere
 * (Kash 3.2, decision 1A). Capture should never require navigating to Projects
 * first, which is why this does not live inside ProjectsIndex any more.
 *
 * Creating routes straight to the new project's board. It deliberately does NOT
 * append `?setup=new`: the four-step wizard that param auto-opened is being retired,
 * and structure is now added on the board itself.
 */
export default function NewProjectOverlay() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_NEW_PROJECT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_NEW_PROJECT_EVENT, onOpen);
  }, []);

  const handleCreated = useCallback(
    ({ id }: { id: string }) => {
      setOpen(false);
      router.push(`/projects/${id}`);
    },
    [router]
  );

  return <NewProjectDialog open={open} onClose={() => setOpen(false)} onCreated={handleCreated} />;
}
