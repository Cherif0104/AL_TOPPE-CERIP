/**
 * Connexion rapide par rôle — **Supabase Auth uniquement**.
 * Crée les utilisateurs dans le dashboard Supabase (Authentication) avec :
 * - le même mot de passe partagé (`VITE_SUPABASE_TEST_PASSWORD` ou défaut ci-dessous) ;
 * - `user_metadata.role` = entrepreneur | coach | bailleur | admin.
 * Emails surchargeables via VITE_SUPABASE_TEST_EMAIL_*.
 */

export const SUPABASE_TEST_LOGIN_PASSWORD = "TestSupabase2026!";

export const SUPABASE_QUICK_TEST_ROLES = [
  { key: "entrepreneur", label: "Entrepreneur" },
  { key: "coach", label: "Coach" },
  { key: "bailleur", label: "Bailleur" },
  { key: "admin", label: "Administrateur" },
] as const;

export type QuickTestRoleKey = (typeof SUPABASE_QUICK_TEST_ROLES)[number]["key"];

const SUPABASE_EMAIL_DEFAULTS: Record<QuickTestRoleKey, string> = {
  entrepreneur: "test-entrepreneur@example.com",
  coach: "test-coach@example.com",
  bailleur: "test-bailleur@example.com",
  admin: "test-admin@example.com",
};

const SUPABASE_EMAIL_ENV: Record<QuickTestRoleKey, string> = {
  entrepreneur: "VITE_SUPABASE_TEST_EMAIL_ENTREPRENEUR",
  coach: "VITE_SUPABASE_TEST_EMAIL_COACH",
  bailleur: "VITE_SUPABASE_TEST_EMAIL_BAILLEUR",
  admin: "VITE_SUPABASE_TEST_EMAIL_ADMIN",
};

export function resolveSupabaseTestEmail(key: QuickTestRoleKey): string {
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
