
CREATE POLICY "Authenticated can read lesson-audios"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'lesson-audios');

CREATE POLICY "Authenticated can upload lesson-audios"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'lesson-audios');

CREATE POLICY "Authenticated can update lesson-audios"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'lesson-audios');
