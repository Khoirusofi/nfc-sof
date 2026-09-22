import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import PrintButton from "./PrintButton";

export const runtime = "nodejs";

export default async function PrintBatchPage({
  params,
}: {
  params: { batchId: string };
}) {
  // Covered by app/admin/layout.tsx's requireAdminPage() — this route is
  // nested under it, not a standalone Route Handler, so no separate check
  // is needed here (unlike the CSV export route).
  const supabase = createClient();

  const { data: batch } = await supabase
    .from("batches")
    .select("id, label")
    .eq("id", params.batchId)
    .single();

  if (!batch) notFound();

  const { data: cards } = await supabase
    .from("cards")
    .select("card_code")
    .eq("batch_id", params.batchId)
    .order("created_at", { ascending: true });

  if (!cards || cards.length === 0) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";

  // Generated server-side per request rather than cached — for a batch of
  // several hundred cards this adds a few seconds to the initial load,
  // which is acceptable for a one-off admin/print action. If this page
  // gets used often enough for that to be annoying, cache the SVGs
  // keyed by batch_id instead of regenerating on every visit.
  const items = await Promise.all(
    cards.map(async (card) => ({
      code: card.card_code,
      qrDataUrl: await QRCode.toDataURL(`${baseUrl}/c/${card.card_code}`, {
        margin: 1,
        width: 240,
      }),
    }))
  );

  return (
    <div>
      <div className="print:hidden sticky top-0 flex items-center justify-between border-b border-line bg-paper px-6 py-4">
        <div>
          <h1 className="text-sm font-medium text-ink">
            {batch.label || "(tanpa label)"} — {items.length} kartu
          </h1>
          <p className="text-xs text-ink/50">
            Gunakan &quot;Simpan sebagai PDF&quot; di dialog cetak browser
            untuk vendor akrilik/NFC.
          </p>
        </div>
        <PrintButton />
      </div>

      <div className="qr-print-grid">
        {items.map((item) => (
          <div className="qr-print-cell" key={item.code}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.qrDataUrl} alt={item.code} width={120} height={120} />
            <span className="qr-print-label">{item.code}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
