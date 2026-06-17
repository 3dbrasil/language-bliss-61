ALTER TABLE public.user_custom_dialogues DROP CONSTRAINT IF EXISTS user_custom_dialogues_user_id_fkey;
ALTER TABLE public.user_deleted_dialogues DROP CONSTRAINT IF EXISTS user_deleted_dialogues_user_id_fkey;
ALTER TABLE public.user_stats DROP CONSTRAINT IF EXISTS user_stats_user_id_fkey;