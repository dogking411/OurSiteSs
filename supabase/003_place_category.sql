-- Подразделы мест: парк, галерея, кино, театр — что угодно.
-- Выполнить в Supabase: SQL Editor -> New query -> Run. Запускать можно повторно.
--
-- Списка подразделов нигде не хранится: он складывается из того, что уже
-- заведено в планах. Поэтому нужна всего одна колонка.

alter table public.plans add column if not exists category text not null default '';

create index if not exists plans_category_idx on public.plans (category);
