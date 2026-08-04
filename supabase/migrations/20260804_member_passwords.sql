-- Give each non-admin member an individual password managed by an admin.
-- Passwords are stored only as salted PBKDF2-SHA256 hashes.

alter table public.team_members
  add column if not exists password_hash text;
