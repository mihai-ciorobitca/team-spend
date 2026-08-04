-- Legacy migration: member profiles became active immediately instead of using
-- invitations. Individual passwords are added by 20260804_member_passwords.sql.

update public.team_members
set status = 'active'
where status = 'invited';

alter table public.team_members alter column status set default 'active';
alter table public.team_members drop constraint if exists team_members_status_check;
alter table public.team_members
  add constraint team_members_status_check
  check (status in ('active', 'inactive'));
