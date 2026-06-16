CREATE UNIQUE INDEX IF NOT EXISTS uniq_lesson_cover_images_photo_identity
ON public.lesson_cover_images ((
  CASE
    WHEN image_url LIKE 'https://images.unsplash.com/%' OR image_url LIKE 'https://images.pexels.com/%'
      THEN split_part(image_url, '?', 1)
    ELSE image_url
  END
));