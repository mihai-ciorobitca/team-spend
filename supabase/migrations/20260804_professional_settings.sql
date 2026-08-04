-- Adds Vietnamese đồng to existing Peptiking projects.
-- Budget and approval fields are no longer used by the application; they are
-- intentionally left in place to keep this migration non-destructive.

alter table public.teams drop constraint if exists teams_currency_check;
alter table public.teams
  add constraint teams_currency_check
  check (currency in ('THB', 'VND', 'EUR', 'USD', 'GBP', 'SGD'));
