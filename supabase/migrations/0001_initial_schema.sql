-- ============================================================================
-- NFC Review Card — Initial Schema
-- Stage 1: cards, businesses, RLS, and the two SECURITY DEFINER RPCs used by
-- the public redirect route and the self-activation flow.
--
-- Design notes:
--   - No table (cards / businesses) grants direct INSERT/UPDATE to anon or
--     authenticated roles. All writes from the public-facing app go through
--     the two functions below, so every write path is validated and atomic
--     in one place instead of trusted to RLS + client-side logic.
--   - scan_logs (per-tap rows) was deliberately dropped in favor of an
--     atomic `scan_count` column on `cards`, per the low-cost-at-volume
--     tradeoff agreed with the product owner. If per-event analytics are
--     needed later, add a sampled/async logging table rather than writing
--     a row on every single tap.
--   - service_role (used by the admin panel / batch generation in Stage 2)
--     bypasses RLS entirely by default in Supabase, so no explicit "admin"
--     policies are defined here.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Types
-- ----------------------------------------------------------------------------

create type public.card_status as enum ('unassigned', 'active', 'suspended');

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table public.cards (
  id          uuid primary key default gen_random_uuid(),
  card_code   text not null unique,
  status      public.card_status not null default 'unassigned',
  batch_id    text,
  scan_count  bigint not null default 0,
  created_at  timestamptz not null default now()
);

comment on table public.cards is
  'One row per physical NFC/QR card. card_code is what is encoded in the NFC chip / printed QR, resolved via /c/[card_code].';
comment on column public.cards.scan_count is
  'Atomic tap counter, incremented inside get_card_redirect(). Not a full audit log — see migration header notes.';

create index cards_card_code_idx on public.cards (card_code);
create index cards_batch_id_idx  on public.cards (batch_id);
create index cards_status_idx    on public.cards (status);

create table public.businesses (
  id            uuid primary key default gen_random_uuid(),
  card_id       uuid not null references public.cards (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  business_name text not null,
  target_url    text not null,
  updated_at    timestamptz not null default now(),
  constraint businesses_target_url_format check (target_url ~* '^https?://')
);

comment on table public.businesses is
  'The business profile bound to a card once activated. One business per card (enforced by the unique index below).';

-- Enforce one-business-per-card at the DB level (not just app logic).
create unique index businesses_card_id_key on public.businesses (card_id);
create index businesses_user_id_idx on public.businesses (user_id);

-- Keep updated_at honest on every UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger businesses_set_updated_at
before update on public.businesses
for each row
execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------

alter table public.cards enable row level security;
alter table public.businesses enable row level security;

-- Card owners can see their own card's status/scan_count in the dashboard.
-- No INSERT/UPDATE/DELETE policy exists for cards on purpose — all writes
-- go through get_card_redirect() / activate_card() (or service_role for
-- batch creation).
create policy "Card owners can view their own card"
on public.cards
for select
to authenticated
using (
  id in (
    select card_id from public.businesses where user_id = auth.uid()
  )
);

-- Business owners can see and edit their own business row.
-- No INSERT policy on purpose — rows are only ever created via
-- activate_card(), which validates the card and does the insert atomically.
create policy "Business owners can view their own business"
on public.businesses
for select
to authenticated
using (user_id = auth.uid());

create policy "Business owners can update their own business"
on public.businesses
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- RPC: get_card_redirect
--   Called by the public /c/[card_code] route (anon key, Edge runtime).
--   Returns the card's status and, if active, its target URL — and
--   atomically increments scan_count for active cards in the same call.
-- ----------------------------------------------------------------------------

create or replace function public.get_card_redirect(p_card_code text)
returns table (card_status public.card_status, redirect_url text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card public.cards%rowtype;
  v_target_url text;
begin
  select * into v_card from public.cards where card_code = p_card_code;

  if not found then
    return; -- empty result set = "card code doesn't exist" to the caller
  end if;

  if v_card.status = 'active' then
    update public.cards
      set scan_count = scan_count + 1
      where id = v_card.id;

    select b.target_url into v_target_url
      from public.businesses b
      where b.card_id = v_card.id;

    return query select v_card.status, v_target_url;
  else
    -- unassigned or suspended: report status, no URL, no counter increment
    return query select v_card.status, null::text;
  end if;
end;
$$;

revoke all on function public.get_card_redirect(text) from public;
grant execute on function public.get_card_redirect(text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- RPC: activate_card
--   Called after Supabase Auth sign-up, from a server action (never
--   client-side, since it must run with the fresh authenticated session).
--   Atomically flips an 'unassigned' card to 'active' and creates its
--   business row. Fails cleanly if the card was already claimed.
-- ----------------------------------------------------------------------------

create or replace function public.activate_card(
  p_card_code text,
  p_business_name text,
  p_target_url text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_business_name is null or length(trim(p_business_name)) = 0 then
    raise exception 'INVALID_BUSINESS_NAME';
  end if;

  if p_target_url is null or p_target_url !~* '^https?://' then
    raise exception 'INVALID_TARGET_URL';
  end if;

  -- Atomic claim: this UPDATE only affects a row still 'unassigned'.
  -- If two requests race for the same card_code, only one gets a
  -- non-null v_card_id back.
  update public.cards
    set status = 'active'
    where card_code = p_card_code
      and status = 'unassigned'
    returning id into v_card_id;

  if v_card_id is null then
    raise exception 'CARD_NOT_AVAILABLE';
  end if;

  insert into public.businesses (card_id, user_id, business_name, target_url)
  values (v_card_id, auth.uid(), trim(p_business_name), p_target_url);

  return v_card_id;
end;
$$;

revoke all on function public.activate_card(text, text, text) from public;
grant execute on function public.activate_card(text, text, text) to authenticated;
