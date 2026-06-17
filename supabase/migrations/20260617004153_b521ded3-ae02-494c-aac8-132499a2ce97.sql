
-- 1) Admin check via JWT email (simple, single-admin model)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((auth.jwt() ->> 'email') = 'ric570683@gmail.com', false)
$$;

-- 2) Per-user progress table
create table if not exists public.user_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.user_stats to authenticated;
grant all on public.user_stats to service_role;

alter table public.user_stats enable row level security;

create policy "Users read own stats"
on public.user_stats for select to authenticated
using (auth.uid() = user_id);

create policy "Users insert own stats"
on public.user_stats for insert to authenticated
with check (auth.uid() = user_id);

create policy "Users update own stats"
on public.user_stats for update to authenticated
using (auth.uid() = user_id);

create trigger user_stats_set_updated_at
before update on public.user_stats
for each row execute function public.set_updated_at();

-- 3) Make custom dialogues shared (admin-managed), kept under user_id of admin
drop policy if exists "Users manage own custom dialogues" on public.user_custom_dialogues;
drop policy if exists "Users can view their own custom dialogues" on public.user_custom_dialogues;
drop policy if exists "Users can insert their own custom dialogues" on public.user_custom_dialogues;
drop policy if exists "Users can update their own custom dialogues" on public.user_custom_dialogues;
drop policy if exists "Users can delete their own custom dialogues" on public.user_custom_dialogues;

create policy "Anyone authenticated can read dialogues"
on public.user_custom_dialogues for select to authenticated
using (true);

create policy "Only admin can insert dialogues"
on public.user_custom_dialogues for insert to authenticated
with check (public.is_admin());

create policy "Only admin can update dialogues"
on public.user_custom_dialogues for update to authenticated
using (public.is_admin());

create policy "Only admin can delete dialogues"
on public.user_custom_dialogues for delete to authenticated
using (public.is_admin());
