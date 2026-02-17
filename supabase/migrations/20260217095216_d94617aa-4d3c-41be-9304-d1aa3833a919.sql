
-- Fix infinite recursion: create a security definer function to check membership
CREATE OR REPLACE FUNCTION public.is_conversation_member(conv_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conv_id AND user_id = auth.uid()
  );
$$;

-- Fix conversation_participants SELECT policy (was self-referencing)
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;
CREATE POLICY "Users can view participants of their conversations"
ON public.conversation_participants
FOR SELECT
USING (public.is_conversation_member(conversation_id));

-- Fix conversations SELECT policy
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
CREATE POLICY "Users can view their conversations"
ON public.conversations
FOR SELECT
USING (public.is_conversation_member(id));

-- Add UPDATE policy for conversations (needed for updated_at)
CREATE POLICY "Users can update their conversations"
ON public.conversations
FOR UPDATE
USING (public.is_conversation_member(id));

-- Fix messages policies
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations"
ON public.messages
FOR SELECT
USING (public.is_conversation_member(conversation_id));

DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;
CREATE POLICY "Users can send messages to their conversations"
ON public.messages
FOR INSERT
WITH CHECK ((auth.uid() = sender_id) AND public.is_conversation_member(conversation_id));

DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
CREATE POLICY "Users can update messages in their conversations"
ON public.messages
FOR UPDATE
USING (public.is_conversation_member(conversation_id));

-- Add is_encrypted flag to messages
ALTER TABLE public.messages ADD COLUMN is_encrypted boolean NOT NULL DEFAULT false;

-- Create user_keys table for E2E encryption public keys
CREATE TABLE public.user_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  public_key text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public keys"
ON public.user_keys
FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own key"
ON public.user_keys
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own key"
ON public.user_keys
FOR UPDATE
USING (auth.uid() = user_id);
