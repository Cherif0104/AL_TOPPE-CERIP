create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  phone text,
  full_name text,
  role text not null default 'entrepreneur' check (role in ('entrepreneur','coach','admin','bailleur')),
  language text not null default 'fr',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_settings (
  id text primary key default 'default',
  site_name text not null default 'AL TOPPE',
  maintenance boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.platform_settings(id, site_name, maintenance)
values ('default', 'AL TOPPE', false)
on conflict (id) do nothing;

create table if not exists public.business_plans (
  id uuid primary key default gen_random_uuid(),
  entrepreneur_id uuid references public.altoppe_entrepreneurs(id) on delete set null,
  entrepreneur_name text,
  activity_title text,
  sector_display text,
  title text not null,
  summary text,
  status text not null default 'draft',
  is_validated boolean not null default false,
  financial_projections jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_plan_reviews (
  id uuid primary key default gen_random_uuid(),
  business_plan_id uuid not null references public.business_plans(id) on delete cascade,
  reviewer_id uuid references auth.users(id),
  validation_type text not null default 'initial_review',
  workflow_type text not null default 'basic',
  is_approved boolean not null default false,
  comments text,
  created_at timestamptz not null default now()
);

create table if not exists public.finance_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('income','expense')),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.finance_categories(name, type, is_default)
values
  ('Ventes', 'income', true),
  ('Prestations', 'income', true),
  ('Subventions', 'income', true),
  ('Achats', 'expense', true),
  ('Transport', 'expense', true),
  ('Loyer', 'expense', true),
  ('Autres', 'expense', true)
on conflict do nothing;

create table if not exists public.cashflow_entries (
  id uuid primary key default gen_random_uuid(),
  entrepreneur_id uuid not null references public.altoppe_entrepreneurs(id) on delete cascade,
  type text not null check (type in ('income','expense')),
  title text not null,
  description text,
  amount numeric(15,2) not null default 0,
  date date not null default current_date,
  category_id uuid references public.finance_categories(id),
  category_name text,
  payment_method text,
  client_supplier text,
  invoice_number text,
  has_invoice boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id),
  action text not null,
  entity text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.platform_settings enable row level security;
alter table public.business_plans enable row level security;
alter table public.business_plan_reviews enable row level security;
alter table public.finance_categories enable row level security;
alter table public.cashflow_entries enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select using (public.is_admin() or id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
for update using (public.is_admin() or id = auth.uid())
with check (public.is_admin() or id = auth.uid());

drop policy if exists profiles_insert_admin on public.profiles;
create policy profiles_insert_admin on public.profiles
for insert with check (public.is_admin() or id = auth.uid());

drop policy if exists settings_admin_rw on public.platform_settings;
create policy settings_admin_rw on public.platform_settings
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists bp_select on public.business_plans;
create policy bp_select on public.business_plans
for select using (
  public.is_admin()
  or entrepreneur_id in (
    select e.id from public.altoppe_entrepreneurs e
    where e.coach_id = auth.uid() or e.entrepreneur_user_id = auth.uid()
  )
);

drop policy if exists bp_insert on public.business_plans;
create policy bp_insert on public.business_plans
for insert with check (
  public.is_admin()
  or entrepreneur_id in (
    select e.id from public.altoppe_entrepreneurs e
    where e.entrepreneur_user_id = auth.uid() or e.coach_id = auth.uid()
  )
);

drop policy if exists bp_update on public.business_plans;
create policy bp_update on public.business_plans
for update using (
  public.is_admin()
  or entrepreneur_id in (
    select e.id from public.altoppe_entrepreneurs e where e.coach_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or entrepreneur_id in (
    select e.id from public.altoppe_entrepreneurs e where e.coach_id = auth.uid()
  )
);

drop policy if exists bp_reviews_select on public.business_plan_reviews;
create policy bp_reviews_select on public.business_plan_reviews
for select using (public.is_admin() or reviewer_id = auth.uid());

drop policy if exists bp_reviews_insert on public.business_plan_reviews;
create policy bp_reviews_insert on public.business_plan_reviews
for insert with check (public.is_admin() or reviewer_id = auth.uid());

drop policy if exists categories_select on public.finance_categories;
create policy categories_select on public.finance_categories
for select using (true);

drop policy if exists cashflow_select on public.cashflow_entries;
create policy cashflow_select on public.cashflow_entries
for select using (
  public.is_admin()
  or entrepreneur_id in (
    select e.id
    from public.altoppe_entrepreneurs e
    where e.coach_id = auth.uid() or e.entrepreneur_user_id = auth.uid()
  )
);

drop policy if exists cashflow_insert on public.cashflow_entries;
create policy cashflow_insert on public.cashflow_entries
for insert with check (
  public.is_admin()
  or entrepreneur_id in (
    select e.id from public.altoppe_entrepreneurs e where e.coach_id = auth.uid() or e.entrepreneur_user_id = auth.uid()
  )
);

drop policy if exists cashflow_update on public.cashflow_entries;
create policy cashflow_update on public.cashflow_entries
for update using (
  public.is_admin()
  or entrepreneur_id in (
    select e.id from public.altoppe_entrepreneurs e where e.coach_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or entrepreneur_id in (
    select e.id from public.altoppe_entrepreneurs e where e.coach_id = auth.uid()
  )
);

drop policy if exists audit_select_admin on public.audit_logs;
create policy audit_select_admin on public.audit_logs
for select using (public.is_admin());
