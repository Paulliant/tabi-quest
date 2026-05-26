alter table public.mission
  drop constraint if exists mission_access_check;

alter table public.mission
  add constraint mission_access_check check (access in (0, 1, 2));
