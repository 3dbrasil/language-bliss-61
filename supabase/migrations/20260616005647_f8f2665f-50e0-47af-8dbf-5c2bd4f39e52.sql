
REVOKE EXECUTE ON FUNCTION public.match_phrases(vector, uuid, int, real) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_phrases(vector, uuid, int, real) TO service_role;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

ALTER FUNCTION public.set_updated_at() SET search_path = public;
