DROP POLICY IF EXISTS "Anyone can add lesson cover image cache" ON public.lesson_cover_images;
REVOKE INSERT ON public.lesson_cover_images FROM anon;
CREATE POLICY "Authenticated users can add lesson cover image cache"
ON public.lesson_cover_images
FOR INSERT
TO authenticated
WITH CHECK (
  length(cache_key) BETWEEN 1 AND 160
  AND length(title) BETWEEN 1 AND 180
  AND length(image_url) BETWEEN 1 AND 1200
  AND image_url ~ '^https://'
  AND source = ANY (ARRAY['unsplash','fallback'])
);