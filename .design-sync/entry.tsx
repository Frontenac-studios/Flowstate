/* design-sync entry barrel — the Flowstate design system's public surface.
 *
 * Flowstate is a Next.js app, not a published component package, so there is no
 * `dist/` to bundle. This file IS the package entry the converter builds from:
 * it re-exports the real, shipped components (never reimplementations) from
 * `src/components/kash/`. Add a component here to put it in the design system.
 *
 * Deliberately NOT re-exported: `ui/icon.tsx`'s `export * from "lucide-react"`
 * (would pull ~1500 icon components into the component list).
 */

// ---- Controls
export { default as Button } from "../src/components/kash/ui/Button";
export type { ButtonVariant } from "../src/components/kash/ui/Button";
export { default as IconButton } from "../src/components/kash/ui/IconButton";
export { default as Input } from "../src/components/kash/ui/Input";
export { default as Textarea } from "../src/components/kash/ui/Textarea";
export { default as Select } from "../src/components/kash/ui/Select";
export { default as Checkbox } from "../src/components/kash/ui/Checkbox";

// ---- Feedback
export { default as InlineValidation } from "../src/components/kash/ui/InlineValidation";
export { inlineValidationFieldClass } from "../src/components/kash/ui/InlineValidation";
export { default as Toast } from "../src/components/kash/ui/Toast";
export type { ToastVariant, ToastProps } from "../src/components/kash/ui/Toast";
export {
  default as ToastProvider,
  useToast,
  useOptionalToast,
} from "../src/components/kash/ui/ToastProvider";
export { QueryErrorNotice } from "../src/components/kash/ui/QueryErrorNotice";
export { default as Tooltip } from "../src/components/kash/ui/Tooltip";

// ---- Keyboard affordances
export { KeyCap } from "../src/components/kash/ui/KeyCap";
export { ShortcutHint } from "../src/components/kash/ui/ShortcutHint";

// ---- Surfaces & empty states
export { RitualSheet } from "../src/components/kash/ui/RitualSheet";
export { ColoredEmptyInvitation } from "../src/components/kash/ui/ColoredEmptyInvitation";
export { GhostCategoryStrip } from "../src/components/kash/ui/GhostCategoryStrip";
export { EmptyPlanState } from "../src/components/kash/EmptyPlanState";

// ---- Navigation & rows
export { InPageSwitcher } from "../src/components/kash/InPageSwitcher";
export type { SwitcherOption } from "../src/components/kash/InPageSwitcher";
export { TaskPriorityIndicator } from "../src/components/kash/TaskPriorityIndicator";
export { TaskDragHandle, TASK_DRAG_HANDLE_VARIANT } from "../src/components/kash/TaskDragHandle";
export type { TaskDragHandleVariant } from "../src/components/kash/TaskDragHandle";
export {
  default as SwipeActionRail,
  SWIPE_ACTION_WIDTH_PX,
  swipeRevealWidth,
} from "../src/components/kash/SwipeActionRail";
export type { SwipeAction, SwipeActionTone } from "../src/components/kash/SwipeActionRail";

// ---- Icon helpers (not components; the design agent needs them to size icons)
export {
  kashIconProps,
  withKashIcon,
  iconSizes,
  ICON_STROKE_WIDTH,
} from "../src/components/kash/ui/icon";
export type { IconSize, KashIconProps } from "../src/components/kash/ui/icon";
