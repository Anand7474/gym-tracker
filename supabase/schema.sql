-- Gym Tracker: one row per user per day. Run this once in Supabase → SQL Editor.
create table if not exists public.day_logs (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  date       text        not null,               -- YYYY-MM-DD, local date
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.day_logs enable row level security;

-- Each signed-in user can only see and change their own rows.
create policy "read own days"   on public.day_logs for select using (auth.uid() = user_id);
create policy "insert own days" on public.day_logs for insert with check (auth.uid() = user_id);
create policy "update own days" on public.day_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own days" on public.day_logs for delete using (auth.uid() = user_id);
