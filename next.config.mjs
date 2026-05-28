import path from "path";
import { fileURLToPath } from "url";
import { withSentryConfig } from "@sentry/nextjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isDesktopBuild = process.env.DESKTOP_BUILD === "1";

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(isDesktopBuild ? { output: "standalone" } : {}),
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  webpack: (config) => {
    // Avoid the main barrel (includes React.createContext). Remove when tRPC ships #7228.
    config.resolve.alias["@trpc/tanstack-react-query/create-options-proxy"] = path.join(
      __dirname,
      "node_modules/@trpc/tanstack-react-query/src/internals/createOptionsProxy.ts"
    );
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
