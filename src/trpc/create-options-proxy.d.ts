/**
 * Server-safe entry for createTRPCOptionsProxy (no React.createContext).
 * Runtime alias is configured in next.config.mjs until tRPC ships
 * `@trpc/tanstack-react-query/create-options-proxy` (trpc/trpc#7228).
 */
declare module "@trpc/tanstack-react-query/create-options-proxy" {
  export { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
}
