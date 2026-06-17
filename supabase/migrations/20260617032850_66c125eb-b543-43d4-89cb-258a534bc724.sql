DROP POLICY IF EXISTS "Anyone can read lesson-audios" ON storage.objects;

CREATE POLICY "Anyone can read lesson-audios"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'lesson-audios');