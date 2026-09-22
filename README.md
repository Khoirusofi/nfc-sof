# NFC Review Card

Stage 1 (schema, redirect, self-activation) + Stage 3 (customer dashboard,
admin panel, batch generation, CSV/QR export). Stage 2 (public marketing
page polish) is still a stub — see `app/page.tsx`.

## What's in this stage

- `supabase/migrations/0001_initial_schema.sql` — `cards` + `businesses`
  tables, RLS policies, and two `SECURITY DEFINER` RPCs:
  - `get_card_redirect(card_code)` — used by the public redirect route,
    also atomically increments `scan_count`.
  - `activate_card(card_code, business_name, target_url)` — used by the
    self-activation server action, atomically claims the card.
- `app/c/[card_code]/route.ts` — the fast redirect handler. Runs on the
  **Edge runtime**, uses only the anon key.
- `app/activate/[card_code]/` — the self-activation flow (Supabase Auth
  sign-up + `activate_card()` call).
- `app/suspended`, `app/page.tsx` — minimal stubs so the redirect targets
  above all resolve to something real. `/dashboard` itself is now the real
  Stage 3 dashboard (see below), not a stub.

## Setup

1. **Create a Supabase project**, then in the SQL editor run
   `supabase/migrations/0001_initial_schema.sql` (or apply it via the
   Supabase CLI: `supabase db push`).

2. **Check your Auth settings.** By default Supabase requires email
   confirmation before a session exists. The activation server action
   handles this (it tells the user to check their email and come back), but
   for local testing you'll move faster with confirmation turned off:
   Authentication → Providers → Email → toggle off "Confirm email".

3. **Copy env vars**:

   ```bash
   cp .env.example .env.local
   ```

   Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` from
   Project Settings → API. `SUPABASE_SERVICE_ROLE_KEY` isn't used by
   anything in this stage yet (Stage 2's batch generation will need it) but
   is included now so the env contract is settled.

4. **Seed a test card.** Once Stage 3's `/admin` batch generator is running
   (see below), use that instead — this manual insert is only for testing
   Stage 1 in isolation, and only works before migration `0002` changes
   `batch_id` to a uuid FK:

   ```sql
   insert into public.cards (card_code) values ('test001');
   ```

5. **Run locally**:

   ```bash
   npm install
   npm run dev
   ```

   Visit `http://localhost:3000/c/test001` — it should redirect you to
   `/activate/test001`. Complete the form, and you should land on
   `/dashboard?activated=1`. Hitting `/c/test001` again should now 307
   redirect straight to the target URL you entered, and `scan_count` on
   that row should be `1`.

## Stage 3: dashboard, admin panel, batch generation

### Apply the new migration

Run `supabase/migrations/0002_admin_dashboard.sql` after `0001`. **Read its
header comment first** — it changes `cards.batch_id` from free text to a
`uuid` foreign key, so if you seeded the test row from the Stage 1 README
(`batch_id = 'manual-seed'`), delete or fix it before running this
migration or the type cast will fail:

```sql
delete from public.cards where batch_id = 'manual-seed';
```

### Promote your first admin

Every new signup gets a `profiles` row with `role = 'customer'` by default
— including people who just activated a card as a customer. There is no
self-service way to become admin (on purpose). After signing up your own
account (through `/activate/[some-test-card]` or Supabase Auth directly),
promote it manually in the SQL editor:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

Then visit `/admin` while logged in as that user.

### What each piece does

- `/login` — Supabase Auth email/password sign-in for both customers and
  admins (same login, different landing based on role).
- `/dashboard` — a customer's own cards (RLS-scoped via `businesses.user_id
  = auth.uid()`), with an inline form to change `business_name` /
  `target_url`. Changes apply on the very next tap — `/c/[card_code]` reads
  `target_url` fresh every time, nothing to invalidate.
- `/admin` — batch generation form + batch history. Card codes are
  randomly generated (`SCAN-XXXXXX`, ambiguity-free alphabet), inserted via
  `ON CONFLICT DO NOTHING` with a top-up loop for the astronomically
  unlikely collision case.
- `/admin/batches/[id]` — per-batch card list, links to CSV export and the
  print grid.
- `/admin/batches/[id]/print` — a print-optimized page (`@media print`),
  not a server-generated PDF file. Use the browser's "Save as PDF" in the
  print dialog if you need an actual file to send a vendor.
- `/api/admin/batches/[id]/csv` — CSV download: `card_code,
  target_shortlink, batch_id, status, created_at`.

### Where admin authorization is actually enforced

Three layers, on purpose, because they protect different things:

1. `middleware.ts` — redirects to `/login` if there's no session at all,
   for anything under `/dashboard` or `/admin`. Scoped narrowly (see its
   `matcher`) so it never runs for `/c/[card_code]` — that route's
   Stage 1 speed guarantee is untouched.
2. `app/admin/layout.tsx` — redirects non-admins away from any `/admin`
   page.
3. **Every admin Server Action and Route Handler re-checks admin status
   itself** (`requireAdminApi()` in `lib/auth/admin.ts`), because those are
   independently callable endpoints — a POST to a Server Action or a GET
   to `/api/admin/...` doesn't go through the page-level layout check.
   Skipping this layer is the most common way this kind of panel ends up
   with an unauthenticated write hiding behind what looks like a protected
   page.

## Deploying to Vercel

No `vercel.json` is needed — Next.js App Router (including the
`export const runtime = "edge"` in the redirect route) is auto-detected.
Just set the four env vars from `.env.example` in the Vercel project
settings (Production + Preview) and deploy.

`next.config.mjs` intentionally does **not** set
`typescript.ignoreBuildErrors` or `eslint.ignoreDuringBuilds` — if the
Vercel build fails on a type or lint error, that's a real bug to fix, not
something to suppress.

## Security notes carried into this stage

- Neither `cards` nor `businesses` grants direct `INSERT`/`UPDATE` to the
  `anon`/`authenticated` roles. All writes happen inside the two
  `SECURITY DEFINER` functions, so validation and the "don't double-claim a
  card" race condition are handled in one place (the DB), not trusted to
  the client.
- `SUPABASE_SERVICE_ROLE_KEY` is not referenced anywhere in this stage's
  code. It's in `.env.example` only because Stage 2 (admin batch
  generation) will need it, on the Node.js runtime, never on Edge.
- Per-tap `scan_logs` rows were dropped in favor of the atomic `scan_count`
  column, per the agreed cost/volume tradeoff. If you later need real
  per-event analytics (referrer, geolocation, device breakdown), that's a
  deliberate scope increase — add a separate sampled/async logging path
  rather than writing a row synchronously on every redirect.
