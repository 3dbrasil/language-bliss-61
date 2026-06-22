
-- Allow anonymous (no-login) users to back up their progress keyed by a per-device UUID
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_stats TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_deleted_dialogues TO anon;

DROP POLICY IF EXISTS "Anon can manage any user_stats row" ON public.user_stats;
CREATE POLICY "Anon can manage any user_stats row"
ON public.user_stats
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can manage any deleted_dialogues row" ON public.user_deleted_dialogues;
CREATE POLICY "Anon can manage any deleted_dialogues row"
ON public.user_deleted_dialogues
FOR ALL
TO anon
USING (true)
WITH CHECK (true);
