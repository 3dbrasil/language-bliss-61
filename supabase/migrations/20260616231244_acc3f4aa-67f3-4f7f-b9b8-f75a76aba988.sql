
CREATE TABLE public.user_custom_dialogues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dialogue_id text NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, dialogue_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_custom_dialogues TO authenticated;
GRANT ALL ON public.user_custom_dialogues TO service_role;

ALTER TABLE public.user_custom_dialogues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own custom dialogues"
  ON public.user_custom_dialogues FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER user_custom_dialogues_set_updated_at
  BEFORE UPDATE ON public.user_custom_dialogues
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX user_custom_dialogues_user_idx ON public.user_custom_dialogues(user_id);

CREATE TABLE public.user_deleted_dialogues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dialogue_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, dialogue_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_deleted_dialogues TO authenticated;
GRANT ALL ON public.user_deleted_dialogues TO service_role;

ALTER TABLE public.user_deleted_dialogues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own deleted dialogues"
  ON public.user_deleted_dialogues FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX user_deleted_dialogues_user_idx ON public.user_deleted_dialogues(user_id);
