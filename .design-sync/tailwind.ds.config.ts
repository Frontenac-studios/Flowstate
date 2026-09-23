/* Tailwind config for the design-sync build only.
 *
 * Same theme as the app's tailwind.config.ts (imported, never duplicated), with
 * two changes:
 *
 * 1. Content globs widened to include the authored preview files.
 * 2. A safelist covering every token-mapped utility family. This matters: the
 *    app's own build is JIT, so the compiled stylesheet only carries utilities
 *    the app happens to use TODAY. The design system's stylesheet is frozen at
 *    sync time and then used to render NEW markup, so the whole documented
 *    vocabulary has to be in it — otherwise a class named in conventions.md
 *    silently resolves to nothing. The safelist is why those two things agree.
 *
 * Run from the repo root:
 *   node_modules/.bin/tailwindcss -c .design-sync/tailwind.ds.config.ts \
 *     -i src/app/globals.css -o .design-sync/.cache/flowstate.css
 */
import type { Config } from "tailwindcss";

import base from "../tailwind.config";

const STATES = ["hover", "focus", "focus-visible", "active", "disabled", "group-hover"];

const config: Config = {
  ...base,
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx}",
    "./.design-sync/previews/**/*.{ts,tsx}",
    "./.design-sync/entry.tsx",
  ],
  safelist: [
    // Semantic colours on every colour-consuming utility.
    {
      pattern:
        /^(bg|text|border|divide|fill|stroke|ring|from|to|via)-(bg|canvas|surface|surface-2|active-surface|active-raised|active-raised-border|border|border-subtle|subtle|ink|ink-muted|ink-faint|critical|accent|accent-hover|accent-soft|accent-on|background|foreground)$/,
      variants: STATES,
    },
    // Category + Abyss + legacy kash-* ramps.
    {
      pattern:
        /^(bg|text|border|divide|fill|stroke)-(cat-(professional|personal|relationships|adulting|body-mind)|abyss-(bg|surface|surface-2|bar|border|border-strong|ink|ink-muted|ink-faint|accent|on-accent)|kash-(accent|ink|ink-muted|glass))$/,
      variants: STATES,
    },
    { pattern: /^rounded-(card|row|control|chip|pill|kash)$/ },
    { pattern: /^rounded-(t|r|b|l|tl|tr|br|bl)-(card|row|control|chip|pill)$/ },
    { pattern: /^shadow-(surface|overlay)$/, variants: STATES },
    { pattern: /^border-emphasis$/, variants: STATES },
    { pattern: /^text-(micro|caption|meta|body|subtitle|title|h1|kash)$/ },
    { pattern: /^(h|w|min-h|min-w)-icon-(sm|md|lg|xl)$/ },
    { pattern: /^w-(nav-rail|nav-rail-expanded|chat-rail)$/ },
    { pattern: /^(h|min-h)-(kash-row|nav-item)$/ },
    { pattern: /^z-(base|sticky|overlay|modal|toast)$/ },
    { pattern: /^(gap|gap-x|gap-y)-(shell|stack|section)$/ },
    { pattern: /^(p|px|py)-(card-x|card-y|kash-task-y|kash-task-y-compact)$/ },
    { pattern: /^(m|mt|mr|mb|ml|mx|my)-(section|stack)$/ },
    { pattern: /^duration-(micro|short|medium|long)$/ },
    { pattern: /^ease-(enter|move|exit)$/ },
    "kash-focus-visible",
    "text-balance",
  ],
};

export default config;
