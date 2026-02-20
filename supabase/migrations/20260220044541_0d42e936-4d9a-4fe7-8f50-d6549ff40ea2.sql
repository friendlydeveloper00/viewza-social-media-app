
-- Enable pg_net extension for calling edge functions from triggers
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- Push subscriptions table
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own push subscriptions"
  ON public.push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create push subscriptions"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete push subscriptions"
  ON public.push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- VAPID config table (service role only, no RLS policies = no client access)
CREATE TABLE public.push_config (
  id text PRIMARY KEY DEFAULT 'default',
  vapid_public_key text NOT NULL,
  vapid_private_key text NOT NULL,
  vapid_subject text NOT NULL DEFAULT 'mailto:hello@viewza.app',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.push_config ENABLE ROW LEVEL SECURITY;

-- Trigger function to call send-push edge function via pg_net
CREATE OR REPLACE FUNCTION public.trigger_push_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  project_url text;
  service_key text;
BEGIN
  SELECT decrypted_secret INTO project_url FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1;
  SELECT decrypted_secret INTO service_key FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1;

  IF project_url IS NOT NULL AND service_key IS NOT NULL THEN
    PERFORM net.http_post(
      url := project_url || '/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key
      ),
      body := jsonb_build_object(
        'notification_id', NEW.id,
        'user_id', NEW.user_id,
        'type', NEW.type,
        'actor_id', NEW.actor_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_notification_send_push
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.trigger_push_notification();
