create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  trip_code text not null unique,
  trip_name text not null,
  trip_description text not null,
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_trips (
  user_id uuid not null references public.profiles(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  settlement_pending boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, trip_id)
);

create or replace function public.delete_trip_when_no_user_trips()
returns trigger
language plpgsql
as $$
begin
  delete from public.trips t
  where t.id = old.trip_id
    and not exists (
      select 1
      from public.user_trips ut
      where ut.trip_id = old.trip_id
    );

  return old;
end;
$$;

drop trigger if exists trg_delete_trip_when_no_user_trips on public.user_trips;

create trigger trg_delete_trip_when_no_user_trips
after delete on public.user_trips
for each row
execute function public.delete_trip_when_no_user_trips();

create table if not exists public.mission (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  mission_id uuid not null default gen_random_uuid(),
  mission_name text not null,
  mission_description text not null,
  access smallint not null,
  point bigint not null,
  user_id uuid not null,
  process smallint not null,
  mission_type smallint not null,
  extra_data text,
  additional text,
  constraint mission_user_id_fkey
    foreign key (user_id)
    references public.profiles(id)
    on delete cascade,
  constraint mission_access_check check (access in (0, 1)),
  constraint mission_process_check check (process in (0, 1, 2)),
  constraint mission_type_check check (mission_type in (0, 1, 2, 3)),
  constraint mission_point_check check (point between 0 and 1000)
);

create index if not exists user_trips_trip_id_idx
  on public.user_trips(trip_id);

create index if not exists mission_user_access_idx
  on public.mission(user_id, access);

create index if not exists mission_user_process_idx
  on public.mission(user_id, process);

create index if not exists mission_group_idx
  on public.mission(mission_id);

alter table public.trips enable row level security;
alter table public.user_trips enable row level security;
alter table public.mission enable row level security;
