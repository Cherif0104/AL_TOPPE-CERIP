import { getSupabase } from "@/lib/supabaseClient";
import { isSupabaseAuthActive } from "@/config";

export type QuickCaptureSyncPayload = {
  kind: "need" | "idea" | "task" | "voice";
  text: string;
  durationSec?: number;
};

/**
 * Envoie une capture locale vers Postgres (table altoppe_quick_captures).
 * Silencieux si pas de session Supabase ou si la table n’existe pas.
 */
export async function syncQuickCaptureToSupabase(item: QuickCaptureSyncPayload): Promise<void> {
  if (!isSupabaseAuthActive()) return;
  const sb = getSupabase();
  if (!sb) return;
  const { data: sessionData } = await sb.auth.getSession();
  const uid = sessionData.session?.user?.id;
  if (!uid) return;

  const { error } = await sb.from("altoppe_quick_captures").insert({
    user_id: uid,
    kind: item.kind,
    text_content: item.text,
    duration_sec: item.durationSec ?? null,
    audio_storage_path: null,
  });

  if (error) {
    console.warn("[supabaseCaptures] insert altoppe_quick_captures:", error.message);
  }
}
