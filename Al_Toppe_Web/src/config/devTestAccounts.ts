/**
 * Comptes alignés sur `python manage.py seed_test_users` (backend).
 * Si tu changes le mot de passe avec --password, mets à jour DEV_TEST_LOGIN_PASSWORD
 * ou définis VITE_DEV_TEST_PASSWORD dans .env (optionnel, voir LoginForm).
 */
export const DEV_TEST_LOGIN_PASSWORD = "Testaltoppe2026!";

export const DEV_TEST_ACCOUNTS = [
  {
    key: "entrepreneur",
    label: "Entrepreneur",
    phone: "221701001001",
  },
  {
    key: "coach",
    label: "Coach",
    phone: "221701001002",
  },
  {
    key: "bailleur",
    label: "Bailleur",
    phone: "221701001003",
  },
  {
    key: "admin",
    label: "Administrateur",
    phone: "221701001004",
  },
] as const;

export type DevTestAccountKey = (typeof DEV_TEST_ACCOUNTS)[number]["key"];

/** Mot de passe partagé pour les utilisateurs de test Supabase Auth (à créer dans le dashboard). */
export const SUPABASE_TEST_LOGIN_PASSWORD = "TestSupabase2026!";

/**
 * Rôles pour les comptes Supabase — emails par défaut @example.com.
 * Crée les utilisateurs dans Supabase (Authentication) avec le même mot de passe
 * et `user_metadata.role` = entrepreneur | coach | bailleur | admin.
 * Surcharge possible : VITE_SUPABASE_TEST_EMAIL_ENTREPRENEUR, _COACH, _BAILLEUR, _ADMIN.
 */
const SUPABASE_EMAIL_DEFAULTS: Record<DevTestAccountKey, string> = {
  entrepreneur: "test-entrepreneur@example.com",
  coach: "test-coach@example.com",
  bailleur: "test-bailleur@example.com",
  admin: "test-admin@example.com",
};

const SUPABASE_EMAIL_ENV: Record<DevTestAccountKey, string> = {
  entrepreneur: "VITE_SUPABASE_TEST_EMAIL_ENTREPRENEUR",
  coach: "VITE_SUPABASE_TEST_EMAIL_COACH",
  bailleur: "VITE_SUPABASE_TEST_EMAIL_BAILLEUR",
  admin: "VITE_SUPABASE_TEST_EMAIL_ADMIN",
};

export function resolveSupabaseTestEmail(key: DevTestAccountKey): string {
  const envName = SUPABASE_EMAIL_ENV[key];
  const raw = (import.meta.env as Record<string, string | undefined>)[envName];
  const fromEnv = typeof raw === "string" ? raw.trim() : "";
  if (fromEnv) return fromEnv;
  return SUPABASE_EMAIL_DEFAULTS[key];
}

export function getSupabaseTestPassword(): string {
  const raw = import.meta.env.VITE_SUPABASE_TEST_PASSWORD;
  const s = typeof raw === "string" ? raw.trim() : "";
  return s || SUPABASE_TEST_LOGIN_PASSWORD;
}
