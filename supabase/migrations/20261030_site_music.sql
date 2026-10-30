-- Storefront music settings and public audio storage.
create table if not exists public.site_music (
  id integer primary key check (id = 1),
  title text not null default 'เพลงประจำร้าน',
  audio_url text not null default '',
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.site_music enable row level security;

drop policy if exists "Public can read storefront music" on public.site_music;
create policy "Public can read storefront music"
  on public.site_music for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins manage storefront music" on public.site_music;
create policy "Admins manage storefront music"
  on public.site_music for all
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shop-music', 'shop-music', true, 15728640,
  array['audio/mpeg','audio/mp4','audio/aac','audio/ogg','audio/wav','audio/webm'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can listen to shop music" on storage.objects;
create policy "Public can listen to shop music"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'shop-music');

drop policy if exists "Admins upload shop music" on storage.objects;
create policy "Admins upload shop music"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'shop-music'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

drop policy if exists "Admins update shop music" on storage.objects;
create policy "Admins update shop music"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'shop-music'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  with check (
    bucket_id = 'shop-music'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

drop policy if exists "Admins delete shop music" on storage.objects;
create policy "Admins delete shop music"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'shop-music'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

insert into public.site_music (id) values (1) on conflict (id) do nothing;
