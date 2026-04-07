// Configuration centrale pour les variables d'environnement frontend
// Vite n'expose que les variables préfixées par VITE_
// On définit donc VITE_API_BASE_URL dans les fichiers .env
// et on garde un fallback vers l'API de production.

export const API_BASE_URL: string =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (import.meta as any).env?.VITE_API_BASE_URL ||
  "https://api.altoppe.sn/api";

/** URL du projet Supabase (ex. https://xxxx.supabase.co) */
export const SUPABASE_URL: string =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  String((import.meta as any).env?.VITE_SUPABASE_URL ?? "").trim();

/** Clé publique « anon » (jamais la service_role côté navigateur) */
export const SUPABASE_ANON_KEY: string =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  String((import.meta as any).env?.VITE_SUPABASE_ANON_KEY ?? "").trim();

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/**
 * Si true : connexion / session via Supabase Auth (email+mot de passe par défaut).
 * Si false : comportement historique API Django + JWT.
 */
export function isSupabaseAuthEnabled(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v = String((import.meta as any).env?.VITE_SUPABASE_AUTH_ENABLED ?? "")
    .trim()
    .toLowerCase();
  if (!v || v === "0" || v === "false" || v === "no") return false;
  return isSupabaseConfigured();
}

/**
 * Rôle métier par défaut si absent de user_metadata / app_metadata Supabase.
 * Valeurs : entrepreneur | coach | admin | bailleur
 */
export const SUPABASE_DEFAULT_ROLE: string =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  String((import.meta as any).env?.VITE_SUPABASE_DEFAULT_ROLE ?? "entrepreneur")
    .trim()
    .toLowerCase() || "entrepreneur";

/** URL de redirection après magic link / OAuth (optionnel, ex. https://app.altoppe.sn) */
export const SUPABASE_AUTH_REDIRECT_URL: string =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  String((import.meta as any).env?.VITE_SUPABASE_AUTH_REDIRECT_URL ?? "").trim();

/** Auth Supabase réellement active (config + flag) */
export function isSupabaseAuthActive(): boolean {
  return isSupabaseAuthEnabled();
}

/**
 * Source des données métier (hors auth Supabase éventuelle).
 * - `local` (défaut) : données de démo en mémoire, aucun appel réseau vers l’API Django.
 * - `remote` : API Django à VITE_API_BASE_URL (comportement historique).
 */
export type DataBackendMode = "local" | "remote" | "supabase";

export function getDataBackendMode(): DataBackendMode {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = String((import.meta as any).env?.VITE_DATA_BACKEND ?? "local")
    .trim()
    .toLowerCase();
  if (raw === "supabase" || raw === "sb") return "supabase";
  if (raw === "remote" || raw === "django" || raw === "api") return "remote";
  return "local";
}

/** True si on n’utilise pas l’API Django pour les lectures/écritures métier (voir localDataBackend). */
export function isLocalDataBackend(): boolean {
  return getDataBackendMode() === "local";
}

/** True si les données métier transitent via Supabase (DB + functions + storage). */
export function isSupabaseDataBackend(): boolean {
  return getDataBackendMode() === "supabase";
}

