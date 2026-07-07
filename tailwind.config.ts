import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // flat-calm tokens (tokens.css)
        bg: "var(--bg)",
        canvas: "var(--canvas)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        "active-surface": "var(--active-surface)",
        "active-raised": "var(--active-raised)",
        "active-raised-border": "var(--active-raised-border)",
        border: "var(--border)",
        "border-subtle": "var(--border-subtle)",
        ink: "var(--ink)",
        "ink-muted": "var(--ink-muted)",
        "ink-faint": "var(--ink-faint)",
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          soft: "var(--accent-soft)",
          on: "var(--on-accent)",
        },
        critical: "var(--status-critical)",
        cat: {
          professional: "var(--cat-professional-solid)",
          personal: "var(--cat-personal-solid)",
          relationships: "var(--cat-relationships-solid)",
          adulting: "var(--cat-adulting-solid)",
          "body-mind": "var(--cat-body-mind-solid)",
        },
        // The Abyss (dark aesthetic exception) — page-scoped tokens, tokens.css
        abyss: {
          bg: "var(--abyss-bg)",
          surface: "var(--abyss-surface)",
          "surface-2": "var(--abyss-surface-2)",
          bar: "var(--abyss-bar)",
          border: "var(--abyss-border)",
          "border-strong": "var(--abyss-border-strong)",
          ink: "var(--abyss-ink)",
          "ink-muted": "var(--abyss-ink-muted)",
          "ink-faint": "var(--abyss-ink-faint)",
          accent: "var(--abyss-accent)",
          "on-accent": "var(--abyss-on-accent)",
        },
        // legacy aliases (back-compat)
        kash: {
          accent: "var(--kash-accent)",
          ink: "var(--kash-ink)",
          "ink-muted": "var(--kash-ink-muted)",
          glass: "var(--kash-glass-bg)",
        },
      },
      borderColor: {
        // The flat `border` color key already yields `.border-border`; the hairline
        // panel border needs `.border-subtle`, which the `border-subtle` color key
        // would only expose as `.border-border-subtle`. Surface it under its expected
        // name so `border-subtle` resolves to the token instead of the gray-200 default.
        subtle: "var(--border-subtle)",
      },
      borderRadius: {
        kash: "var(--kash-radius)",
        card: "var(--radius-card)",
        row: "var(--radius-row)",
        control: "var(--radius-control)",
        chip: "var(--radius-chip)",
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        surface: "var(--shadow-surface)",
        overlay: "var(--shadow-overlay)",
      },
      zIndex: {
        base: "var(--z-base)",
        sticky: "var(--z-sticky)",
        overlay: "var(--z-overlay)",
        modal: "var(--z-modal)",
        toast: "var(--z-toast)",
      },
      width: {
        "icon-sm": "var(--icon-sm)",
        "icon-md": "var(--icon-md)",
        "icon-lg": "var(--icon-lg)",
        "icon-xl": "var(--icon-xl)",
        "nav-rail": "var(--nav-rail-width)",
        "nav-rail-expanded": "var(--nav-rail-width-expanded)",
        "chat-rail": "var(--chat-rail-width)",
      },
      height: {
        "icon-sm": "var(--icon-sm)",
        "icon-md": "var(--icon-md)",
        "icon-lg": "var(--icon-lg)",
        "icon-xl": "var(--icon-xl)",
        "kash-row": "var(--kash-row-min-height)",
        "nav-item": "var(--nav-item-height)",
      },
      minWidth: {
        "icon-sm": "var(--icon-sm)",
        "icon-md": "var(--icon-md)",
        "icon-lg": "var(--icon-lg)",
        "icon-xl": "var(--icon-xl)",
      },
      minHeight: {
        "icon-sm": "var(--icon-sm)",
        "icon-md": "var(--icon-md)",
        "icon-lg": "var(--icon-lg)",
        "icon-xl": "var(--icon-xl)",
        "kash-row": "var(--kash-row-min-height)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
      },
      fontSize: {
        kash: "var(--kash-density-base)",
        caption: "var(--text-caption)",
        meta: "var(--text-meta)",
        body: "var(--text-body)",
        subtitle: "var(--text-subtitle)",
        title: "var(--text-title)",
        h1: "var(--text-h1)",
      },
      padding: {
        "kash-task-y": "var(--kash-task-row-py)",
        "kash-task-y-compact": "var(--kash-task-row-py-compact)",
        "card-x": "var(--card-pad-x)",
        "card-y": "var(--card-pad-y)",
      },
      margin: {
        section: "var(--section-gap)",
        header: "var(--header-gap)",
        stack: "var(--stack-gap)",
      },
      gap: {
        shell: "var(--shell-gap)",
        stack: "var(--stack-gap)",
        section: "var(--section-gap)",
      },
      top: {
        shell: "var(--shell-sticky-top)",
      },
      transitionDuration: {
        micro: "var(--motion-micro)",
        short: "var(--motion-short)",
        medium: "var(--motion-medium)",
        long: "var(--motion-long)",
      },
      transitionTimingFunction: {
        enter: "var(--ease-enter)",
        move: "var(--ease-move)",
        exit: "var(--ease-exit)",
      },
    },
  },
  plugins: [],
};
export default config;
