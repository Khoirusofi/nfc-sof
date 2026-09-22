"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ActivateFormState = {
  error: string | null;
};

const ERROR_MESSAGES: Record<string, string> = {
  AUTH_REQUIRED: "Sesi masuk gagal dibuat. Silakan coba lagi.",
  INVALID_BUSINESS_NAME: "Nama bisnis wajib diisi.",
  INVALID_TARGET_URL: "URL tujuan harus diawali dengan http:// atau https://.",
  CARD_NOT_AVAILABLE:
    "Kartu ini sudah diaktifkan oleh orang lain. Hubungi dukungan jika ini keliru.",
};

function friendlyError(rawMessage: string): string {
  const code = Object.keys(ERROR_MESSAGES).find((key) =>
    rawMessage.includes(key)
  );
  return code
    ? ERROR_MESSAGES[code]
    : "Terjadi kesalahan. Silakan coba lagi.";
}

export async function activateCardAction(
  cardCode: string,
  _prevState: ActivateFormState,
  formData: FormData
): Promise<ActivateFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const businessName = String(formData.get("business_name") ?? "").trim();
  const targetUrl = String(formData.get("target_url") ?? "").trim();

  if (!email || !password) {
    return { error: "Email dan kata sandi wajib diisi." };
  }
  if (password.length < 8) {
    return { error: "Kata sandi minimal 8 karakter." };
  }
  if (!businessName) {
    return { error: "Nama bisnis wajib diisi." };
  }
  if (!/^https?:\/\//i.test(targetUrl)) {
    return { error: "URL tujuan harus diawali dengan http:// atau https://." };
  }

  const supabase = createClient();

  // 1. Create the account. This also establishes the session cookie via
  //    the @supabase/ssr server client, which activate_card() below needs
  //    in order to resolve auth.uid().
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp(
    {
      email,
      password,
      options: {
        data: { business_name: businessName },
      },
    }
  );

  if (signUpError) {
    if (signUpError.message.toLowerCase().includes("already registered")) {
      return {
        error:
          "Email ini sudah terdaftar. Silakan masuk di /login untuk mengelola kartu Anda.",
      };
    }
    return { error: friendlyError(signUpError.message) };
  }

  // If email confirmation is required by your Supabase Auth settings,
  // signUp() succeeds but returns no active session yet. Surface that
  // clearly instead of silently failing the activate_card() call below.
  if (!signUpData.session) {
    return {
      error:
        "Akun dibuat. Silakan cek email Anda untuk konfirmasi, lalu buka tautan ini lagi untuk menyelesaikan aktivasi.",
    };
  }

  // 2. Atomically claim the card + create the business row.
  const { error: activateError } = await supabase.rpc("activate_card", {
    p_card_code: cardCode,
    p_business_name: businessName,
    p_target_url: targetUrl,
  });

  if (activateError) {
    return { error: friendlyError(activateError.message) };
  }

  redirect("/dashboard?activated=1");
}
