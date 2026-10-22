alter table public.scripts add column if not exists release_status text not null default 'active';
alter table public.scripts add column if not exists banner_url text;
alter table public.scripts add column if not exists showcase_url text;
alter table public.published_script_metadata add column if not exists release_status text not null default 'active';
alter table public.published_script_metadata add column if not exists banner_url text;
alter table public.published_script_metadata add column if not exists showcase_url text;
alter table public.scripts drop constraint if exists scripts_release_status_check;
alter table public.scripts add constraint scripts_release_status_check check (release_status in ('active','patched','working_on'));
alter table public.published_script_metadata drop constraint if exists published_script_metadata_release_status_check;
alter table public.published_script_metadata add constraint published_script_metadata_release_status_check check (release_status in ('active','patched','working_on'));
create or replace function private.sync_published_script_metadata()
returns trigger language plpgsql security definer set search_path to ''
as $function$
begin
  if tg_op = 'DELETE' then
    delete from public.published_script_metadata where id = old.id;
    return old;
  end if;
  if new.status = 'published' then
    insert into public.published_script_metadata
      (id,name,slug,category,description,link,game_id,is_featured,view_count,created_at,updated_at,release_status,banner_url,showcase_url)
    values
      (new.id,new.name,new.slug,new.category,new.description,new.link,new.game_id,new.is_featured,new.view_count,new.created_at,new.updated_at,new.release_status,new.banner_url,new.showcase_url)
    on conflict (id) do update set
      name=excluded.name,slug=excluded.slug,category=excluded.category,description=excluded.description,link=excluded.link,
      game_id=excluded.game_id,is_featured=excluded.is_featured,view_count=excluded.view_count,updated_at=excluded.updated_at,
      release_status=excluded.release_status,banner_url=excluded.banner_url,showcase_url=excluded.showcase_url;
  else
    delete from public.published_script_metadata where id = new.id;
  end if;
  return new;
end;
$function$;
