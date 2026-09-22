"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { updateBusinessAction, type UpdateBusinessState } from "./actions";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-card bg-ink px-4 py-2 text-sm font-medium text-paper transition-opacity disabled:opacity-50"
    >
      {pending ? "Menyimpan..." : "Simpan"}
    </button>
  );
}

export default function CardEditForm({
  businessId,
  businessName,
  targetUrl,
}: {
  businessId: string;
  businessName: string;
  targetUrl: string;
}) {
  const [open, setOpen] = useState(false);
  const initialState: UpdateBusinessState = { error: null, success: false };
  const boundAction = updateBusinessAction.bind(null, businessId);
  const [state, formAction] = useFormState(boundAction, initialState);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-accent hover:underline"
      >
        Ubah URL
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-3 space-y-3 rounded-card border border-line p-4">
      <div className="space-y-1">
        <label className="text-xs text-ink/60">Nama bisnis</label>
        <input
          name="business_name"
          defaultValue={businessName}
          required
          className="w-full rounded-card border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-ink/60">URL tujuan</label>
        <input
          name="target_url"
          type="url"
          defaultValue={targetUrl}
          required
          className="w-full rounded-card border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>

      {state.error && (
        <p className="rounded-card bg-red-50 px-3 py-2 text-xs text-red-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-card bg-green-50 px-3 py-2 text-xs text-green-700">
          Tersimpan. Perubahan berlaku langsung di kartu.
        </p>
      )}

      <div className="flex gap-2">
        <SaveButton />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-card px-4 py-2 text-sm text-ink/60 hover:bg-line/40"
        >
          Tutup
        </button>
      </div>
    </form>
  );
}
