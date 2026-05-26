alter table public.user_trips
  add column if not exists settlement_progress smallint;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_trips'
      and column_name = 'settlement_pending'
  ) then
    update public.user_trips
    set settlement_progress = case
      when settlement_pending is true then 1
      else 0
    end
    where settlement_progress is null;
  else
    update public.user_trips
    set settlement_progress = 0
    where settlement_progress is null;
  end if;
end $$;

alter table public.user_trips
  alter column settlement_progress set default 0,
  alter column settlement_progress set not null;

alter table public.user_trips
  drop constraint if exists user_trips_settlement_progress_check;

alter table public.user_trips
  add constraint user_trips_settlement_progress_check check (settlement_progress in (0, 1, 2));
