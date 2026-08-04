alter table public.teams
  add column if not exists allowed_currencies text[];

update public.teams
set allowed_currencies = array[currency]
where allowed_currencies is null or cardinality(allowed_currencies) = 0;

alter table public.teams
  alter column allowed_currencies set default array['EUR']::text[],
  alter column allowed_currencies set not null;

alter table public.teams drop constraint if exists teams_allowed_currencies_check;
alter table public.teams add constraint teams_allowed_currencies_check
  check (allowed_currencies <@ array['EUR', 'VND']::text[] and cardinality(allowed_currencies) > 0);

alter table public.expenses
  add column if not exists currency text;

update public.expenses e
set currency = t.currency
from public.teams t
where e.team_id = t.id and e.currency is null;

update public.expenses set currency = 'EUR' where currency is null;

alter table public.expenses
  alter column currency set default 'EUR',
  alter column currency set not null;

alter table public.expenses drop constraint if exists expenses_currency_check;
alter table public.expenses add constraint expenses_currency_check
  check (currency in ('EUR', 'VND'));
