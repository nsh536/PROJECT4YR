ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text DEFAULT '',
  ADD COLUMN IF NOT EXISTS linkedin_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS github_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS portfolio_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS bg_image_url text DEFAULT '';