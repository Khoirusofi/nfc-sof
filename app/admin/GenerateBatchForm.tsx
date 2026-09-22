"use client";

import { useFormState, useFormStatus } from "react-dom";
import { generateBatchAction, type GenerateBatchState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-card bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-opacity disabled:opacity-50"
    >
      {pending ? "Membuat batch..." : "Buat batch"}
    </button>
  );
}

export default function GenerateBatchForm() {
  const initialState: GenerateBatchState = { error: null };
  const [state, formAction] = useFormState(generateBatchAction, initialState);

  return (
    <form action={formAction} className="mb-10 rounded-card border border-line p-5">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <label htmlFor="label" className="text-xs text-ink/60">
            Label batch (opsional)
          </label>
          <input
            id="label"
            name="label"
            placeholder="Cetak Oktober 2026"
            className="rounded-card border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="count" className="text-xs text-ink/60">
            Jumlah kartu
          </label>
          <input
            id="count"
            name="count"
            type="number"
            min={1}
            max={1000}
            defaultValue={100}
            required
            className="w-28 rounded-card border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <SubmitButton />
      </div>

      {state.error && (
        <p className="mt-3 rounded-card bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}
