-- Redefine is_admin() to allow both our admin users
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce((auth.jwt() ->> 'email') IN ('ric570683@gmail.com', 'inovamundoprinter@gmail.com'), false)
$$;
