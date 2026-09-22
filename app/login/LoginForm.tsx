"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-card bg-ink py-3 text-sm font-medium text-paper transition-opacity disabled:opacity-50"
    >
      {pending ? "Memproses..." : "Masuk"}
    </button>
  );
}

export default function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const initialState: LoginState = { error: null };
  const boundAction = loginAction.bind(null, redirectTo);
  const [state, formAction] = useFormState(boundAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm text-ink/70">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-card border border-line bg-paper px-4 py-2.5 text-ink outline-none focus:border-accent"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm text-ink/70">
          Kata sandi
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-card border border-line bg-paper px-4 py-2.5 text-ink outline-none focus:border-accent"
        />
      </div>

      {state.error && (
        <p className="rounded-card bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
