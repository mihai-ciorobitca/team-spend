-- Peptiking database and private proof storage.
-- Run this once in the Supabase SQL editor before adding the environment values.

create extension if not exists pgcrypto;

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My Team' check (char_length(name) between 1 and 100),
  currency text not null default 'EUR' check (currency in ('EUR', 'VND')),
  allowed_currencies text[] not null default array['EUR']::text[] check (allowed_currencies <@ array['EUR', 'VND']::text[] and cardinality(allowed_currencies) > 0),
  require_proof boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  email text not null,
  full_name text not null check (char_length(full_name) between 1 and 120),
  role text not null default 'member' check (role in ('admin', 'member')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  password_hash text,
  auth_provider_id text,
  avatar_color text not null default '#a9d9c7',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, email)
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  spender_id uuid not null references public.team_members(id),
  created_by uuid not null references public.team_members(id),
  merchant text not null check (char_length(merchant) between 1 and 160),
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'EUR' check (currency in ('EUR', 'VND')),
  category text not null check (category in ('Meals', 'Transport', 'Software', 'Supplies', 'Utilities', 'Travel', 'Other')),
  payment_method text not null check (payment_method in ('cash', 'card', 'bank_transfer', 'wallet')),
  spent_at date not null default current_date,
  notes text,
  proof_path text,
  proof_name text,
  proof_type text,
  status text not null default 'logged' check (status in ('logged', 'issue', 'pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists team_members_email_idx on public.team_members (lower(email));
create index if not exists expenses_team_spent_at_idx on public.expenses (team_id, spent_at desc);
create index if not exists expenses_spender_idx on public.expenses (spender_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists teams_set_updated_at on public.teams;
create trigger teams_set_updated_at before update on public.teams for each row execute function public.set_updated_at();
drop trigger if exists team_members_set_updated_at on public.team_members;
create trigger team_members_set_updated_at before update on public.team_members for each row execute function public.set_updated_at();
drop trigger if exists expenses_set_updated_at on public.expenses;
create trigger expenses_set_updated_at before update on public.expenses for each row execute function public.set_updated_at();

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.expenses enable row level security;

-- Browser clients receive no direct table policies. All requests go through the
-- Peptiking server, which verifies the signed-in Sites user and uses the service role.
revoke all on public.teams from anon, authenticated;
revoke all on public.team_members from anon, authenticated;
revoke all on public.expenses from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'expense-proofs',
  'expense-proofs',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Keep existing projects aligned when this schema is run again.
alter table public.team_members add column if not exists password_hash text;
alter table public.teams add column if not exists allowed_currencies text[] not null default array['EUR']::text[];
alter table public.expenses add column if not exists currency text not null default 'EUR';
update public.teams
set currency = 'EUR'
where currency not in ('EUR', 'VND');
alter table public.teams alter column currency set default 'EUR';
alter table public.teams drop constraint if exists teams_currency_check;
alter table public.teams
  add constraint teams_currency_check
  check (currency in ('EUR', 'VND'));
