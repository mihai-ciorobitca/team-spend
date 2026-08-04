-- Peptiking supports Euro and Vietnamese đồng only.

update public.teams
set currency = 'EUR'
where currency not in ('EUR', 'VND');

alter table public.teams alter column currency set default 'EUR';
alter table public.teams drop constraint if exists teams_currency_check;
alter table public.teams
  add constraint teams_currency_check
  check (currency in ('EUR', 'VND'));
