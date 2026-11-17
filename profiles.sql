-- ============================================================
-- FreelanceHub Pro — Таблиця profiles + тригер + RLS
-- ============================================================
-- Вставте цей скрипт у Supabase SQL Editor і виконайте.
-- Створює таблицю профілів користувачів, прив'язану до auth.users,
-- автоматичний тригер для створення запису при реєстрації
-- та політики безпеки (Row Level Security).
-- ============================================================

-- 1. Таблиця профілів
create table if not exists public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  email            text,
  full_name        text,
  balance          numeric default 0,
  regular_clients  jsonb default '[]'::jsonb,
  discount_percent int default 0,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- 2. Увімкнення Row Level Security
alter table public.profiles enable row level security;

-- 3. Політика: користувач може читати лише свій профіль
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- 4. Політика: користувач може оновлювати лише свій профіль
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 5. Функція автоматичного створення профілю при реєстрації
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 6. Тригер: викликає функцію при створенні нового користувача в auth.users
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
