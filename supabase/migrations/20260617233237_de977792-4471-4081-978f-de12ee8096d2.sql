CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((auth.jwt() ->> 'email') IN ('ric570683@gmail.com', 'inovamundoprinter@gmail.com'), false)
$$;

GRANT SELECT ON public.user_custom_dialogues TO anon;

DROP POLICY IF EXISTS "Anyone authenticated can read dialogues" ON public.user_custom_dialogues;
DROP POLICY IF EXISTS "Anyone can read shared dialogues" ON public.user_custom_dialogues;

CREATE POLICY "Anyone can read shared dialogues"
ON public.user_custom_dialogues
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Only admin can update dialogues" ON public.user_custom_dialogues;
CREATE POLICY "Only admin can update dialogues"
ON public.user_custom_dialogues
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());