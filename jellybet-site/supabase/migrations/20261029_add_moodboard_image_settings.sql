ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS mood_bunny_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS mood_vanity_url text NOT NULL DEFAULT '';
