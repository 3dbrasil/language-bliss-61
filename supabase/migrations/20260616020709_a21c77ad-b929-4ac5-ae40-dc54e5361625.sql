CREATE TABLE IF NOT EXISTS public.lesson_cover_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text NOT NULL UNIQUE,
  title text NOT NULL,
  situation text,
  image_url text NOT NULL UNIQUE,
  source text NOT NULL DEFAULT 'unsplash',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.lesson_cover_images TO anon;
GRANT SELECT, INSERT, UPDATE ON public.lesson_cover_images TO authenticated;
GRANT ALL ON public.lesson_cover_images TO service_role;

ALTER TABLE public.lesson_cover_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read lesson cover image cache"
ON public.lesson_cover_images
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Anyone can add lesson cover image cache"
ON public.lesson_cover_images
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(cache_key) BETWEEN 1 AND 160
  AND length(title) BETWEEN 1 AND 180
  AND length(image_url) BETWEEN 1 AND 1200
  AND image_url ~ '^https://'
  AND source IN ('unsplash', 'fallback')
);

CREATE POLICY "Anyone can refresh lesson cover image cache"
ON public.lesson_cover_images
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (
  length(cache_key) BETWEEN 1 AND 160
  AND length(title) BETWEEN 1 AND 180
  AND length(image_url) BETWEEN 1 AND 1200
  AND image_url ~ '^https://'
  AND source IN ('unsplash', 'fallback')
);

CREATE OR REPLACE FUNCTION public.update_lesson_cover_images_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_lesson_cover_images_updated_at ON public.lesson_cover_images;
CREATE TRIGGER update_lesson_cover_images_updated_at
BEFORE UPDATE ON public.lesson_cover_images
FOR EACH ROW
EXECUTE FUNCTION public.update_lesson_cover_images_updated_at();

CREATE INDEX IF NOT EXISTS idx_lesson_cover_images_created_at ON public.lesson_cover_images (created_at DESC);