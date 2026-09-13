-- Схема базы для сайта «Саша и Соня».
-- Выполнить целиком в Supabase: SQL Editor -> New query -> Run.
-- Скрипт можно запускать повторно: он не ломает уже существующие данные.

-- ---------------------------------------------------------------------------
-- Кому можно внутрь
-- ---------------------------------------------------------------------------
-- Регистрация в Supabase по умолчанию открыта всему интернету, поэтому одного
-- «пользователь вошёл» мало: нужен явный белый список. Доступ к данным получают
-- только адреса из этой таблицы.

create table if not exists public.allowed_emails (
  email text primary key,
  note  text
);

alter table public.allowed_emails enable row level security;
-- Ни одной политики: читать и менять список можно только отсюда, из SQL Editor.

-- ВПИШИ СВОИ АДРЕСА:
insert into public.allowed_emails (email, note) values
  ('sasha@example.com', 'Саша'),
  ('sonya@example.com', 'Соня')
on conflict (email) do nothing;

-- security definer — чтобы функция могла заглянуть в allowed_emails,
-- которая для обычного пользователя закрыта наглухо.
create or replace function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.allowed_emails
    where email = (auth.jwt() ->> 'email')
  );
$$;

-- ---------------------------------------------------------------------------
-- Таблицы
-- ---------------------------------------------------------------------------
-- Имена колонок в snake_case: клиент переводит их в camelCase на границе
-- (см. src/storage/supabaseAdapter.ts).

create table if not exists public.wishes (
  id          text primary key,
  owner       text not null check (owner in ('sasha', 'sonya')),
  title       text not null,
  note        text default '',
  url         text default '',
  price       text default '',
  priority    text not null default 'normal' check (priority in ('low', 'normal', 'high', 'dream')),
  status      text not null default 'open'   check (status in ('open', 'reserved', 'done')),
  reserved_by text check (reserved_by in ('sasha', 'sonya')),
  image_id    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  text not null check (created_by in ('sasha', 'sonya'))
);

create table if not exists public.moments (
  id         text primary key,
  title      text not null,
  date       date not null,
  text       text default '',
  place      text default '',
  tags       text[] not null default '{}',
  image_ids  text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text not null check (created_by in ('sasha', 'sonya'))
);

create table if not exists public.plans (
  id         text primary key,
  title      text not null,
  note       text default '',
  date       text default '',
  status     text not null default 'idea' check (status in ('idea', 'planned', 'done', 'dropped')),
  who        text not null default 'both' check (who in ('sasha', 'sonya', 'both')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text not null check (created_by in ('sasha', 'sonya'))
);

create index if not exists wishes_owner_idx on public.wishes (owner);
create index if not exists moments_date_idx on public.moments (date desc);

-- ---------------------------------------------------------------------------
-- Права
-- ---------------------------------------------------------------------------
-- Разделения «Саша не видит бронь в своём списке» на уровне базы нет: и без
-- того понятно, что обе половины пары технически могут достать сырые строки.
-- Сюрприз держится на интерфейсе, а не на криптографии, — и этого достаточно.

alter table public.wishes  enable row level security;
alter table public.moments enable row level security;
alter table public.plans   enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['wishes', 'moments', 'plans'] loop
    execute format('drop policy if exists members_all on public.%I', t);
    execute format(
      'create policy members_all on public.%I for all to authenticated
         using (public.is_member()) with check (public.is_member())', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Живое обновление у второго человека
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['wishes', 'moments', 'plans'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Картинки
-- ---------------------------------------------------------------------------
-- Bucket закрытый: файлы отдаются по временным подписанным ссылкам, случайную
-- прямую ссылку подобрать нельзя.

insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;

drop policy if exists media_members_read   on storage.objects;
drop policy if exists media_members_write  on storage.objects;
drop policy if exists media_members_delete on storage.objects;

create policy media_members_read on storage.objects
  for select to authenticated
  using (bucket_id = 'media' and public.is_member());

create policy media_members_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and public.is_member());

create policy media_members_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and public.is_member());
