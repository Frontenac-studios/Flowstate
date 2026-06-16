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
        kash: {
          accent: "var(--kash-accent)",
          ink: "var(--kash-ink)",
          "ink-muted": "var(--kash-ink-muted)",
          glass: "var(--kash-glass-bg)",
        },
      },
      borderRadius: {
        kash: "var(--kash-radius)",
      },
      backdropBlur: {
        kash: "var(--kash-glass-blur)",
      },
      boxShadow: {
        "glass-inset": "inset 0 1px 0 rgba(255, 255, 255, 0.65)",
      },
      fontSize: {
        kash: "var(--kash-density-base)",
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
