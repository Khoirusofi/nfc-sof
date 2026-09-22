import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import GenerateBatchForm from "./GenerateBatchForm";

export const runtime = "nodejs";

export default async function AdminPage() {
  const supabase = createClient();

  // Uses the normal auth-bound client, not the service-role admin client —
  // this read is covered by the "Admins can view batches" RLS policy, so
  // there's no need to reach for the service-role key just to list them.
  const { data: batches } = await supabase
    .from("batches")
    .select("id, label, card_count, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-medium text-ink">Buat Batch Kartu</h1>

      <GenerateBatchForm />

      <h2 className="mb-3 text-sm font-medium text-ink/60">Riwayat Batch</h2>
      {(!batches || batches.length === 0) && (
        <p className="text-sm text-ink/50">Belum ada batch dibuat.</p>
      )}
      <ul className="divide-y divide-line rounded-card border border-line">
        {(batches ?? []).map((batch) => (
          <li key={batch.id}>
            <Link
              href={`/admin/batches/${batch.id}`}
              className="flex items-center justify-between px-5 py-3.5 hover:bg-line/20"
            >
              <span className="text-sm text-ink">
                {batch.label || "(tanpa label)"}
              </span>
              <span className="text-xs text-ink/50">
                {batch.card_count} kartu ·{" "}
                {new Date(batch.created_at).toLocaleDateString("id-ID")}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
