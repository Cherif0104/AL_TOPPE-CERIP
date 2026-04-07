-- Migration: backend applicatif complet sur Supabase
-- Objectif: remplacer les besoins Django API (coaching, plans, finances, admin)

create extension if not exists pgcrypto;

-- ---------- Helpers ----------
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

-- ---------- Profils ----------
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

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_is_active on public.profiles(is_active);

create table if not exists public.platform_settings (
  id text primary key default 'default',
  site_name text default 'AL TOPPE',
  maintenance boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

insert into public.platform_settings(id, site_name, maintenance)
values ('default', 'AL TOPPE', false)
on conflict (id) do nothing;

-- ---------- Coaching ----------
create table if not exists public.altoppe_entrepreneurs (
  id uuid primary key default gen_random_uuid(),
  entrepreneur_user_id uuid references auth.users(id),
  coach_id uuid references auth.users(id),
  civility text,
  first_name text not null default '',
  last_name text not null default '',
  email text,
  phone text,
  whatsapp text,
  cni_number text,
  birth_date date,
  address text,
  business_name text,
  sector text,
  status text not null default 'Nouveau',
  progress int not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_altoppe_entrepreneurs_coach_id on public.altoppe_entrepreneurs(coach_id);
create index if not exists idx_altoppe_entrepreneurs_user_id on public.altoppe_entrepreneurs(entrepreneur_user_id);

create table if not exists public.altoppe_assignments (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id),
  entrepreneur_id uuid not null references public.altoppe_entrepreneurs(id) on delete cascade,
  status text not null default 'active',
  start_date date,
  end_date date,
  duration_days int,
  objectives text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(coach_id, entrepreneur_id)
);

create index if not exists idx_altoppe_assignments_coach_id on public.altoppe_assignments(coach_id);
create index if not exists idx_altoppe_assignments_entrepreneur_id on public.altoppe_assignments(entrepreneur_id);

create table if not exists public.altoppe_coaching_sessions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references public.altoppe_assignments(id) on delete set null,
  coach_id uuid not null references auth.users(id),
  entrepreneur_id uuid not null references public.altoppe_entrepreneurs(id) on delete cascade,
  session_type text not null default 'individual',
  status text not null default 'scheduled',
  scheduled_date timestamptz,
  duration_minutes int not null default 60,
  agenda text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_altoppe_sessions_coach_id on public.altoppe_coaching_sessions(coach_id);
create index if not exists idx_altoppe_sessions_entrepreneur_id on public.altoppe_coaching_sessions(entrepreneur_id);
create index if not exists idx_altoppe_sessions_date on public.altoppe_coaching_sessions(scheduled_date);

-- ---------- Business plans ----------
create table if not exists public.business_plans (
  id uuid primary key default gen_random_uuid(),
  entrepreneur_id uuid references public.altoppe_entrepreneurs(id) on delete set null,
  entrepreneur_name text,
  title text not null,
  summary text,
  activity_title text,
  sector_display text,
  status text not null default 'draft' check (status in ('draft','submitted','under_review','approved','rejected','archived')),
  is_validated boolean not null default false,
  financial_projections jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_business_plans_status on public.business_plans(status);
create index if not exists idx_business_plans_entrepreneur_id on public.business_plans(entrepreneur_id);

create table if not exists public.business_plan_reviews (
  id uuid primary key default gen_random_uuid(),
  business_plan_id uuid not null references public.business_plans(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id),
  validation_type text not null default 'initial_review',
  workflow_type text not null default 'basic',
  is_approved boolean not null,
  comments text,
  created_at timestamptz not null default now()
);

create index if not exists idx_bp_reviews_plan_id on public.business_plan_reviews(business_plan_id);
create index if not exists idx_bp_reviews_reviewer_id on public.business_plan_reviews(reviewer_id);

-- ---------- Finances ----------
create table if not exists public.finance_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('income','expense')),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique(name, type)
);

insert into public.finance_categories(name, type, is_default)
values
  ('Ventes', 'income', true),
  ('Prestations', 'income', true),
  ('Achats', 'expense', true),
  ('Salaires', 'expense', true),
  ('Loyer', 'expense', true)
