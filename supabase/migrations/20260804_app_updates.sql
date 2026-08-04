alter table public.teams
  add column if not exists required_app_version text not null default '1.0.0';

alter table public.teams drop constraint if exists teams_required_app_version_check;
alter table public.teams add constraint teams_required_app_version_check
  check (required_app_version ~ '^\d+(\.\d+){0,2}$');
