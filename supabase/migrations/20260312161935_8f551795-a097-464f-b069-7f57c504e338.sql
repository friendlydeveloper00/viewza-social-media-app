
-- push_config is an internal config table, allow authenticated to read
CREATE POLICY "Anyone can read push config"
  ON public.push_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage push config"
  ON public.push_config FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
