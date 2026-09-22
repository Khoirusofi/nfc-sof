import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateCardCode } from "./generateCode";

const MAX_TOPUP_ATTEMPTS = 8;

export async function createCardBatch({
  label,
  count,
  createdBy,
}: {
  label: string | null;
  count: number;
  createdBy: string;
}) {
  const admin = createAdminClient();

  const { data: batch, error: batchError } = await admin
    .from("batches")
    .insert({ label, card_count: count, created_by: createdBy })
    .select()
    .single();

  if (batchError || !batch) {
    throw new Error(batchError?.message ?? "Gagal membuat batch.");
  }

  // Random codes make collisions astronomically unlikely at batch sizes up
  // to 1000, but "unlikely" isn't "impossible" — handle it properly with
  // ON CONFLICT DO NOTHING + a top-up loop rather than trusting entropy
  // alone.
  let remaining = count;
  let attempts = 0;

  while (remaining > 0 && attempts < MAX_TOPUP_ATTEMPTS) {
    attempts++;

    const candidates = Array.from({ length: remaining }, () => ({
      card_code: generateCardCode(),
      batch_id: batch.id,
    }));

    const { data: inserted, error: insertError } = await admin
      .from("cards")
      .upsert(candidates, { onConflict: "card_code", ignoreDuplicates: true })
      .select("card_code");

    if (insertError) {
      // Roll back the batch row so we don't leave an orphaned batch with
      // zero or partial cards behind.
      await admin.from("batches").delete().eq("id", batch.id);
      throw new Error(insertError.message);
    }

    remaining -= inserted?.length ?? 0;
  }

  if (remaining > 0) {
    throw new Error(
      `Hanya berhasil membuat ${count - remaining}/${count} kode unik setelah ${MAX_TOPUP_ATTEMPTS} percobaan. Coba lagi dengan jumlah lebih kecil.`
    );
  }

  return batch;
}
