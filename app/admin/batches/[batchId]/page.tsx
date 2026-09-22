import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export default async function BatchDetailPage({
  params,
}: {
  params: { batchId: string };
}) {
  const supabase = createClient();

  const { data: batch } = await supabase
    .from("batches")
    .select("id, label, card_count, created_at")
    .eq("id", params.batchId)
    .single();

  if (!batch) notFound();

  const { data: cards } = await supabase
    .from("cards")
    .select("card_code, status, created_at")
    .eq("batch_id", params.batchId)
    .order("created_at", { ascending: true });

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/admin" className="text-sm text-accent hover:underline">
        &larr; Semua batch
      </Link>

      <h1 className="mb-1 mt-3 text-2xl font-medium text-ink">
        {batch.label || "(tanpa label)"}
      </h1>
      <p className="mb-6 text-sm text-ink/60">
        {batch.card_count} kartu · dibuat{" "}
        {new Date(batch.created_at).toLocaleString("id-ID")}
      </p>

      <div className="mb-8 flex gap-3">
        <a
          href={`/api/admin/batches/${batch.id}/csv`}
          className="rounded-card bg-ink px-4 py-2.5 text-sm font-medium text-paper"
        >
          Unduh CSV
        </a>
        <Link
          href={`/admin/batches/${batch.id}/print`}
          target="_blank"
          className="rounded-card border border-line px-4 py-2.5 text-sm font-medium text-ink"
        >
          Cetak Grid QR
        </Link>
      </div>

      <div className="overflow-x-auto rounded-card border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-ink/50">
              <th className="px-4 py-2.5 font-normal">Kode kartu</th>
              <th className="px-4 py-2.5 font-normal">Status</th>
              <th className="px-4 py-2.5 font-normal">Dibuat</th>
            </tr>
          </thead>
          <tbody>
            {(cards ?? []).map((card) => (
              <tr key={card.card_code} className="border-b border-line last:border-0">
                <td className="px-4 py-2.5 font-mono">{card.card_code}</td>
                <td className="px-4 py-2.5">{card.status}</td>
                <td className="px-4 py-2.5 text-ink/60">
                  {new Date(card.created_at).toLocaleString("id-ID")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
