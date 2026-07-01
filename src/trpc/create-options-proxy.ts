import "server-only";

/**
 * Server-safe entry for createTRPCOptionsProxy (no React.createContext).
 * Webpack alias in next.config.mjs resolves
 * `@trpc/tanstack-react-query/create-options-proxy` here so Next compiles
 * this module with SWC instead of feeding raw package TypeScript through the
 * flight loader (trpc/trpc#7228).
 *
 * Re-exports from the compiled package entry; `server-only` keeps this path
 * out of client bundles. When tRPC ships a dedicated subpath export, drop the
 * alias and import that subpath directly.
 */
export { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
