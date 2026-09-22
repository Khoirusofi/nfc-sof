"use client";

import { useFormState, useFormStatus } from "react-dom";
import { activateCardAction, type ActivateFormState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-card bg-ink py-3 text-sm font-medium text-paper transition-opacity disabled:opacity-50"
    >
      {pending ? "Mengaktifkan..." : "Aktifkan kartu"}
    </button>
  );
}

export default function ActivateForm({ cardCode }: { cardCode: string }) {
  const initialState: ActivateFormState = { error: null };
  const boundAction = activateCardAction.bind(null, cardCode);
  const [state, formAction] = useFormState(boundAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="business_name" className="text-sm text-ink/70">
          Nama bisnis
        </label>
        <input
          id="business_name"
          name="business_name"
          required
          placeholder="Kedai Kopi Senja"
          className="w-full rounded-card border border-line bg-paper px-4 py-2.5 text-ink outline-none focus:border-accent"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="target_url" className="text-sm text-ink/70">
          URL Google Review (atau tujuan lain)
        </label>
        <input
          id="target_url"
          name="target_url"
          type="url"
          required
          placeholder="https://g.page/r/xxxxxxx/review"
          className="w-full rounded-card border border-line bg-paper px-4 py-2.5 text-ink outline-none focus:border-accent"
        />
      </div>

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
          placeholder="anda@bisnis.com"
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
          minLength={8}
          autoComplete="new-password"
          placeholder="Minimal 8 karakter"
          className="w-full rounded-card border border-line bg-paper px-4 py-2.5 text-ink outline-none focus:border-accent"
        />
        <p className="text-xs text-ink/50">
          Dipakai untuk masuk ke /dashboard dan mengubah tujuan link kapan
          saja.
        </p>
      </div>

      {state.error && (
        <p className="rounded-card bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <SubmitButton />

      <p className="text-center text-xs text-ink/40">
        Kode kartu: <span className="font-mono">{cardCode}</span>
      </p>
    </form>
  );
}
