import { Suspense } from "react";

import { GradientBackdrop } from "@/components/kash/GradientBackdrop";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="relative min-h-screen">
      <GradientBackdrop />
      <main className="relative z-10 flex min-h-screen items-center justify-center px-6 py-16">
        <Suspense fallback={<div className="glass-panel p-6">Loading…</div>}>
          <LoginForm />
        </Suspense>
      </main>
    </div>
  );
}
