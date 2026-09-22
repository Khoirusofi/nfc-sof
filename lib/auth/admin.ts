import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/supabase/database.types";

export async function getCurrentUserWithRole() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, role: null as AppRole | null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return { user, role: (profile?.role ?? "customer") as AppRole };
}

/**
 * For Server Components / Pages. Redirects rather than returning an error,
 * since a page has nowhere else to put one before it renders.
 */
export async function requireAdminPage() {
  const { user, role } = await getCurrentUserWithRole();
  if (!user) redirect("/login?redirect=/admin");
  if (role !== "admin") redirect("/dashboard");
  return user;
}

/**
 * For Server Actions and Route Handlers. These are independently callable
 * (a POST to a Server Action, or a GET to a Route Handler, can be hit
 * directly — they are not protected just because the page that links to
 * them is gated by a layout). Every admin mutation and every admin export
 * endpoint calls this itself rather than trusting the caller came from a
 * gated page.
 */
export async function requireAdminApi(): Promise<
  | { ok: true; user: NonNullable<Awaited<ReturnType<typeof getCurrentUserWithRole>>["user"]> }
  | { ok: false; status: 401 | 403; message: string }
> {
  const { user, role } = await getCurrentUserWithRole();
  if (!user) {
    return { ok: false, status: 401, message: "Anda harus masuk terlebih dahulu." };
  }
  if (role !== "admin") {
    return { ok: false, status: 403, message: "Halaman ini khusus admin." };
  }
  return { ok: true, user };
}
