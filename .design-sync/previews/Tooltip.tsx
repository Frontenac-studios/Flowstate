import { useEffect, useRef, type ReactNode } from "react";

import IconButton from "../../src/components/kash/ui/IconButton";
import Tooltip from "../../src/components/kash/ui/Tooltip";
import { kashIconProps } from "../../src/components/kash/ui/icon";
import { Info } from "lucide-react";

/*
 * Tooltip opens on hover/focus after a 400ms delay and portals the bubble to
 * document.body, so a plain static render would only ever show the trigger.
 * `Hovered` below dispatches a real mouseover at the real trigger on mount and
 * leaves room for the bubble — the component opens itself; nothing here draws
 * a stand-in bubble.
 */
function Hovered({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const trigger = ref.current?.querySelector("span");
    trigger?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  }, []);
  return (
    // The bubble is fixed and centred on the trigger, so the trigger needs room
    // on both sides (and below) or the cell crops it.
    <div ref={ref} className="flex justify-center px-40 pb-20 pt-2">
      {children}
    </div>
  );
}

/** Icon trigger with the default ink bubble — the dominant use. */
export const IconTrigger = () => (
  <Hovered>
    <Tooltip content="Burn is budget against work done, not the deadline.">
      <IconButton aria-label="About burn">
        <Info {...kashIconProps({ tokenSize: "md" })} aria-hidden />
      </IconButton>
    </Tooltip>
  </Hovered>
);

/** Text trigger, keyboard-reachable via `focusable`. */
export const FocusableTextTrigger = () => (
  <Hovered>
    <Tooltip focusable content="Sealed fortnights can't be re-declared.">
      <span className="text-body text-ink underline decoration-dotted underline-offset-4">
        Fortnight sealed
      </span>
    </Tooltip>
  </Hovered>
);

/** `variant="light"` swaps the ink bubble for a white popover card. */
export const LightVariant = () => (
  <Hovered>
    <Tooltip variant="light" content="Owner and partner only. Members never see rates.">
      <span className="rounded-chip border border-border bg-surface-2 px-2 py-0.5 text-caption text-ink-muted">
        financial
      </span>
    </Tooltip>
  </Hovered>
);
