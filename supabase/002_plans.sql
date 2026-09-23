-- Раздел «Планы»: места, что посмотреть и еда.
-- Выполнить в Supabase: SQL Editor -> New query -> Run. Скрипт можно запускать
-- повторно, он ничего не ломает.
--
-- Таблица plans до этого была заготовкой: интерфейса для неё не существовало,
-- поэтому записей в ней нет и терять нечего. Старые колонки (status, who, date)
-- заменяются новыми.

-- Новые колонки.
alter table public.plans add column if not exists kind      text not null default 'place';
alter table public.plans add column if not exists owner     text not null default 'sasha';
alter table public.plans add column if not exists done      boolean not null default false;
alter table public.plans add column if not exists done_at   text not null default '';
alter table public.plans add column if not exists moment_id text;
alter table public.plans add column if not exists address   text not null default '';
alter table public.plans add column if not exists genre     text not null default '';
alter table public.plans add column if not exists url       text not null default '';
alter table public.plans add column if not exists food_kind text;
alter table public.plans add column if not exists vendor    text not null default '';
alter table public.plans add column if not exists recipe    text not null default '';
alter table public.plans add column if not exists image_ids text[] not null default '{}';

-- Старые колонки заготовки больше не нужны.
alter table public.plans drop column if exists status;
alter table public.plans drop column if exists who;
alter table public.plans drop column if exists date;

-- Допустимые значения. Ограничения пересоздаём, чтобы скрипт можно было
-- запускать повторно.
alter table public.plans drop constraint if exists plans_kind_check;
alter table public.plans add  constraint plans_kind_check
  check (kind in ('place', 'watch', 'food'));

alter table public.plans drop constraint if exists plans_owner_check;
alter table public.plans add  constraint plans_owner_check
  check (owner in ('sasha', 'sonya'));

alter table public.plans drop constraint if exists plans_food_kind_check;
alter table public.plans add  constraint plans_food_kind_check
  check (food_kind is null or food_kind in ('cafe', 'delivery', 'cook'));

create index if not exists plans_kind_owner_idx on public.plans (kind, owner);

-- Права и живое обновление уже настроены в schema.sql и на новые колонки
-- распространяются сами: политика выдана на таблицу целиком.
