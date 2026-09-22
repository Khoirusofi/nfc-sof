import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ActivateForm from "./ActivateForm";

export const runtime = "nodejs"; // this page uses the cookie-bound server client, not edge

export default async function ActivatePage({
  params,
}: {
  params: { card_code: string };
}) {
  const cardCode = params.card_code;
  const supabase = createClient();

  const { data, error } = await supabase
    .rpc("get_card_redirect", { p_card_code: cardCode })
    .single();

  if (error || !data || !data.card_status) {
    notFound();
  }

  // Don't show the activation form for a card that isn't actually
  // unassigned — send the visitor to where they should actually be.
  if (data.card_status === "active" && data.redirect_url) {
    redirect(data.redirect_url);
  }
  if (data.card_status === "suspended") {
    redirect("/suspended");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-16">
      <div className="mb-8">
        <h1 className="text-2xl font-medium text-ink">Aktifkan kartu Anda</h1>
        <p className="mt-2 text-sm text-ink/60">
          Kartu ini belum terpasang ke bisnis manapun. Isi detail di bawah
          untuk menghubungkannya ke link Google Review Anda.
        </p>
      </div>
      <ActivateForm cardCode={cardCode} />
    </main>
  );
}
