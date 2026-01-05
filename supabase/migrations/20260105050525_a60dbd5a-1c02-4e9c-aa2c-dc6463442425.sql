-- Add notification preference columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_notifications boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS message_notifications boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS application_notifications boolean DEFAULT true;