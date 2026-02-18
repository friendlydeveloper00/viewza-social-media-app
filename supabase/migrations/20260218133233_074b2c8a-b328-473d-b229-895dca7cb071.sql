
-- Tighten the INSERT policy: only allow inserts where actor_id matches the authenticated user
-- This ensures even if called directly, users can only create notifications as themselves
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "Users can create notifications as themselves"
ON public.notifications FOR INSERT
WITH CHECK (auth.uid() = actor_id);
