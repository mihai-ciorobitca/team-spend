-- Rename the original local admin profile for existing Peptiking projects.

update public.team_members
set
  full_name = 'Admin',
  email = 'admin@peptikingmedia.com',
  status = 'active',
  updated_at = now()
where email = 'owner@local.demo'
  and role = 'admin';
