-- Additive Void Development admin tools. Does not drop or reset existing data.
begin;

create table if not exists public.void_admin_settings (
  setting_key text primary key,
  setting_value jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.void_admin_settings(setting_key, setting_value)
values ('maintenance_mode', '{"enabled": false, "message": "VOID DEVELOPMENT is undergoing scheduled maintenance. Please check back soon."}'::jsonb)
on conflict (setting_key) do nothing;
alter table public.void_admin_settings enable row level security;
drop policy if exists void_admin_settings_admin_select on public.void_admin_settings;
create policy void_admin_settings_admin_select on public.void_admin_settings for select to authenticated
using (exists (select 1 from public.user_roles r where r.user_id=(select auth.uid()) and r.role='admin'));
drop policy if exists void_admin_settings_admin_write on public.void_admin_settings;
create policy void_admin_settings_admin_write on public.void_admin_settings for all to authenticated
using (exists (select 1 from public.user_roles r where r.user_id=(select auth.uid()) and r.role='admin'))
with check (exists (select 1 from public.user_roles r where r.user_id=(select auth.uid()) and r.role='admin'));
-- The public client can read only the maintenance banner state. This is presentation, not an access-control boundary.
drop policy if exists void_admin_settings_public_maintenance_read on public.void_admin_settings;
create policy void_admin_settings_public_maintenance_read on public.void_admin_settings for select to anon, authenticated
using (setting_key='maintenance_mode');
grant select on public.void_admin_settings to anon, authenticated;
grant insert, update, delete on public.void_admin_settings to authenticated;

create table if not exists public.void_script_reports (
  id uuid primary key default gen_random_uuid(),
  script_id uuid references public.scripts(id) on delete set null,
  reporter_id uuid references auth.users(id) on delete set null,
  reason text not null check (char_length(reason) between 3 and 100),
  details text not null default '' check (char_length(details) <= 2000),
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists void_script_reports_status_created_idx on public.void_script_reports(status, created_at desc);
alter table public.void_script_reports enable row level security;
drop policy if exists void_script_reports_insert_self on public.void_script_reports;
create policy void_script_reports_insert_self on public.void_script_reports for insert to authenticated
with check (reporter_id=(select auth.uid()));
drop policy if exists void_script_reports_admin_read on public.void_script_reports;
create policy void_script_reports_admin_read on public.void_script_reports for select to authenticated
using (exists (select 1 from public.user_roles r where r.user_id=(select auth.uid()) and r.role='admin'));
drop policy if exists void_script_reports_admin_update on public.void_script_reports;
create policy void_script_reports_admin_update on public.void_script_reports for update to authenticated
using (exists (select 1 from public.user_roles r where r.user_id=(select auth.uid()) and r.role='admin'))
with check (exists (select 1 from public.user_roles r where r.user_id=(select auth.uid()) and r.role='admin'));
grant select, insert, update on public.void_script_reports to authenticated;

drop policy if exists void_notifications_admin_read_all on public.void_notifications;
create policy void_notifications_admin_read_all on public.void_notifications for select to authenticated
using (exists (select 1 from public.user_roles r where r.user_id=(select auth.uid()) and r.role='admin'));
drop policy if exists void_notifications_admin_update_all on public.void_notifications;
create policy void_notifications_admin_update_all on public.void_notifications for update to authenticated
using (exists (select 1 from public.user_roles r where r.user_id=(select auth.uid()) and r.role='admin'))
with check (exists (select 1 from public.user_roles r where r.user_id=(select auth.uid()) and r.role='admin'));

drop policy if exists void_profiles_admin_update on public.ario_profiles;
create policy void_profiles_admin_update on public.ario_profiles for update to authenticated
using (exists (select 1 from public.user_roles r where r.user_id=(select auth.uid()) and r.role='admin'))
with check (exists (select 1 from public.user_roles r where r.user_id=(select auth.uid()) and r.role='admin'));

commit;
