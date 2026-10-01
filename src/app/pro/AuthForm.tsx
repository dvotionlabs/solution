"use client";

import { useActionState, useState } from "react";
import { authenticate, type AuthState } from "./auth-actions";

export function AuthForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [state, action, pending] = useActionState<AuthState, FormData>(authenticate, {});

  return (
    <div className="rounded-xl border border-line bg-surface p-6">
      <div className="mb-6 grid grid-cols-2 rounded-lg bg-background p-1 text-sm" role="tablist">
        {(["signup", "signin"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            className={`rounded-md py-2 font-medium ${mode === m ? "bg-surface shadow-[0_0_0_1px_var(--line)]" : "text-muted"}`}
            onClick={() => setMode(m)}
          >
            {m === "signup" ? "Create account" : "Sign in"}
          </button>
        ))}
      </div>
      <form action={action} className="space-y-4">
        <input type="hidden" name="mode" value={mode} />
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input
            className="input"
            id="password"
            name="password"
            type="password"
            minLength={8}
            required
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
        </div>
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        {state.message && <p className="text-sm">{state.message}</p>}
        <button className="btn w-full" disabled={pending}>
          {pending ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
