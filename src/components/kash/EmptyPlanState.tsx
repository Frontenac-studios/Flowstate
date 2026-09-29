import { ColoredEmptyInvitation } from "@/components/kash/ui/ColoredEmptyInvitation";

/** The Plan surface's zero state (Spec v2 empty-state layout, fixed copy). */
export function EmptyPlanState() {
  return (
    <ColoredEmptyInvitation
      title="Nothing planned yet"
      hint="Capture something, or ask Claude what's on deck."
    />
  );
}
