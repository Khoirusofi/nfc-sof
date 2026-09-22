import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import type { Database } from "@/lib/supabase/database.types";

// Edge runtime is safe here specifically because this route only ever
// touches the anon key + the two SECURITY DEFINER RPCs. No service-role
// key, no direct table access — do not "simplify" this by querying the
// tables directly, that would require bypassing RLS from the edge.
export const runtime = "edge";

// A plain client (not @supabase/ssr) is deliberate: this route doesn't
// need to read/write auth cookies, it just needs to call an RPC with the
// anon key. Keeping it dependency-light keeps the edge function small.
function createAnonClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: { card_code: string } }
) {
  const cardCode = params.card_code?.trim();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? request.nextUrl.origin;

  if (!cardCode) {
    return NextResponse.redirect(new URL("/", baseUrl), 307);
  }

  const supabase = createAnonClient();

  const { data, error } = await supabase
    .rpc("get_card_redirect", { p_card_code: cardCode })
    .single();

  // Card code doesn't exist at all, or the RPC failed unexpectedly.
  if (error || !data || !data.card_status) {
    return NextResponse.redirect(
      new URL(`/?invalid_card=${encodeURIComponent(cardCode)}`, baseUrl),
      307
    );
  }

  switch (data.card_status) {
    case "active":
      // redirect_url is guaranteed non-null by get_card_redirect() when
      // status is 'active', but guard anyway rather than trust that blindly.
      if (!data.redirect_url) {
        return NextResponse.redirect(new URL("/suspended", baseUrl), 307);
      }
      return NextResponse.redirect(data.redirect_url, 307);

    case "unassigned":
      return NextResponse.redirect(
        new URL(`/activate/${encodeURIComponent(cardCode)}`, baseUrl),
        307
      );

    case "suspended":
      return NextResponse.redirect(new URL("/suspended", baseUrl), 307);

    default:
      return NextResponse.redirect(new URL("/", baseUrl), 307);
  }
}
