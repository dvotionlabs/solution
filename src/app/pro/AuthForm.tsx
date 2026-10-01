"use client";

import { useActionState, useState } from "react";
import { authenticate, type AuthState } from "./auth-actions";

export function AuthForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [state, action, pending] = useActionState<AuthState, FormData>(authenticate, {});

  return (
    <div className="rounded-lg border border-line bg-surface p-6">
      <div className="mb-6 flex gap-2">
        <button
          type="button"
          className={`btn ${mode === "signup" ? "" : "btn-ghost"}`}
          onClick={() => setMode("signup")}
        >
          Create account
        </button>
        <button
          type="button"
          className={`btn ${mode === "signin" ? "" : "btn-ghost"}`}
          onClick={() => setMode("signin")}
        >
          Sign in
        </button>
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
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.message && <p className="text-sm">{state.message}</p>}
        <button className="btn w-full" disabled={pending}>
          {pending ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
