
-- Extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  cefr_target TEXT NOT NULL DEFAULT 'A2',
  register TEXT NOT NULL DEFAULT 'neutral',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own profile" ON public.profiles FOR ALL
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Threads
CREATE TABLE public.ai_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Nova conversa',
  lesson_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ai_threads_user_idx ON public.ai_threads(user_id, updated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_threads TO authenticated;
GRANT ALL ON public.ai_threads TO service_role;
ALTER TABLE public.ai_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own threads" ON public.ai_threads FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Messages
CREATE TABLE public.ai_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.ai_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  parts JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ai_messages_thread_idx ON public.ai_messages(thread_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_messages TO authenticated;
GRANT ALL ON public.ai_messages TO service_role;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own messages" ON public.ai_messages FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "users insert own messages" ON public.ai_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Phrases (vector memory)
CREATE TABLE public.ai_phrases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  translation TEXT,
  cefr TEXT,
  tags TEXT[] DEFAULT '{}',
  register TEXT,
  mastery REAL NOT NULL DEFAULT 0,
  seen_count INT NOT NULL DEFAULT 1,
  lesson_id TEXT,
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ai_phrases_user_idx ON public.ai_phrases(user_id, last_seen_at DESC);
CREATE INDEX ai_phrases_embedding_idx ON public.ai_phrases
  USING hnsw (embedding vector_cosine_ops);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_phrases TO authenticated;
GRANT ALL ON public.ai_phrases TO service_role;
ALTER TABLE public.ai_phrases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own phrases" ON public.ai_phrases FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Topic proficiency
CREATE TABLE public.ai_topic_proficiency (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  cefr TEXT NOT NULL DEFAULT 'A1',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, topic)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_topic_proficiency TO authenticated;
GRANT ALL ON public.ai_topic_proficiency TO service_role;
ALTER TABLE public.ai_topic_proficiency ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own proficiency" ON public.ai_topic_proficiency FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_set_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER threads_set_updated BEFORE UPDATE ON public.ai_threads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Semantic search function
CREATE OR REPLACE FUNCTION public.match_phrases(
  query_embedding vector(1536),
  match_user_id UUID,
  match_count INT DEFAULT 6,
  min_similarity REAL DEFAULT 0.5
)
RETURNS TABLE (id UUID, text TEXT, translation TEXT, cefr TEXT, tags TEXT[], similarity REAL)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.text, p.translation, p.cefr, p.tags,
         (1 - (p.embedding <=> query_embedding))::real AS similarity
  FROM public.ai_phrases p
  WHERE p.user_id = match_user_id
    AND p.embedding IS NOT NULL
    AND (1 - (p.embedding <=> query_embedding)) >= min_similarity
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
$$;
