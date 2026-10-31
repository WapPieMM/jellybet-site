-- Store the Google Drive / Google Docs portfolio link in site settings.
alter table public.site_settings
  add column if not exists portfolio_drive_url text;

-- Refresh PostgREST so the new column is available through the API immediately.
notify pgrst, 'reload schema';
