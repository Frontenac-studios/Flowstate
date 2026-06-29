import type { CSSProperties } from "react";

/**
 * The Care garden — the one lush, illustrative exception to the B&W redesign.
 *
 * Palette is token-anchored: the greens derive from the Body & Mind category
 * token (`--cat-body-mind-*`) via `color-mix`, sun/flower cores from the
 * reserved yellow, and only the two petal hues are bespoke illustrative tints.
 * All are scoped to this element as `--g-*` vars so no raw hex leaks to use
 * sites and the shared `tokens.css` is left untouched. A lightweight stand-in
 * until the detailed-illustrative art spike ships.
 */
const gardenPalette = {
  "--g-sky": "color-mix(in srgb, var(--cat-body-mind-fill) 70%, var(--surface))",
  "--g-sun": "var(--reserved-yellow-fill)",
  "--g-hill-1": "color-mix(in srgb, var(--cat-body-mind-solid) 26%, var(--surface))",
  "--g-hill-2": "color-mix(in srgb, var(--cat-body-mind-solid) 44%, var(--surface))",
  "--g-hill-3": "color-mix(in srgb, var(--cat-body-mind-solid) 60%, var(--surface))",
  "--g-leaf": "var(--cat-body-mind-solid)",
  "--g-leaf-soft": "color-mix(in srgb, var(--cat-body-mind-solid) 78%, var(--surface))",
  "--g-stem": "var(--cat-body-mind-text)",
  "--g-flower-core": "var(--reserved-yellow-solid)",
  "--g-petal-a": "#eaa6bf",
  "--g-petal-b": "#cdb6e6",
} as CSSProperties;

export function GardenScene() {
  return (
    <div
      className="border-subtle flex h-full flex-col overflow-hidden rounded-card border"
      style={gardenPalette}
    >
      <svg
        viewBox="0 0 380 250"
        width="100%"
        className="block"
        role="img"
        aria-label="An illustrated garden — your self-care, growing"
      >
        <rect x="0" y="0" width="380" height="250" fill="var(--g-sky)" />
        <circle cx="312" cy="48" r="26" fill="var(--g-sun)" />
        <path
          d="M0 168 Q90 138 200 162 Q300 182 380 158 L380 250 L0 250 Z"
          fill="var(--g-hill-1)"
        />
        <path
          d="M0 196 Q120 172 230 192 Q320 208 380 192 L380 250 L0 250 Z"
          fill="var(--g-hill-2)"
        />
        <path
          d="M0 224 Q140 210 260 222 Q330 230 380 222 L380 250 L0 250 Z"
          fill="var(--g-hill-3)"
        />
        <g stroke="var(--g-stem)" strokeWidth={3} strokeLinecap="round" fill="none">
          <path d="M70 224 L70 188" />
          <path d="M70 200 q-12 -6 -16 -16" />
          <path d="M70 196 q12 -7 17 -17" />
          <path d="M120 226 L120 182" />
          <path d="M120 198 q-13 -5 -18 -16" />
          <path d="M120 192 q13 -6 18 -16" />
          <path d="M250 226 L250 178" />
          <path d="M250 200 q-14 -6 -19 -18" />
          <path d="M250 194 q14 -7 19 -18" />
        </g>
        <circle cx="70" cy="180" r="9" fill="var(--g-petal-a)" />
        <circle cx="70" cy="180" r="3.5" fill="var(--g-flower-core)" />
        <circle cx="120" cy="174" r="9" fill="var(--g-petal-b)" />
        <circle cx="120" cy="174" r="3.5" fill="var(--g-flower-core)" />
        <circle cx="250" cy="170" r="11" fill="var(--g-sun)" />
        <circle cx="250" cy="170" r="4" fill="var(--g-flower-core)" />
        <g fill="var(--g-leaf-soft)">
          <ellipse cx="186" cy="214" rx="9" ry="20" />
          <ellipse cx="198" cy="216" rx="8" ry="16" />
          <ellipse cx="175" cy="217" rx="7" ry="14" />
        </g>
        <g fill="var(--g-leaf)">
          <ellipse cx="310" cy="220" rx="8" ry="16" />
          <ellipse cx="322" cy="222" rx="7" ry="13" />
          <ellipse cx="300" cy="223" rx="6" ry="11" />
        </g>
        <circle cx="345" cy="214" r="7" fill="var(--g-petal-a)" />
      </svg>
      <p className="border-subtle border-t bg-surface px-3 py-2 text-caption text-ink-muted">
        Your garden — it grows as you tend yourself, and gently rests when you do.
      </p>
    </div>
  );
}
