alter table public.expenses drop constraint if exists expenses_status_check;
alter table public.expenses add constraint expenses_status_check
  check (status in ('logged', 'issue', 'pending', 'approved', 'rejected'));
