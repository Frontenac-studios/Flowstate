import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Local JWT verification for Supabase sessions.
 *
 * `supabase.auth.getUser()` is a *network* round-trip to the Auth server on
 * every call — in a per-request server (middleware, RSC, tRPC context) that
 * means a remote hop before we can do anything, which dominates perceived
 * latency (especially in the desktop app whose DB is local).
 *
 * `getClaims()` instead verifies the JWT signature locally with the WebCrypto
 * API — but only when the project uses asymmetric signing keys (ES256/RS256),
 * and its JWKS cache lives on the *client instance*. Because middleware / RSC /
 * tRPC each create a fresh client per request, that per-instance cache is cold
 * every time and `getClaims()` would re-fetch the JWKS on every request.
 *
 * We fix that by caching the JWKS at *module* scope (shared across every
 * request in the long-running server) and handing it to `getClaims()` via the
 * `jwks` option, so the signature is verified locally with no per-request
 * network call. If the project is on a legacy symmetric secret (JWKS endpoint
 * returns no keys), `getClaims()` transparently falls back to `getUser()`.
 */

type GetClaimsOptions = NonNullable<Parameters<SupabaseClient["auth"]["getClaims"]>[1]>;
type Jwks = NonNullable<GetClaimsOptions["jwks"]>;

export type VerifiedUser = { id: string; email: string | null };

const JWKS_TTL_MS = 10 * 60 * 1000;

/**
 * Upper bound on *any* network work in this module.
 *
 * A local Supabase whose containers are gone but whose Docker port-forward is
 * still listening accepts the TCP connection and then never answers, so these
 * requests hang until the OS gives up — measured at ~195s. Because every
 * authenticated route awaits this before rendering, that reads as a blank
 * window rather than as an auth failure.
 *
 * Past this bound we treat the session as unverified. That degrades to the
 * login page and self-heals on the next request once the auth host is
 * reachable again — the session cookie is untouched.
 */
const AUTH_NETWORK_TIMEOUT_MS = 5_000;

/** Resolve `null` if `work` outlives {@link AUTH_NETWORK_TIMEOUT_MS}. */
function withTimeout<T>(work: PromiseLike<T>): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), AUTH_NETWORK_TIMEOUT_MS);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

let cachedJwks: Jwks | null = null;
let cachedAt = 0;
let inflight: Promise<Jwks | null> | null = null;

async function loadJwks(): Promise<Jwks | null> {
  if (cachedJwks && Date.now() - cachedAt < JWKS_TTL_MS) {
    return cachedJwks;
  }
  if (inflight) {
    return inflight;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    return null;
  }

  inflight = (async () => {
    try {
      // Our module-level cache controls freshness (JWKS_TTL_MS), so opt out of
      // any framework-level fetch caching to pick up key rotation on refresh.
      const res = await fetch(`${url}/auth/v1/.well-known/jwks.json`, {
        cache: "no-store",
        signal: AbortSignal.timeout(AUTH_NETWORK_TIMEOUT_MS),
      });
      if (!res.ok) {
        return cachedJwks;
      }
      const data = (await res.json()) as Jwks;
      if (Array.isArray(data?.keys) && data.keys.length > 0) {
        cachedJwks = data;
        cachedAt = Date.now();
      }
      return cachedJwks;
    } catch {
      // Keep serving the last-known JWKS on a transient fetch failure.
      return cachedJwks;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/**
 * Verify the current session's JWT locally and return the authenticated user,
 * or `null` when there is no valid session. Drop-in replacement for reading
 * `(await supabase.auth.getUser()).data.user` — but without the per-request
 * network round-trip when the project uses asymmetric signing keys.
 */
export async function getVerifiedUser(supabase: SupabaseClient): Promise<VerifiedUser | null> {
  const jwks = await loadJwks();
  // Bounded too, not just the JWKS fetch above: with no `jwks` to verify
  // against locally, `getClaims()` does its own network work (its internal JWKS
  // fetch, then the `getUser()` fallback for legacy symmetric projects) against
  // the same host — so an unreachable auth server would otherwise stall here
  // instead.
  const result = await withTimeout(supabase.auth.getClaims(undefined, jwks ? { jwks } : undefined));
  if (!result) {
    return null;
  }
  const { data, error } = result;
  if (error || !data?.claims?.sub) {
    return null;
  }
  const email = typeof data.claims.email === "string" ? data.claims.email : null;
  return { id: data.claims.sub, email };
}
