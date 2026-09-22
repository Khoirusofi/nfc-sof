import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CardEditForm from "./CardEditForm";
import LogoutButton from "./LogoutButton";

export const runtime = "nodejs";

type BusinessRow = {
  id: string;
  business_name: string;
  target_url: string;
  updated_at: string;
  card: {
    id: string;
    card_code: string;
    status: string;
    scan_count: number;
  } | null;
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { activated?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard");
  }

  // RLS (businesses.user_id = auth.uid()) is what actually scopes this —
  // the .eq below is explicit for readability, not the security boundary.
  const { data: businesses, error } = await supabase
    .from("businesses")
    .select(
      "id, business_name, target_url, updated_at, card:cards(id, card_code, status, scan_count)"
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .returns<BusinessRow[]>();

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-ink">Kartu Saya</h1>
          <p className="mt-1 text-sm text-ink/60">{user.email}</p>
        </div>
        <LogoutButton />
      </div>

      {searchParams.activated && (
        <p className="mb-6 rounded-card bg-green-50 px-4 py-3 text-sm text-green-700">
          Kartu berhasil diaktifkan.
        </p>
      )}

      {error && (
        <p className="rounded-card bg-red-50 px-4 py-3 text-sm text-red-700">
          Gagal memuat data kartu. Silakan muat ulang halaman.
        </p>
      )}

      {!error && (!businesses || businesses.length === 0) && (
        <div className="rounded-card border border-dashed border-line px-6 py-10 text-center">
          <p className="text-sm text-ink/60">
            Belum ada kartu yang terhubung ke akun ini. Aktifkan kartu fisik
            Anda dengan men-tap / men-scan-nya terlebih dahulu.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {(businesses ?? []).map((business) => (
          <div key={business.id} className="rounded-card border border-line p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-medium text-ink">{business.business_name}</h2>
                <p className="mt-1 break-all text-sm text-accent">
                  {business.target_url}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                  business.card?.status === "active"
                    ? "bg-green-50 text-green-700"
                    : "bg-line/50 text-ink/60"
                }`}
              >
                {business.card?.status ?? "unknown"}
              </span>
            </div>

            <dl className="mt-4 flex gap-6 text-sm">
              <div>
                <dt className="text-ink/40">Kode kartu</dt>
                <dd className="font-mono text-ink/80">
                  {business.card?.card_code ?? "-"}
                </dd>
              </div>
              <div>
                <dt className="text-ink/40">Total scan</dt>
                <dd className="text-ink/80">{business.card?.scan_count ?? 0}</dd>
              </div>
            </dl>

            <div className="mt-4">
              <CardEditForm
                businessId={business.id}
                businessName={business.business_name}
                targetUrl={business.target_url}
              />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
