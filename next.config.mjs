import path from "path";
import { fileURLToPath } from "url";
import { withSentryConfig } from "@sentry/nextjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isDesktopBuild = process.env.DESKTOP_BUILD === "1";

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(isDesktopBuild ? { output: "standalone" } : {}),
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // transformers.js pulls onnxruntime-node (a native binary) on the server path; keep it
  // out of the webpack bundle so it loads from node_modules at runtime (1H embeddings).
  experimental: {
    serverComponentsExternalPackages: ["@huggingface/transformers"],
  },
  async redirects() {
    // Today moved /plan -> /today. /plan now hosts long-horizon Planning, so only
    // the focus sub-route needs forwarding for old deep links (query preserved).
    return [{ source: "/plan/focus", destination: "/today/focus", permanent: false }];
  },
  webpack: (config) => {
    // Avoid the main barrel (includes React.createContext). Remove when tRPC ships #7228.
    config.resolve.alias["@trpc/tanstack-react-query/create-options-proxy"] = path.join(
      __dirname,
      "node_modules/@trpc/tanstack-react-query/src/internals/createOptionsProxy.ts"
    );

    // 1H embeddings: the live composer hook (a client component) pulls
    // @huggingface/transformers -> onnxruntime-web into the browser bundle. ORT
    // ships pre-minified ESM runtimes (e.g. ort.webgpu.bundle.min.<hash>.mjs) that
    // use top-level `import.meta`; Next re-runs them through Terser, which rejects
    // import.meta outside module code and fails `next build`. They are already
    // minified, so flag them `minimized` — Terser skips anything already flagged.
    // (Next's minimizers are opaque functions, so a TerserPlugin `exclude` can't be
    // attached directly.) Matches `.../ort.*.mjs` and `.../ort-wasm-*.mjs` only.
    const ortBundle = /(?:^|[\\/])ort[-.][^\\/]*\.mjs$/;
    config.plugins.push({
      apply(compiler) {
        const { Compilation } = compiler.webpack;
        compiler.hooks.compilation.tap("MarkOrtBundlesMinified", (compilation) => {
          compilation.hooks.processAssets.tap(
            {
              name: "MarkOrtBundlesMinified",
              // Run before Terser's PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE pass.
              stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE,
            },
            (assets) => {
              for (const name of Object.keys(assets)) {
                if (ortBundle.test(name)) {
                  compilation.updateAsset(
                    name,
                    (source) => source,
                    (info) => ({ ...info, minimized: true })
                  );
                }
              }
            }
          );
        });
      },
    });

    return config;
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  // tunnelRoute: "/monitoring",
  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
