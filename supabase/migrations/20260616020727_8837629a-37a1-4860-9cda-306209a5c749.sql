DROP POLICY IF EXISTS "Anyone can refresh lesson cover image cache" ON public.lesson_cover_images;

REVOKE UPDATE ON public.lesson_cover_images FROM anon;
REVOKE UPDATE ON public.lesson_cover_images FROM authenticated;