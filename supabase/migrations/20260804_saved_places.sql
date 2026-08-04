-- Store reusable merchant and place names for faster expense entry.

alter table public.teams
  add column if not exists saved_places text[] not null
  default array[]::text[];

alter table public.teams drop constraint if exists teams_saved_places_check;
alter table public.teams
  add constraint teams_saved_places_check
  check (cardinality(saved_places) <= 50);
