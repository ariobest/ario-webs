-- VOID DEVELOPMENT feature expansion
-- Additive migration: preserves existing tables, auth users, scripts, and records.
begin;

alter table public.ario_profiles
  add column if not exists display_name text,
  add column if not exists bio text not null default '',
  add column if not exists avatar_url text,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.void_script_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  script_id uuid not null references public.published_script_metadata(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, script_id)
);
alter table public.void_script_favorites enable row level security;
drop policy if exists void_favorites_read_self on public.void_script_favorites;
create policy void_favorites_read_self on public.void_script_favorites for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists void_favorites_insert_self on public.void_script_favorites;
create policy void_favorites_insert_self on public.void_script_favorites for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists void_favorites_delete_self on public.void_script_favorites;
create policy void_favorites_delete_self on public.void_script_favorites for delete to authenticated using (user_id = (select auth.uid()));
grant select, insert, delete on public.void_script_favorites to authenticated;

create table if not exists public.void_script_versions (
  id uuid primary key default gen_random_uuid(),
  script_id uuid not null references public.scripts(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  version_label text not null default 'Snapshot',
  source text not null,
  change_note text not null default '',
  created_at timestamptz not null default now(),
  constraint void_script_versions_source_size check (char_length(source) <= 200000)
);
create index if not exists void_script_versions_script_created_idx on public.void_script_versions(script_id, created_at desc);
alter table public.void_script_versions enable row level security;
drop policy if exists void_versions_admin_select on public.void_script_versions;
create policy void_versions_admin_select on public.void_script_versions for select to authenticated using (exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.role = 'admin'));
drop policy if exists void_versions_admin_insert on public.void_script_versions;
create policy void_versions_admin_insert on public.void_script_versions for insert to authenticated with check (author_id = (select auth.uid()) and exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.role = 'admin'));
grant select, insert on public.void_script_versions to authenticated;

create table if not exists public.void_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 140),
  body text not null default '' check (char_length(body) <= 2000),
  kind text not null default 'info' check (kind in ('info','success','warning','release')),
  link text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists void_notifications_user_created_idx on public.void_notifications(user_id, created_at desc);
alter table public.void_notifications enable row level security;
drop policy if exists void_notifications_read_self_or_broadcast on public.void_notifications;
create policy void_notifications_read_self_or_broadcast on public.void_notifications for select to authenticated using (user_id is null or user_id = (select auth.uid()));
drop policy if exists void_notifications_mark_self_read on public.void_notifications;
create policy void_notifications_mark_self_read on public.void_notifications for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists void_notifications_admin_insert on public.void_notifications;
create policy void_notifications_admin_insert on public.void_notifications for insert to authenticated with check (created_by = (select auth.uid()) and exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.role = 'admin'));
grant select, update, insert on public.void_notifications to authenticated;

create table if not exists public.void_user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_key text not null,
  label text not null,
  description text not null default '',
  awarded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, badge_key)
);
alter table public.void_user_badges enable row level security;
drop policy if exists void_badges_read_self on public.void_user_badges;
create policy void_badges_read_self on public.void_user_badges for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists void_badges_admin_select on public.void_user_badges;
create policy void_badges_admin_select on public.void_user_badges for select to authenticated using (exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.role = 'admin'));
drop policy if exists void_badges_admin_insert on public.void_user_badges;
create policy void_badges_admin_insert on public.void_user_badges for insert to authenticated with check (awarded_by = (select auth.uid()) and exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.role = 'admin'));
grant select, insert on public.void_user_badges to authenticated;

create table if not exists public.void_audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists void_audit_logs_created_idx on public.void_audit_logs(created_at desc);
alter table public.void_audit_logs enable row level security;
drop policy if exists void_audit_admin_select on public.void_audit_logs;
create policy void_audit_admin_select on public.void_audit_logs for select to authenticated using (exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.role = 'admin'));
drop policy if exists void_audit_admin_insert on public.void_audit_logs;
create policy void_audit_admin_insert on public.void_audit_logs for insert to authenticated with check (actor_id = (select auth.uid()) and exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.role = 'admin'));
grant select, insert on public.void_audit_logs to authenticated;

create or replace function public.void_guard_profile_privileges()
returns trigger language plpgsql as $$
begin
  if auth.uid() = old.id and not public.ario_is_admin() then
    if old.banned then raise exception 'This profile is restricted from editing.'; end if;
    if new.role is distinct from old.role
      or new.banned is distinct from old.banned
      or new.verified is distinct from old.verified then
      raise exception 'Profile role, ban and verification fields are admin-managed.';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists void_guard_profile_privileges_trigger on public.ario_profiles;
create trigger void_guard_profile_privileges_trigger before update on public.ario_profiles
for each row execute function public.void_guard_profile_privileges();

drop policy if exists void_profile_update_self on public.ario_profiles;
create policy void_profile_update_self on public.ario_profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists void_script_events_admin_read on public.script_events;
create policy void_script_events_admin_read on public.script_events for select to authenticated
using (exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.role = 'admin'));

drop policy if exists announcements_admin_insert_void on public.announcements;
create policy announcements_admin_insert_void on public.announcements for insert to authenticated
with check (created_by = (select auth.uid()) and exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.role = 'admin'));
drop policy if exists announcements_admin_update_void on public.announcements;
create policy announcements_admin_update_void on public.announcements for update to authenticated
using (exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.role = 'admin'))
with check (exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.role = 'admin'));
grant select, insert, update on public.announcements to authenticated;

commit;
