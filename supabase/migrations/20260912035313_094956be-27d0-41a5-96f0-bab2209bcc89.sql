ALTER TABLE public.ingredients ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE public.supplies ADD COLUMN IF NOT EXISTS photo_url text;