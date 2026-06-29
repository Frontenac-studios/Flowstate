"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import Button from "@/components/kash/ui/Button";
import Input from "@/components/kash/ui/Input";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/today";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    const result = await supabase.auth.signInWithPassword({ email, password });

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
        <Input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm text-kash-ink-muted">Password</span>
        <Input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full"
        />
      </label>

      {error ? (
        <p className="text-sm text-critical" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={loading} className="w-full text-sm">
        {loading ? "Please wait…" : "Sign in"}
      </Button>
    </form>
  );
}
