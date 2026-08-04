-- Allow workspace members to create reusable expense categories.

alter table public.teams
  add column if not exists categories text[] not null
  default array['Meals', 'Transport', 'Software', 'Supplies', 'Utilities', 'Travel', 'Other']::text[];

alter table public.teams drop constraint if exists teams_categories_check;
alter table public.teams
  add constraint teams_categories_check
  check (cardinality(categories) between 1 and 50);

alter table public.expenses drop constraint if exists expenses_category_check;
alter table public.expenses
  add constraint expenses_category_check
  check (char_length(btrim(category)) between 1 and 50);
