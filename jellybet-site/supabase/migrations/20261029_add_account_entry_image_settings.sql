ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS account_entry_image_1 text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS account_entry_image_2 text NOT NULL DEFAULT '';
