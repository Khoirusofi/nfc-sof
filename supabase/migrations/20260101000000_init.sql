-- NFC Review Platform: single idempotent schema for Supabase.
create extension if not exists pgcrypto;

do $$ begin create type public.user_role as enum ('customer','admin'); exception when duplicate_object then null; end $$;
do $$ begin create type public.card_status as enum ('available','active','suspended'); exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.batches (
  id uuid primary key default gen_random_uuid(), name text not null, created_by uuid not null references auth.users(id), quantity integer not null check (quantity > 0 and quantity <= 1000), created_at timestamptz not null default now()
);
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, name text not null, slug text not null, logo_url text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id, slug)
);
create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(), batch_id uuid references public.batches(id) on delete set null, business_id uuid references public.businesses(id) on delete set null, card_code text not null unique, status public.card_status not null default 'available', target_url text, scan_count bigint not null default 0 check (scan_count >= 0), activated_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists cards_card_code_idx on public.cards(card_code);
create index if not exists businesses_user_id_idx on public.businesses(user_id);
create index if not exists cards_business_id_idx on public.cards(business_id);

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin') $$;
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$ begin insert into public.profiles(id,email) values(new.id,new.email) on conflict (id) do update set email=excluded.email; return new; end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.get_card_redirect(p_card_code text) returns table(target_url text, status public.card_status) language plpgsql security definer set search_path=public as $$ begin return query update public.cards c set scan_count=c.scan_count+1, updated_at=now() where c.card_code=p_card_code and c.status='active' and c.target_url is not null returning c.target_url,c.status; end $$;
create or replace function public.activate_card(p_card_code text, p_business_name text, p_target_url text) returns public.cards language plpgsql security definer set search_path=public as $$ declare v_business public.businesses; v_card public.cards; begin if auth.uid() is null then raise exception 'not authenticated'; end if; if p_business_name is null or length(trim(p_business_name)) < 2 then raise exception 'business name is required'; end if; insert into public.businesses(user_id,name,slug) values(auth.uid(),trim(p_business_name),lower(regexp_replace(trim(p_business_name),'[^a-zA-Z0-9]+','-','g'))) on conflict(user_id,slug) do update set name=excluded.name returning * into v_business; update public.cards set business_id=v_business.id,status='active',target_url=trim(p_target_url),activated_at=coalesce(activated_at,now()),updated_at=now() where card_code=p_card_code and status='available' returning * into v_card; if v_card.id is null then raise exception 'card is unavailable'; end if; return v_card; end $$;

alter table public.profiles enable row level security; alter table public.batches enable row level security; alter table public.businesses enable row level security; alter table public.cards enable row level security;
drop policy if exists profiles_self on public.profiles; create policy profiles_self on public.profiles for select using (id=auth.uid() or public.is_admin());
drop policy if exists batches_admin on public.batches; create policy batches_admin on public.batches for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists businesses_owner on public.businesses; create policy businesses_owner on public.businesses for all using (user_id=auth.uid() or public.is_admin()) with check (user_id=auth.uid() or public.is_admin());
drop policy if exists cards_owner on public.cards; create policy cards_owner on public.cards for select using (business_id in (select id from public.businesses where user_id=auth.uid()) or public.is_admin());
drop policy if exists cards_admin on public.cards; create policy cards_admin on public.cards for all using (public.is_admin()) with check (public.is_admin());
grant execute on function public.get_card_redirect(text) to anon, authenticated; grant execute on function public.activate_card(text,text,text) to authenticated;
