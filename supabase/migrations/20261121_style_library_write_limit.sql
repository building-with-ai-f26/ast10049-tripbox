begin;

alter table public.tripbox_style_libraries
  add column write_window_started_at timestamptz,
  add column writes_in_window integer not null default 0;

create function public.limit_tripbox_style_library_writes()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  write_time timestamptz := clock_timestamp();
begin
  if TG_OP = 'INSERT' then
    new.write_window_started_at := write_time;
    new.writes_in_window := 1;
  elsif old.write_window_started_at is null
        or write_time >= old.write_window_started_at + interval '1 minute' then
    new.write_window_started_at := write_time;
    new.writes_in_window := 1;
  elsif old.writes_in_window >= 60 then
    raise sqlstate 'PT429' using message = 'Too many style saves. Wait a minute and try again.';
  else
    new.write_window_started_at := old.write_window_started_at;
    new.writes_in_window := old.writes_in_window + 1;
  end if;
  return new;
end;
$$;

revoke all on function public.limit_tripbox_style_library_writes() from public, anon, authenticated;

create trigger tripbox_style_library_write_limit
before insert or update on public.tripbox_style_libraries
for each row execute function public.limit_tripbox_style_library_writes();

commit;
