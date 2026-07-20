
-- 1) user_custom_dialogues: fix anon DELETE (was USING true)
DROP POLICY IF EXISTS "Bypass admin can delete dialogues" ON public.user_custom_dialogues;
CREATE POLICY "Bypass admin can delete dialogues"
  ON public.user_custom_dialogues
  FOR DELETE
  TO anon
  USING (user_id = '00000000-0000-4000-8000-000000000001'::uuid);

-- 2) user_deleted_dialogues: remove overlapping anon ALL-true policies
DROP POLICY IF EXISTS "Anon bypass can manage deleted dialogues" ON public.user_deleted_dialogues;
DROP POLICY IF EXISTS "Anon can manage any deleted_dialogues row" ON public.user_deleted_dialogues;
-- Keep only "Users manage own deleted dialogues" (auth.uid() = user_id) for authenticated users.

-- 3) user_stats: remove overlapping anon ALL-true policies
DROP POLICY IF EXISTS "Anon bypass can manage own stats" ON public.user_stats;
DROP POLICY IF EXISTS "Anon can manage any user_stats row" ON public.user_stats;
-- Add DELETE for authenticated owners (was missing) and keep own-row scope for the rest.
CREATE POLICY "Users delete own stats"
  ON public.user_stats
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 4) lesson-audios storage: restrict INSERT / UPDATE to admin only
DROP POLICY IF EXISTS "Authenticated can upload lesson-audios" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update lesson-audios" ON storage.objects;

CREATE POLICY "Admin can upload lesson-audios"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'lesson-audios' AND public.is_admin());

CREATE POLICY "Admin can update lesson-audios"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'lesson-audios' AND public.is_admin())
  WITH CHECK (bucket_id = 'lesson-audios' AND public.is_admin());

CREATE POLICY "Admin can delete lesson-audios"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'lesson-audios' AND public.is_admin());
