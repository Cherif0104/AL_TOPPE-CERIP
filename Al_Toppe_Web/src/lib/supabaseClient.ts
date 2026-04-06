import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/config";

let browserClient: SupabaseClient | null = null;

/**
 * Client Supabase pour le navigateur (clé anon uniquement).
 * Retourne null si VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquent dans .env
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    if (import.meta.env.DEV) {
      console.warn(
        "[Supabase] Renseigne VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env (dashboard → API).",
      );
    }
    return null;
  }
  if (!browserClient) {
    try {
      browserClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } catch (e) {
      console.error("[Supabase] createClient:", e);
      return null;
    }
  }
  return browserClient;
}
