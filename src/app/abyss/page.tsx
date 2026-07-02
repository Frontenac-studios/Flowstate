import { redirect } from "next/navigation";

/** Permanent redirect from legacy /abyss bookmarks (BK1). */
export default function AbyssRedirectPage() {
  redirect("/backlog");
}
