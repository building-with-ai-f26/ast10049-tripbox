-- Proposed account-backed style library. Do not apply before security review.
-- References are small, user-provided previews; original trip photos are not stored.
begin;
create table public.tripbox_style_libraries (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 1 check (revision > 0),
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  constraint style_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint style_payload_size check (octet_length(payload::text) <= 8388608)
);
alter table public.tripbox_style_libraries enable row level security;
revoke all on public.tripbox_style_libraries from public, anon, authenticated;
grant select, insert, update on public.tripbox_style_libraries to authenticated;
create policy "Read own style library" on public.tripbox_style_libraries
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Create own style library" on public.tripbox_style_libraries
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own style library" on public.tripbox_style_libraries
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
commit;
