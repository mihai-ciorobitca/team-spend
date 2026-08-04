-- Make offline expense retries safe and idempotent.

alter table public.expenses
  add column if not exists client_id text;

alter table public.expenses drop constraint if exists expenses_team_client_id_key;
alter table public.expenses
  add constraint expenses_team_client_id_key
  unique (team_id, client_id);
