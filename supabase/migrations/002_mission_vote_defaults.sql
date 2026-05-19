alter table public.mission
  add column if not exists vote bigint;

update public.mission
set vote = 0
where vote is null;

alter table public.mission
  alter column vote type bigint
  using case
    when vote::text ~ '^-?[0-9]+$' then vote::bigint
    else 0
  end,
  alter column vote set default 0,
  alter column vote set not null;

update public.mission
set additional = ''
where additional is null;

alter table public.mission
  alter column additional set default '',
  alter column additional set not null;
