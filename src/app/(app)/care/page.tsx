import { notFound } from "next/navigation";

import { CareView } from "@/components/kash/care/CareView";
import { FLAGS } from "@/lib/flags";

export default function CarePage() {
  // Parked (docs/v1-scope.md §3.2). The route must not render — a page that
  // loads but is unlinked is hidden, not parked.
  if (!FLAGS.care) notFound();

  return <CareView />;
}
