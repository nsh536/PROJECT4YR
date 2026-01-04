-- Add threading support (parent_message_id) and read receipt timestamp
ALTER TABLE public.messages 
  ADD COLUMN parent_message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE,
  ADD COLUMN read_at timestamp with time zone;

-- Create index for faster thread queries
CREATE INDEX idx_messages_parent_id ON public.messages(parent_message_id);

-- Create index for faster read receipts lookup
CREATE INDEX idx_messages_read_at ON public.messages(read_at) WHERE read_at IS NOT NULL;