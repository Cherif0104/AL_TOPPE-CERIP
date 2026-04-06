import { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Sparkles, Mic, ChevronDown, ChevronUp } from 'lucide-react';
import { API_BASE_URL } from '@/config';
import type { User } from '../services/api';
import { toast } from 'sonner';

export type QuickCaptureKind = 'need' | 'idea' | 'task';

export interface QuickCaptureItem {
  id: string;
  text: string;
  kind: QuickCaptureKind;
  createdAt: string;
  aiSummary?: string;
}

const STORAGE_PREFIX = 'altoppe_entrepreneur_captures_v1:';

const KIND_LABELS: Record<QuickCaptureKind, string> = {
  need: 'Besoin',
  idea: 'Idée',
  task: 'Tâche',
};

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

interface EntrepreneurQuickCaptureProps {
  user: User;
}

export function EntrepreneurQuickCapture({ user }: EntrepreneurQuickCaptureProps) {
  const userId = user.id || '';
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [kind, setKind] = useState<QuickCaptureKind>('need');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiDraft, setAiDraft] = useState('');
  const [recentOpen, setRecentOpen] = useState(false);
  const [items, setItems] = useState<QuickCaptureItem[]>([]);

  const refresh = useCallback(() => {
    if (userId) setItems(loadCaptures(userId));
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const persist = (next: QuickCaptureItem[]) => {
    if (!userId) return;
    saveCaptures(userId, next);
    setItems(next);
  };

  const handleSave = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error('Écrivez quelques mots avant d’enregistrer.');
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
    setText('');
    setAiDraft('');
    setOpen(false);
    toast.success('Besoin enregistré. Vous pourrez le retrouver ci-dessous.');
  };

  const handleAiAssist = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error('Saisissez d’abord votre idée ou besoin.');
      return;
    }
    setAiBusy(true);
    setAiDraft('');
    try {
      const token =
        localStorage.getItem('altoppe_access_token') ||
        localStorage.getItem('altoppe_token') ||
        localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/ai/text/analyze/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text: trimmed }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        voice_response?: string;
        intent?: string;
        success?: boolean;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const hint = [data.intent && `Intention détectée : ${data.intent}`, data.voice_response]
        .filter(Boolean)
        .join(' — ');
      setAiDraft(hint || 'Analyse effectuée.');
      toast.success('Suggestion IA ajoutée (vous pouvez modifier le texte avant d’enregistrer).');
    } catch (e) {
      console.warn(e);
      toast.message(
        'IA indisponible pour l’instant — votre texte sera enregistré tel quel si vous validez.',
        { duration: 3500 }
      );
    } finally {
      setAiBusy(false);
    }
  };

  const lastFew = items.slice(0, 4);

  if (!userId) return null;

  return (
    <>
      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-[100] flex justify-center px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-16">
        <div className="pointer-events-auto flex w-full max-w-lg flex-col items-center gap-3">
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
                          {new Date(it.createdAt).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="line-clamp-2 whitespace-pre-wrap">{it.text}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* FAB ajout rapide — micro rouge (réf. maquette mobile) */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Ajout rapide : noter un besoin, une idée ou une tâche"
            className="relative flex h-[4.25rem] w-[4.25rem] shrink-0 items-center justify-center rounded-full bg-[#E53935] text-white shadow-[0_8px_28px_rgba(229,57,53,0.55),0_2px_8px_rgba(0,0,0,0.12)] ring-[5px] ring-white transition hover:bg-[#D32F2F] hover:shadow-[0_10px_32px_rgba(229,57,53,0.6)] active:scale-[0.96] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E53935] focus-visible:ring-offset-2"
          >
            <Mic className="h-9 w-9 drop-shadow-sm" strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md border-[#006666]/20 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#006666]" />
              Capture rapide
            </DialogTitle>
            <DialogDescription>
              Notez un besoin, une idée ou une tâche sans quitter votre espace. Optionnel : une suggestion
              IA pour reformuler ou classifier.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(KIND_LABELS) as QuickCaptureKind[]).map((k) => (
                <Button
                  key={k}
                  type="button"
                  size="sm"
                  variant={kind === k ? 'default' : 'outline'}
                  className={kind === k ? 'bg-[#006666] hover:bg-[#004d4d]' : ''}
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
                {aiBusy ? 'Analyse…' : 'Suggestion IA'}
              </Button>
              <Button type="button" variant="ghost" disabled className="text-gray-400" title="Bientôt disponible">
                <Mic className="mr-2 h-4 w-4" />
                Voix
              </Button>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Fermer
              </Button>
              <Button type="button" className="bg-[#006666] hover:bg-[#004d4d]" onClick={handleSave}>
                Enregistrer
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
