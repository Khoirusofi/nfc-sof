import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

// Node runtime: this uses the cookie-bound server client for the admin
// check, and is not a hot path like /c/[card_code], so there's no reason
// to run it on Edge.
export const runtime = "nodejs";

function csvEscape(value: unknown): string {
  const str = String(value ?? "");
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(
  _request: Request,
  { params }: { params: { batchId: string } }
) {
  // This is a Route Handler — reachable directly by URL, independent of
  // the admin page that links to it — so it re-checks admin access itself
  // rather than trusting app/admin/layout.tsx to have already gated it.
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const supabase = createClient();
  const { data: cards, error } = await supabase
    .from("cards")
    .select("card_code, batch_id, status, created_at")
    .eq("batch_id", params.batchId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const header = ["card_code", "target_shortlink", "batch_id", "status", "created_at"];
  const lines = [
    header.join(","),
    ...(cards ?? []).map((card) =>
      [
        card.card_code,
        `${baseUrl}/c/${card.card_code}`,
        card.batch_id,
        card.status,
        card.created_at,
      ]
        .map(csvEscape)
        .join(",")
    ),
  ];

  const csv = lines.join("\r\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="batch-${params.batchId}.csv"`,
    },
  });
}
