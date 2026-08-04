-- Peptiking uses one shared website password, so member profiles are active
-- immediately and are used to identify who spent rather than to send invites.

update public.team_members
set status = 'active'
where status = 'invited';

alter table public.team_members alter column status set default 'active';
alter table public.team_members drop constraint if exists team_members_status_check;
alter table public.team_members
  add constraint team_members_status_check
  check (status in ('active', 'inactive'));
