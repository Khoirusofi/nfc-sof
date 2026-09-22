"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/auth/admin";
import { createCardBatch } from "@/lib/cards/createBatch";

export type GenerateBatchState = { error: string | null };

const MIN_COUNT = 1;
const MAX_COUNT = 1000;

export async function generateBatchAction(
  _prevState: GenerateBatchState,
  formData: FormData
): Promise<GenerateBatchState> {
  // Checked here, not just in app/admin/layout.tsx — this action is a POST
  // endpoint reachable on its own, independent of which page rendered the
  // form that pointed at it.
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return { error: auth.message };
  }

  const label = String(formData.get("label") ?? "").trim() || null;
  const count = Number(formData.get("count"));

  if (!Number.isInteger(count) || count < MIN_COUNT || count > MAX_COUNT) {
    return { error: `Jumlah kartu harus antara ${MIN_COUNT} dan ${MAX_COUNT}.` };
  }

  let batch;
  try {
    batch = await createCardBatch({ label, count, createdBy: auth.user.id });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Gagal membuat batch." };
  }

  revalidatePath("/admin");
  redirect(`/admin/batches/${batch.id}`);
}
