import IconButton from "../../src/components/kash/ui/IconButton";
import { kashIconProps } from "../../src/components/kash/ui/icon";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";

/** The icon is the child; aria-label carries the accessible name. */
export const Actions = () => (
  <div className="flex items-center gap-1">
    <IconButton aria-label="Add task">
      <Plus {...kashIconProps({ tokenSize: "md" })} aria-hidden />
    </IconButton>
    <IconButton aria-label="Edit">
      <Pencil {...kashIconProps({ tokenSize: "md" })} aria-hidden />
    </IconButton>
    <IconButton aria-label="Complete">
      <Check {...kashIconProps({ tokenSize: "md" })} aria-hidden />
    </IconButton>
    <IconButton aria-label="Delete">
      <Trash2 {...kashIconProps({ tokenSize: "md" })} aria-hidden />
    </IconButton>
  </div>
);

/** Token sizes: sm 14 / md 16 / lg 20 / xl 24 (DT-13). */
export const Sizes = () => (
  <div className="flex items-center gap-1">
    <IconButton aria-label="Dismiss, small">
      <X {...kashIconProps({ tokenSize: "sm" })} aria-hidden />
    </IconButton>
    <IconButton aria-label="Dismiss, medium">
      <X {...kashIconProps({ tokenSize: "md" })} aria-hidden />
    </IconButton>
    <IconButton aria-label="Dismiss, large">
      <X {...kashIconProps({ tokenSize: "lg" })} aria-hidden />
    </IconButton>
    <IconButton aria-label="Dismiss, extra large">
      <X {...kashIconProps({ tokenSize: "xl" })} aria-hidden />
    </IconButton>
  </div>
);

export const Disabled = () => (
  <IconButton aria-label="Delete" disabled>
    <Trash2 {...kashIconProps({ tokenSize: "md" })} aria-hidden />
  </IconButton>
);
