/**
 * Drapeaux pour continuer le produit sans casser l’existant.
 * Tout ce qui est « hérité » reste activé par défaut.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const env = (import.meta as any).env ?? {};

function truthy(v: string | undefined, defaultTrue = false): boolean {
  if (v === undefined || v === "") return defaultTrue;
  return ["1", "true", "yes", "on"].includes(String(v).toLowerCase());
}

/**
 * API Django / DRF historique (équipe précédente). Toujours true par défaut.
 * Ne passer à false que quand une migration complète est faite.
 */
export function isLegacyDjangoApiEnabled(): boolean {
  return truthy(env.VITE_LEGACY_DJANGO_API_ENABLED, true);
}

/**
 * Autorise les nouvelles fonctionnalités sur la voie parallèle (ex. Supabase).
 * Les écrans qui dépendent uniquement de ça vérifient aussi isSupabaseConfigured().
 */
export function isParallelFeaturesEnabled(): boolean {
  return truthy(env.VITE_PARALLEL_FEATURES_ENABLED, false);
}

/**
 * Pratique pour un composant : nouvelle fonctionnalité indépendante utilisable en prod.
 */
export function canUseParallelStack(): boolean {
  return isParallelFeaturesEnabled();
}
