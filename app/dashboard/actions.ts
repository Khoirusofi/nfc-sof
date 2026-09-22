"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type UpdateBusinessState = { error: string | null; success: boolean };

export async function updateBusinessAction(
  businessId: string,
  _prevState: UpdateBusinessState,
  formData: FormData
): Promise<UpdateBusinessState> {
  const businessName = String(formData.get("business_name") ?? "").trim();
  const targetUrl = String(formData.get("target_url") ?? "").trim();

  if (!businessName) {
    return { error: "Nama bisnis wajib diisi.", success: false };
  }
  if (!/^https?:\/\//i.test(targetUrl)) {
    return { error: "URL harus diawali dengan http:// atau https://.", success: false };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sesi Anda berakhir. Silakan masuk kembali.", success: false };
  }

  // The .eq("user_id", ...) here is belt-and-suspenders — the real
  // enforcement is the RLS policy on businesses (user_id = auth.uid()),
  // which means this update silently affects 0 rows for any business that
  // isn't this user's own, regardless of what businessId is passed in.
  const { error } = await supabase
    .from("businesses")
    .update({ business_name: businessName, target_url: targetUrl })
    .eq("id", businessId)
    .eq("user_id", user.id);

  if (error) {
    return { error: "Gagal menyimpan perubahan. Silakan coba lagi.", success: false };
  }

  // The /c/[card_code] route reads target_url fresh on every scan (no
  // caching there), so this change takes effect on the next tap
  // immediately — revalidatePath here is only to refresh this dashboard
  // view, not a requirement for the redirect to pick up the new URL.
  revalidatePath("/dashboard");
  return { error: null, success: true };
}
