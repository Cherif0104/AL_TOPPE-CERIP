/**
 * Continuité après reprise de projet : tout nouveau flux « indépendant » passe par ici.
 *
 * - Ne pas modifier les services legacy pour des besoins neufs : ajouter un module
 *   sous integrations/ ou utiliser getSupabase() + tables dédiées.
 * - L’API Django existante reste importée via apiService ; on ne la casse pas.
 */

import { isSupabaseConfigured } from "@/config";
import {
  canUseParallelStack,
  isLegacyDjangoApiEnabled,
  isParallelFeaturesEnabled,
} from "@/config/featureFlags";
import { getSupabase } from "@/lib/supabaseClient";
import { apiService } from "@/services/api";

export { apiService };

/** Accès à l’API Django historique (JWT, endpoints métier). */
export function getLegacyApi() {
  if (!isLegacyDjangoApiEnabled()) {
    console.warn(
      "[continuity] VITE_LEGACY_DJANGO_API_ENABLED est désactivé — l’app peut être incomplète.",
    );
  }
  return apiService;
}

export { getSupabase, isSupabaseConfigured };

export {
  canUseParallelStack,
  isLegacyDjangoApiEnabled,
  isParallelFeaturesEnabled,
};

/**
 * Client Supabase prêt pour les nouvelles fonctionnalités (si .env + flag).
 * Retourne null si non configuré : l’UI peut masquer ou dégrader sans erreur.
 */
export function getParallelClient() {
  if (!isParallelFeaturesEnabled() || !isSupabaseConfigured()) {
    return null;
  }
  return getSupabase();
}
