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
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
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
        // legacy aliases (back-compat)
        kash: {
          accent: "var(--kash-accent)",
          ink: "var(--kash-ink)",
          "ink-muted": "var(--kash-ink-muted)",
          glass: "var(--kash-glass-bg)",
        },
      },
      borderRadius: {
        kash: "var(--kash-radius)",
        card: "var(--radius-card)",
        row: "var(--radius-row)",
        control: "var(--radius-control)",
        chip: "var(--radius-chip)",
      },
      backdropBlur: {
        kash: "var(--kash-glass-blur)",
      },
      boxShadow: {
        overlay: "var(--shadow-overlay)",
        "glass-inset": "none",
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
      minHeight: {
        "kash-row": "var(--kash-row-min-height)",
      },
      padding: {
        "kash-task-y": "var(--kash-task-row-py)",
        "kash-task-y-compact": "var(--kash-task-row-py-compact)",
      },
    },
  },
  plugins: [],
};
export default config;
