"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/plan";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"sign_in" | "sign_up">("sign_in");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    const result =
      mode === "sign_in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setLoading(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="glass-panel mx-auto w-full max-w-sm space-y-4 p-6">
      <h1 className="text-xl font-semibold text-kash-ink">Sign in to Kash</h1>
      <p className="text-sm text-kash-ink-muted">Use your email and password.</p>

      <label className="block space-y-1">
        <span className="text-sm text-kash-ink-muted">Email</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="glass-input w-full"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm text-kash-ink-muted">Password</span>
        <input
          type="password"
          required
          autoComplete={mode === "sign_in" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="glass-input w-full"
        />
      </label>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-kash bg-kash-accent px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Please wait…" : mode === "sign_in" ? "Sign in" : "Create account"}
      </button>

      <button
        type="button"
        className="w-full text-sm text-kash-accent hover:underline"
        onClick={() => setMode(mode === "sign_in" ? "sign_up" : "sign_in")}
      >
        {mode === "sign_in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
      </button>
    </form>
  );
}
