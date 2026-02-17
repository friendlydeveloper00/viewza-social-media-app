
-- The conversations INSERT policy is RESTRICTIVE, needs to be PERMISSIVE
-- Drop and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
CREATE POLICY "Authenticated users can create conversations"
ON public.conversations
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Also fix conversation_participants INSERT policy
DROP POLICY IF EXISTS "Authenticated users can add participants" ON public.conversation_participants;
CREATE POLICY "Authenticated users can add participants"
ON public.conversation_participants
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Fix conversations SELECT policy to be permissive
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
CREATE POLICY "Users can view their conversations"
ON public.conversations
FOR SELECT
USING (public.is_conversation_member(id));

-- Fix conversations UPDATE policy to be permissive
DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;
CREATE POLICY "Users can update their conversations"
ON public.conversations
FOR UPDATE
USING (public.is_conversation_member(id));

-- Fix conversation_participants SELECT to be permissive
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;
CREATE POLICY "Users can view participants of their conversations"
ON public.conversation_participants
FOR SELECT
USING (public.is_conversation_member(conversation_id));

-- Fix messages policies to be permissive
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

DROP POLICY IF EXISTS "Users can update messages in their conversations" ON public.messages;
CREATE POLICY "Users can update messages in their conversations"
ON public.messages
FOR UPDATE
USING (public.is_conversation_member(conversation_id));

-- Fix user_keys policies to be permissive
DROP POLICY IF EXISTS "Anyone can view public keys" ON public.user_keys;
CREATE POLICY "Anyone can view public keys"
ON public.user_keys
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can insert their own key" ON public.user_keys;
CREATE POLICY "Users can insert their own key"
ON public.user_keys
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own key" ON public.user_keys;
CREATE POLICY "Users can update their own key"
ON public.user_keys
FOR UPDATE
USING (auth.uid() = user_id);
