-- Ensure all image-selection settings used by the admin form exist.
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS account_entry_image_1 text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS account_entry_image_2 text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS mood_bunny_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS mood_vanity_url text NOT NULL DEFAULT '';
