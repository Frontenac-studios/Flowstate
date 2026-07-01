import path from "path";
import { fileURLToPath } from "url";
import bundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isDesktopBuild = process.env.DESKTOP_BUILD === "1";

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(isDesktopBuild ? { output: "standalone" } : {}),
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // transformers.js pulls onnxruntime-node (a native binary) into the CLIENT bundle via the
  // live composer hook; keep it external so the browser path loads it at runtime (1H).
  experimental: {
    serverComponentsExternalPackages: ["@huggingface/transformers"],
    // Vercel function-size guard. The server create path now uses a HOSTED classifier
    // (src/server/tasks/infer-category.ts -> hosted-category-inference.ts), so nothing
    // server-side imports transformers/onnxruntime-node anymore. onnxruntime-node ships a
    // ~355MB native binary that, when traced into serverless functions, exceeds Vercel's
    // ~250MB limit and fails the deploy (next build alone doesn't catch it). Exclude it from
    // function tracing so a future stray server import can't silently blow the limit again.
    outputFileTracingExcludes: {
      "*": ["node_modules/onnxruntime-node/**"],
    },
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
      "src/trpc/create-options-proxy.ts"
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

export default withSentryConfig(withBundleAnalyzer(nextConfig), {
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
