/**
 * Local-development auth bypass.
 *
 * Lets `npm run dev` skip the login gate so the authenticated UI can be
 * previewed without a Supabase session. Hard-gated to
 * `NODE_ENV === "development"`, so it can NEVER activate in a production build —
 * Vercel builds and runs production (and preview) deployments with
 * `NODE_ENV=production`, so the middleware login gate and per-page redirects
 * stay fully enforced on the live site. Row Level Security continues to scope
 * all data at the database layer regardless of this flag, so even with the gate
 * skipped locally there is no privileged data access without a real session.
 */
export function isAuthBypassed(): boolean {
  return process.env.NODE_ENV === "development";
}
