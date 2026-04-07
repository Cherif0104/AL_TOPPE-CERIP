# Diagnostic de migration Django -> Supabase

## Objectif

Rendre la plateforme autonome sur Supabase (Auth, Postgres, RLS, Storage, Edge Functions) sans casser le front.

## Stack front actuelle

- React 18 + TypeScript + Vite
- Tailwind + composants Radix/shadcn
- Services front centralises: `src/services/api.ts`, `src/services/coach.ts`
- Supabase client: `@supabase/supabase-js`

## Rôles et besoins fonctionnels

### Entrepreneur
- CTA: consulter profil, sessions, rapports, captures rapides.
- Données: profil entrepreneur, sessions, quick captures, transactions personnelles.
- Persistance: `profiles`, `altoppe_entrepreneurs`, `altoppe_coaching_sessions`, `cashflow_entries`.

### Coach
- CTA: gerer entrepreneurs, assigner, planifier sessions, suivre progres, valider des plans.
- Données: assignations, sessions, entrepreneurs, rapports coach.
- Persistance: `altoppe_assignments`, `altoppe_coaching_sessions`, `business_plan_reviews`.

### Admin
- CTA: stats, analytics, monitoring, utilisateurs CRUD, assignation en masse, parametres.
- Données: utilisateurs, indicateurs globaux, parametres plateforme.
- Persistance: `profiles`, `platform_settings`, `audit_logs`.

### Bailleur
- CTA: consulter/valider plans, suivre portefeuille/programmes.
- Données: plans d'affaires, decisions et suivi financement.
- Persistance: `business_plans`, `business_plan_reviews` (+ tables programmes/candidatures selon roadmap).

## Endpoints fonctionnels migrés vers Supabase

- Admin: `/admin/*`, `/admin/users/*`
- Coaching: `/coaching/*`, `/coaching/assignments/*`, `/coaching/sessions/*`
- Business plans: `/business-plans/*`
- Finances: `/finances/*`
- IA assist: `/ai/text/analyze/`

La compatibilite est assuree par `src/services/supabaseGateway.ts` qui conserve les routes attendues par les composants.

## Schéma et sécurité

- Migration SQL: `supabase/migrations/20260407164000_supabase_full_backend_schema_and_rls.sql`
- RLS par rôle (`admin`, `coach`, `entrepreneur`, `bailleur`) avec `current_app_role()` et `is_admin()`.

## Fonctions serveur (Edge Functions)

- `admin-user-create`
- `admin-user-set-password`
- `admin-aggregates`
- `finance-export-pdf`
- `ai-text-analyze`

## Mode de bascule

Variable d'environnement:

- `VITE_DATA_BACKEND=supabase` -> backend métier Supabase
- `VITE_DATA_BACKEND=remote` -> backend Django
- `VITE_DATA_BACKEND=local` -> backend local de demo

## Vérification manuelle (smoke tests)

1. Login Supabase actif (`VITE_SUPABASE_AUTH_ENABLED=true`).
2. Ouvrir dashboard admin, vérifier stats et liste entrepreneurs.
3. Ouvrir plans d'affaires, charger liste/détails, valider un plan.
4. Ouvrir journal transactions, éditer une ligne, exporter PDF.
5. Ouvrir dashboard coach, sessions et assignations sans appel Django.

