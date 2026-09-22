-- ============================================================================
-- NFC Review Card — Stage 3 additions
-- profiles/roles (admin vs customer), batches table, admin-scoped RLS.
--
-- IMPORTANT: cards.batch_id changes from free text to a uuid FK referencing
-- batches(id). If you seeded a test row per the Stage 1 README
-- (batch_id = 'manual-seed'), delete or update it before running this
-- migration, or the type cast below will fail:
--   delete from public.cards where batch_id = 'manual-seed';
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Roles
-- ----------------------------------------------------------------------------

create type public.app_role as enum ('customer', 'admin');

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  role       public.app_role not null default 'customer',
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per auth user, created automatically by the trigger below. role controls access to /admin — never editable by the user themselves.';

alter table public.profiles enable row level security;

-- Users can see their own role (needed so the app can decide whether to
-- show admin navigation etc). No insert/update policy at all — role
-- changes only happen via the service role / SQL editor.
create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

-- Auto-create a profile row (role defaults to 'customer') whenever a new
-- auth user is created, whether via self-activation sign-up or admin invite.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Helper used inside RLS policies. SECURITY DEFINER so it can read
-- profiles regardless of the caller's own RLS visibility into that table.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Admins can read (not write) every card/business — used so the admin
-- panel's read paths can use the normal auth-bound client instead of the
-- service-role client, keeping the service-role key's usage surface to
-- just the batch-insert operation itself.
create policy "Admins can view all cards"
on public.cards
for select
to authenticated
using (public.is_admin());

create policy "Admins can view all businesses"
on public.businesses
for select
to authenticated
using (public.is_admin());

-- ----------------------------------------------------------------------------
-- Batches
-- ----------------------------------------------------------------------------

create table public.batches (
  id          uuid primary key default gen_random_uuid(),
  label       text,
  card_count  integer not null check (card_count > 0),
  created_by  uuid references auth.users (id),
  created_at  timestamptz not null default now()
);

alter table public.batches enable row level security;

create policy "Admins can view batches"
on public.batches
for select
to authenticated
using (public.is_admin());

-- cards.batch_id: free text -> real FK to batches(id).
-- See the migration header note about cleaning up any non-uuid test data
-- first.
alter table public.cards
  alter column batch_id type uuid using batch_id::uuid;

alter table public.cards
  add constraint cards_batch_id_fkey
  foreign key (batch_id) references public.batches (id);
