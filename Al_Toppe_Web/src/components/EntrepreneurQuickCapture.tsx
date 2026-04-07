import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Sparkles, Mic, ChevronDown, ChevronUp, Square, Keyboard } from "lucide-react";
import { apiService, type User } from "../services/api";
import { toast } from "sonner";
import { syncQuickCaptureToSupabase } from "@/services/supabaseCaptures";

export type QuickCaptureKind = "need" | "idea" | "task" | "voice";

export interface QuickCaptureItem {
  id: string;
  text: string;
  kind: QuickCaptureKind;
  createdAt: string;
  aiSummary?: string;
  durationSec?: number;
  audioDataUrl?: string;
}

const STORAGE_PREFIX = "altoppe_entrepreneur_captures_v1:";

const KIND_LABELS: Record<QuickCaptureKind, string> = {
  need: "Besoin",
  idea: "Idée",
  task: "Tâche",
  voice: "Note vocale",
};

const MAX_AUDIO_STORE_BYTES = 450_000;

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

function loadCaptures(userId: string): QuickCaptureItem[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QuickCaptureItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCaptures(userId: string, items: QuickCaptureItem[]) {
  localStorage.setItem(storageKey(userId), JSON.stringify(items.slice(0, 50)));
}

function pickMime(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
    return "audio/webm;codecs=opus";
  }
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  return "audio/mp4";
}

function formatDuration(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

async function blobToDataUrl(blob: Blob): Promise<string | null> {
  if (blob.size > MAX_AUDIO_STORE_BYTES) return null;
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onerror = () => resolve(null);
    r.onloadend = () => resolve(typeof r.result === "string" ? r.result : null);
    r.readAsDataURL(blob);
  });
}

interface EntrepreneurQuickCaptureProps {
  user: User;
}

