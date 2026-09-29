"use client";

import { Check, ChevronRight } from "lucide-react";
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { cn } from "@/lib/cn";

import { kashIconProps } from "./icon";
import { MENU_ROW, OVERLAY_CARD } from "./overlay-styles";

/**
 * Spec v3 Pa1 menu: a floating white card (no border, two-layer shadow, 8px padding)
 * of 36px rows. Arrow keys move between items, Home/End jump to the ends.
 *
 * Positioning is the caller's: render it `absolute` below its trigger (the spec
 * default) via `className`. Pair it with `useDismiss` for click-outside + Escape, and
 * put `aria-expanded` on the trigger so it stays pressed while the menu is open.
 */
const Menu = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function Menu(
  { className, onKeyDown, children, ...rest },
  ref
) {
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    const items = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>('[role^="menuitem"]:not([disabled])')
    );
    if (items.length === 0) return;
    const index = items.indexOf(document.activeElement as HTMLElement);
    let next: number | null = null;
    if (e.key === "ArrowDown") next = index < 0 ? 0 : (index + 1) % items.length;
    else if (e.key === "ArrowUp")
      next = index < 0 ? items.length - 1 : (index - 1 + items.length) % items.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    if (next === null) return;
    e.preventDefault();
    items[next]!.focus();
  };

  return (
    <div
      ref={ref}
      role="menu"
      className={cn(OVERLAY_CARD, "z-overlay flex min-w-[200px] flex-col", className)}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      {children}
    </div>
  );
});

export default Menu;

type MenuItemProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "role"> & {
  /** Shortcut key shown as a small chip on the right. */
  shortcut?: string;
  /** Crimson text. Destructive items go last, after a divider. */
  destructive?: boolean;
  /** The current choice in a pick-one list: bold with a check. */
  selected?: boolean;
  /** Opens a submenu (shows ›). */
  submenu?: boolean;
  /** A nested choice (indented 28px). */
  indent?: boolean;
  /** Not planned / not applicable — shown at 40%, still selectable. */
  dimmed?: boolean;
  /** Muted right-side note, e.g. "Not planned". */
  note?: ReactNode;
};

export const MenuItem = forwardRef<HTMLButtonElement, MenuItemProps>(function MenuItem(
  {
    shortcut,
    destructive = false,
    selected,
    submenu = false,
    indent = false,
    dimmed = false,
    note,
    className,
    children,
    type = "button",
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      role={selected === undefined ? "menuitem" : "menuitemradio"}
      aria-checked={selected}
      className={cn(
        MENU_ROW,
        indent && "pl-7",
        // `!` because MENU_ROW sets text-ink and cn() does not merge conflicting utilities.
        destructive && "!text-critical",
        selected && "bg-search-fill font-semibold",
        dimmed && "opacity-40",
        className
      )}
      {...rest}
    >
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {note ? <span className="shrink-0 text-caption text-ink-muted">{note}</span> : null}
      {shortcut ? (
        <kbd className="min-w-5 shrink-0 rounded-[5px] bg-canvas px-1.5 py-0.5 text-center font-sans text-micro font-semibold text-ink-muted">
          {shortcut}
        </kbd>
      ) : null}
      {selected ? <Check {...kashIconProps({ tokenSize: "sm" })} aria-hidden /> : null}
      {submenu ? (
        <ChevronRight
          {...kashIconProps({ tokenSize: "sm", className: "text-ink-faint" })}
          aria-hidden
        />
      ) : null}
    </button>
  );
});

/** 1px divider with 6px/4px margins. */
export function MenuDivider() {
  return <div role="separator" className="mx-1 my-1.5 h-px bg-menu-divider" />;
}

/** Uppercase 11px group label (label caps). */
export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-3 pb-1.5 pt-2.5 text-micro font-semibold uppercase tracking-caps text-ink-muted">
      {children}
    </div>
  );
}

/** 36px pill search field on #f5f6f8, for popovers that filter a long list. */
export const MenuSearch = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function MenuSearch({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        type="search"
        className={cn(
          "mb-1 h-9 w-full rounded-pill bg-search-fill px-3 text-[14px] text-ink outline-none placeholder:text-ink-faint focus:shadow-[inset_0_0_0_1.5px_var(--ink)]",
          className
        )}
        {...rest}
      />
    );
  }
);
