import { getSupabase } from "@/lib/supabaseClient";
import { isSupabaseAuthActive } from "@/config";

export type QuickCaptureSyncPayload = {
  kind: "need" | "idea" | "task" | "voice";
  text: string;
  durationSec?: number;
  status?: "parsed" | "confirmed" | "persisted" | "failed";
  aiSummary?: string;
  sourceText?: string;
  transactionsCount?: number;
  createdEntryIds?: string[];
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

  const row = {
    user_id: uid,
    kind: item.kind,
    text_content: item.text,
    duration_sec: item.durationSec ?? null,
    audio_storage_path: null,
    status: item.status ?? null,
    ai_summary: item.aiSummary ?? null,
    source_text: item.sourceText ?? null,
    transactions_count: item.transactionsCount ?? null,
    created_entry_ids: Array.isArray(item.createdEntryIds) ? item.createdEntryIds : null,
    metadata: {
      status: item.status ?? "parsed",
      transactions_count: item.transactionsCount ?? 0,
    },
  };

  let { error } = await sb.from("altoppe_quick_captures").insert(row);
  if (error) {
    // Fallback minimal pour les schémas qui n'ont pas encore les colonnes enrichies.
    const fallback = {
      user_id: uid,
      kind: item.kind,
      text_content: item.text,
      duration_sec: item.durationSec ?? null,
      audio_storage_path: null,
    };
    const retry = await sb.from("altoppe_quick_captures").insert(fallback);
    error = retry.error;
  }

  if (error) {
    console.warn("[supabaseCaptures] insert altoppe_quick_captures:", error.message);
  }
}