export function EntrepreneurQuickCapture({ user }: EntrepreneurQuickCaptureProps) {
  const userId = user.id || "";
  const [openText, setOpenText] = useState(false);
  const [openReview, setOpenReview] = useState(false);
  const [text, setText] = useState("");
  const [kind, setKind] = useState<Exclude<QuickCaptureKind, "voice">>("need");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiDraft, setAiDraft] = useState("");
  const [recentOpen, setRecentOpen] = useState(false);
  const [items, setItems] = useState<QuickCaptureItem[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSec, setRecordingSec] = useState(0);
  const recordingElapsedRef = useRef(0);
  const [voiceDescription, setVoiceDescription] = useState("");
  const [pendingVoice, setPendingVoice] = useState<{
    blob: Blob;
    url: string;
    mime: string;
    elapsedSec: number;
  } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(() => {
    if (userId) setItems(loadCaptures(userId));
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (pendingVoice?.url) URL.revokeObjectURL(pendingVoice.url);
    };
  }, [pendingVoice?.url]);

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    mediaRecorderRef.current = null;
  };

  const persist = (next: QuickCaptureItem[]) => {
    if (!userId) return;
    saveCaptures(userId, next);
    setItems(next);
    const head = next[0];
    if (head) void syncQuickCaptureToSupabase(head);
  };

  const stopRecordingToReview = () => {
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === "inactive") {
      cleanupStream();
      setIsRecording(false);
      return;
    }
    mr.onstop = () => {
      const mime = pickMime();
      const blob = new Blob(chunksRef.current, { type: mime });
      const elapsed = recordingElapsedRef.current;
      cleanupStream();
      setIsRecording(false);
      recordingElapsedRef.current = 0;
      setRecordingSec(0);
      if (blob.size < 500) {
        toast.error("Enregistrement trop court — réessayez quelques secondes.");
        return;
      }
      const url = URL.createObjectURL(blob);
      setPendingVoice((prev) => {
        if (prev?.url) URL.revokeObjectURL(prev.url);
        return { blob, url, mime, elapsedSec: elapsed };
      });
      setVoiceDescription("");
      setOpenReview(true);
    };
    mr.stop();
  };

  const toggleFabRecording = async () => {
    if (isRecording) {
      stopRecordingToReview();
      return;
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.error("Micro non disponible dans ce navigateur.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMime();
      let mr: MediaRecorder;
      try {
        mr = new MediaRecorder(stream, { mimeType: mime });
      } catch {
        mr = new MediaRecorder(stream);
      }
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      mr.start(200);
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setRecordingSec(0);
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = setInterval(() => setRecordingSec((s) => s + 1), 1000);
      toast.message("Enregistrement… Touchez à nouveau le micro pour arrêter.");
    } catch (e) {
      console.warn(e);
      toast.error("Accès au micro refusé ou impossible.");
      cleanupStream();
      setIsRecording(false);
    }
  };

  const handleSaveVoice = async () => {
    if (!userId || !pendingVoice) return;
    const dur =
      pendingVoice.elapsedSec > 0
        ? pendingVoice.elapsedSec
        : Math.max(1, Math.round(pendingVoice.blob.size / 16000));
    const audioDataUrl = await blobToDataUrl(pendingVoice.blob);
    const baseText =
      voiceDescription.trim() ||
      `Note vocale (${formatDuration(Math.max(1, dur))})`;
    const row: QuickCaptureItem = {
      id: crypto.randomUUID(),
      text: baseText,
      kind: "voice",
      createdAt: new Date().toISOString(),
      durationSec: Math.max(1, dur),
      audioDataUrl: audioDataUrl ?? undefined,
    };
    persist([row, ...items]);
    if (!audioDataUrl) {
      toast.message("Mémo pleine ou fichier trop volumineux — seule la description est gardée localement.");
    }
    if (pendingVoice.url) URL.revokeObjectURL(pendingVoice.url);
    setPendingVoice(null);
    setOpenReview(false);
    setVoiceDescription("");
    toast.success("Note vocale enregistrée.");
  };

  const handleSaveText = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error("Écrivez quelques mots avant d'enregistrer.");
      return;
    }
    const row: QuickCaptureItem = {
      id: crypto.randomUUID(),
      text: aiDraft ? `${trimmed}\n\n— IA : ${aiDraft}` : trimmed,
      kind,
      createdAt: new Date().toISOString(),
      aiSummary: aiDraft || undefined,
    };
    persist([row, ...items]);
    setText("");
    setAiDraft("");
    setOpenText(false);
    toast.success("Note enregistrée.");
  };

  const handleAiAssist = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error("Saisissez d'abord votre idée ou besoin.");
      return;
    }
    setAiBusy(true);
    setAiDraft("");
    try {
      const data = (await apiService.request("/ai/text/analyze/", {
        method: "POST",
        body: JSON.stringify({ text: trimmed }),
      })) as {
        voice_response?: string;
        intent?: string;
        success?: boolean;
        error?: string;
      };
      if (data.error) {
        throw new Error(data.error);
      }
      const hint = [data.intent && `Intention détectée : ${data.intent}`, data.voice_response]
        .filter(Boolean)
        .join(" — ");
      setAiDraft(hint || "Analyse effectuée.");
      toast.success("Suggestion IA ajoutée (vous pouvez modifier le texte avant d'enregistrer).");
    } catch (e) {
      console.warn(e);
      toast.message("IA indisponible — votre texte sera enregistré tel quel si vous validez.", {
        duration: 3500,
      });
    } finally {
      setAiBusy(false);
    }
  };

  const lastFew = items.slice(0, 4);

  if (!userId) return null;

  return (
    <>
      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-[100] flex justify-center px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-16">
        <div className="pointer-events-auto flex w-full max-w-lg flex-col items-center gap-2">
          {lastFew.length > 0 && (
            <div className="mb-1 w-full rounded-2xl border border-[#006666]/15 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-md">
              <button
                type="button"
                onClick={() => setRecentOpen((v) => !v)}
                className="flex w-full items-center justify-between text-left text-xs font-medium text-gray-600"
              >
                <span>Dernières captures ({lastFew.length})</span>
                {recentOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {recentOpen && (
                <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto text-sm">
                  {lastFew.map((it) => (
                    <li
                      key={it.id}
                      className="rounded-lg border border-gray-100 bg-gray-50/80 px-2 py-1.5 text-gray-800"
                    >
                      <div className="mb-0.5 flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {KIND_LABELS[it.kind]}
                        </Badge>
                        <span className="text-[10px] text-gray-400">
                          {new Date(it.createdAt).toLocaleString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="line-clamp-2 whitespace-pre-wrap">{it.text}</p>
                      {it.kind === "voice" && it.audioDataUrl && (
                        <audio src={it.audioDataUrl} controls className="mt-2 h-8 w-full max-w-full" />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={toggleFabRecording}
            aria-label={
              isRecording
                ? "Arrêter l'enregistrement vocal"
                : "Démarrer une note vocale sur vos activités"
            }
            className={`relative flex h-[4.25rem] w-[4.25rem] shrink-0 items-center justify-center rounded-full text-white shadow-[0_8px_28px_rgba(229,57,53,0.55),0_2px_8px_rgba(0,0,0,0.12)] ring-[5px] ring-white transition hover:shadow-[0_10px_32px_rgba(229,57,53,0.6)] active:scale-[0.96] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E53935] focus-visible:ring-offset-2 ${
              isRecording
                ? "animate-pulse bg-[#C62828]"
                : "bg-[#E53935] hover:bg-[#D32F2F]"
            }`}
          >
            {isRecording ? (
              <Square className="h-7 w-7 fill-current drop-shadow-sm" strokeWidth={2} aria-hidden />
            ) : (
              <Mic className="h-9 w-9 drop-shadow-sm" strokeWidth={2.25} aria-hidden />
            )}
            {isRecording && (
              <span className="absolute -top-1 right-0 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-[#C62828]">
                {formatDuration(recordingSec)}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setOpenText(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-[#006666] underline-offset-2 hover:underline"
          >
            <Keyboard className="h-3.5 w-3.5" aria-hidden />
            Saisie texte (besoin, idée, tâche)
          </button>
        </div>
      </div>

      <Dialog
        open={openReview}
        onOpenChange={(o) => {
          if (!o && pendingVoice?.url) {
            URL.revokeObjectURL(pendingVoice.url);
            setPendingVoice(null);
          }
          setOpenReview(o);
        }}
      >
        <DialogContent className="max-w-md border-[#006666]/20 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-[#006666]" />
              Valider la note vocale
            </DialogTitle>
            <DialogDescription>
              Écoutez votre message, ajoutez un titre ou des précisions sur vos activités, puis
              enregistrez.
            </DialogDescription>
          </DialogHeader>
          {pendingVoice && (
            <div className="space-y-3">
              <audio src={pendingVoice.url} controls className="w-full rounded-md" />
              <Textarea
                placeholder="Ex. : point sur la trésorerie, relance client X…"
                value={voiceDescription}
                onChange={(e) => setVoiceDescription(e.target.value)}
                className="min-h-[100px] text-base"
              />
            </div>
          )}
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (pendingVoice?.url) URL.revokeObjectURL(pendingVoice.url);
                setPendingVoice(null);
                setOpenReview(false);
              }}
            >
              Annuler
            </Button>
            <Button type="button" className="bg-[#006666] hover:bg-[#004d4d]" onClick={handleSaveVoice}>
              Enregistrer la note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openText} onOpenChange={setOpenText}>
        <DialogContent className="max-w-md border-[#006666]/20 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#006666]" />
              Capture texte
            </DialogTitle>
            <DialogDescription>
              Notez un besoin, une idée ou une tâche. Optionnel : suggestion IA pour reformuler.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {(["need", "idea", "task"] as const).map((k) => (
                <Button
                  key={k}
                  type="button"
                  size="sm"
                  variant={kind === k ? "default" : "outline"}
                  className={kind === k ? "bg-[#006666] hover:bg-[#004d4d]" : ""}
                  onClick={() => setKind(k)}
                >
                  {KIND_LABELS[k]}
                </Button>
              ))}
            </div>
            <Textarea
              placeholder="Ex. : besoin d’un devis transport, rappeler le coach mardi, idée produit…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[120px] text-base"
              autoFocus
            />
            {aiDraft && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-950">
                <span className="font-medium">Aperçu IA : </span>
                {aiDraft}
              </div>
            )}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={handleAiAssist}
                disabled={aiBusy}
                className="border-[#006666]/40 text-[#006666]"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {aiBusy ? "Analyse…" : "Suggestion IA"}
              </Button>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button type="button" variant="outline" onClick={() => setOpenText(false)}>
                Fermer
              </Button>
              <Button type="button" className="bg-[#006666] hover:bg-[#004d4d]" onClick={handleSaveText}>
                Enregistrer
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