on conflict (name, type) do nothing;

create table if not exists public.cashflow_entries (
  id uuid primary key default gen_random_uuid(),
  entrepreneur_id uuid not null references public.altoppe_entrepreneurs(id) on delete cascade,
  type text not null check (type in ('income','expense')),
  title text,
  description text,
  amount numeric(14,2) not null default 0,
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

create index if not exists idx_cashflow_entrepreneur_id on public.cashflow_entries(entrepreneur_id);
create index if not exists idx_cashflow_date on public.cashflow_entries(date);
create index if not exists idx_cashflow_type on public.cashflow_entries(type);

-- ---------- Audit ----------
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id),
  action text not null,
  entity text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_actor on public.audit_logs(actor_id);
create index if not exists idx_audit_entity on public.audit_logs(entity, entity_id);

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.platform_settings enable row level security;
alter table public.altoppe_entrepreneurs enable row level security;
alter table public.altoppe_assignments enable row level security;
alter table public.altoppe_coaching_sessions enable row level security;
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

drop policy if exists entrepreneurs_select on public.altoppe_entrepreneurs;
create policy entrepreneurs_select on public.altoppe_entrepreneurs
for select using (
  public.is_admin()
  or coach_id = auth.uid()
  or entrepreneur_user_id = auth.uid()
);

drop policy if exists entrepreneurs_insert on public.altoppe_entrepreneurs;
create policy entrepreneurs_insert on public.altoppe_entrepreneurs
for insert with check (public.is_admin() or coach_id = auth.uid() or entrepreneur_user_id = auth.uid());

drop policy if exists entrepreneurs_update on public.altoppe_entrepreneurs;
create policy entrepreneurs_update on public.altoppe_entrepreneurs
for update using (public.is_admin() or coach_id = auth.uid() or entrepreneur_user_id = auth.uid())
with check (public.is_admin() or coach_id = auth.uid() or entrepreneur_user_id = auth.uid());

drop policy if exists assignments_select on public.altoppe_assignments;
create policy assignments_select on public.altoppe_assignments
for select using (public.is_admin() or coach_id = auth.uid());

drop policy if exists assignments_insert on public.altoppe_assignments;
create policy assignments_insert on public.altoppe_assignments
for insert with check (public.is_admin() or coach_id = auth.uid());

drop policy if exists assignments_update on public.altoppe_assignments;
create policy assignments_update on public.altoppe_assignments
for update using (public.is_admin() or coach_id = auth.uid())
with check (public.is_admin() or coach_id = auth.uid());

drop policy if exists sessions_select on public.altoppe_coaching_sessions;
create policy sessions_select on public.altoppe_coaching_sessions
for select using (
  public.is_admin()
  or coach_id = auth.uid()
  or entrepreneur_id in (
    select e.id from public.altoppe_entrepreneurs e where e.entrepreneur_user_id = auth.uid()
  )
);

drop policy if exists sessions_insert on public.altoppe_coaching_sessions;
create policy sessions_insert on public.altoppe_coaching_sessions
for insert with check (public.is_admin() or coach_id = auth.uid());

drop policy if exists sessions_update on public.altoppe_coaching_sessions;
create policy sessions_update on public.altoppe_coaching_sessions
for update using (public.is_admin() or coach_id = auth.uid())
with check (public.is_admin() or coach_id = auth.uid());

drop policy if exists bp_select on public.business_plans;
create policy bp_select on public.business_plans
for select using (
  public.is_admin()
  or entrepreneur_id in (
    select e.id from public.altoppe_entrepreneurs e where e.coach_id = auth.uid() or e.entrepreneur_user_id = auth.uid()
  )
);

drop policy if exists bp_insert on public.business_plans;
create policy bp_insert on public.business_plans
for insert with check (
  public.is_admin()
  or entrepreneur_id in (
    select e.id from public.altoppe_entrepreneurs e where e.entrepreneur_user_id = auth.uid() or e.coach_id = auth.uid()
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
