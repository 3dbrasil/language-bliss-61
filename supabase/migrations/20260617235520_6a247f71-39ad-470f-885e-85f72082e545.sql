
-- Allow the bypass-admin (anon role with fixed UUID) to manage shared dialogues.
-- The bypass session is granted client-side only when the user logs in via the
-- admin bypass flow, which writes a fixed UUID to localStorage.

CREATE POLICY "Bypass admin can insert dialogues"
ON public.user_custom_dialogues
FOR INSERT TO anon
WITH CHECK (user_id = '00000000-0000-4000-8000-000000000001'::uuid);

CREATE POLICY "Bypass admin can update dialogues"
ON public.user_custom_dialogues
FOR UPDATE TO anon
USING (user_id = '00000000-0000-4000-8000-000000000001'::uuid)
WITH CHECK (user_id = '00000000-0000-4000-8000-000000000001'::uuid);

CREATE POLICY "Bypass admin can delete dialogues"
ON public.user_custom_dialogues
FOR DELETE TO anon
USING (true);

-- Also allow bypass users to manage their own hide-list & stats
CREATE POLICY "Anon bypass can manage deleted dialogues"
ON public.user_deleted_dialogues
FOR ALL TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "Anon bypass can manage own stats"
ON public.user_stats
FOR ALL TO anon
USING (true)
WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_custom_dialogues TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_deleted_dialogues TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_stats TO anon;
