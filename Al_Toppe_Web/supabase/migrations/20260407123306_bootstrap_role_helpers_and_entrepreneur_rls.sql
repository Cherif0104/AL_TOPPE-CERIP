create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'role', ''),
    nullif((auth.jwt() -> 'app_metadata' ->> 'role'), ''),
    nullif((auth.jwt() -> 'user_metadata' ->> 'role'), ''),
    'entrepreneur'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.current_app_role() in ('admin', 'administrateur');
$$;

alter table if exists public.altoppe_entrepreneurs enable row level security;

drop policy if exists entrepreneurs_select on public.altoppe_entrepreneurs;
create policy entrepreneurs_select on public.altoppe_entrepreneurs
for select
using (
  public.is_admin()
  or coach_id = auth.uid()
  or entrepreneur_user_id = auth.uid()
);

drop policy if exists entrepreneurs_insert on public.altoppe_entrepreneurs;
create policy entrepreneurs_insert on public.altoppe_entrepreneurs
for insert
with check (
  public.is_admin()
  or coach_id = auth.uid()
  or entrepreneur_user_id = auth.uid()
);

drop policy if exists entrepreneurs_update on public.altoppe_entrepreneurs;
create policy entrepreneurs_update on public.altoppe_entrepreneurs
for update
using (
  public.is_admin()
  or coach_id = auth.uid()
  or entrepreneur_user_id = auth.uid()
)
with check (
  public.is_admin()
  or coach_id = auth.uid()
  or entrepreneur_user_id = auth.uid()
);
