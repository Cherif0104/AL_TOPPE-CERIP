import { apiService } from '@/services/api';

const FALLBACK_KEY = 'altoppe_export_audit_logs_v1';

type ExportAuditPayload = {
  actor_id?: string;
  actor_role?: string;
  scope: string;
  format: string;
  item_count: number;
  metadata?: Record<string, unknown>;
};

function getStoredActor() {
  try {
    const raw = localStorage.getItem('altoppe_user');
    if (!raw) return { id: '', role: '' };
    const user = JSON.parse(raw) as { id?: string; role?: string };
    return { id: String(user.id || ''), role: String(user.role || '') };
  } catch {
    return { id: '', role: '' };
  }
}

export async function logExportAudit(payload: ExportAuditPayload): Promise<void> {
  const actor = getStoredActor();
  const row = {
    actor_id: payload.actor_id || actor.id || '',
    actor_role: payload.actor_role || actor.role || '',
    scope: payload.scope,
    format: payload.format,
    item_count: payload.item_count,
    metadata: payload.metadata || {},
  };
  try {
    await apiService.request('/audit/exports/', {
      method: 'POST',
      body: JSON.stringify(row),
    });
  } catch {
    try {
      const raw = localStorage.getItem(FALLBACK_KEY);
      const existing = raw ? (JSON.parse(raw) as Array<Record<string, unknown>>) : [];
      localStorage.setItem(
        FALLBACK_KEY,
        JSON.stringify([{ id: crypto.randomUUID(), created_at: new Date().toISOString(), ...row }, ...existing].slice(0, 500)),
      );
    } catch {
      // ignore
    }
  }
}
