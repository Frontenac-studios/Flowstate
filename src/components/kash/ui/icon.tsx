import { forwardRef } from "react";
import type { LucideIcon, LucideProps } from "lucide-react";

export * from "lucide-react";

/** Default lucide stroke per DT-13. */
export const ICON_STROKE_WIDTH = 1.8;

/** Named icon sizes backed by `--icon-*` tokens (DT-13). */
export const iconSizes = {
  sm: "var(--icon-sm)",
  md: "var(--icon-md)",
  lg: "var(--icon-lg)",
  xl: "var(--icon-xl)",
} as const;

export type IconSize = keyof typeof iconSizes;

export type KashIconProps = LucideProps & {
  /** Token-backed size; defaults to `md`. Numeric `size` wins when both are set. */
  tokenSize?: IconSize;
};

/** Merge Kash defaults into lucide icon props. */
export function kashIconProps({
  tokenSize = "md",
  size,
  strokeWidth = ICON_STROKE_WIDTH,
  ...rest
}: KashIconProps): LucideProps {
  return {
    ...rest,
    strokeWidth,
    size: size ?? iconSizes[tokenSize],
  };
}

/** Wrap any lucide icon with Kash stroke + token size defaults. */
export function withKashIcon(Icon: LucideIcon): LucideIcon {
  const Wrapped = forwardRef<SVGSVGElement, KashIconProps>(function KashIcon(props, ref) {
    return <Icon ref={ref} {...kashIconProps(props)} />;
  });
  Wrapped.displayName = `KashIcon(${Icon.displayName ?? Icon.name ?? "Icon"})`;
  return Wrapped as LucideIcon;
}
