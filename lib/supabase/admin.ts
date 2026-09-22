import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Service-role Supabase client. Bypasses RLS entirely.
 *
 * Rules for this file, non-negotiable:
 *   1. Never import this from a Client Component or anything bundled to
 *      the browser — the `server-only` import above makes Next.js throw
 *      a build error if that happens.
 *   2. Never import this into a Route Handler or middleware that runs on
 *      `export const runtime = "edge"`. Service-role usage stays on the
 *      Node.js serverless runtime (admin panel routes in Stage 2).
 *   3. Only use it for genuinely admin operations (batch card creation,
 *      support tooling) — never as a shortcut to "make RLS errors go
 *      away" in normal user-facing code paths.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for admin client."
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
