export type CorrectiveActionStatus = 'todo' | 'in_progress' | 'done';

export type CorrectiveAction = {
  id: string;
  coach_id: string;
  entrepreneur_id?: string;
  entrepreneur_name: string;
  risk_score: number;
  risk_notes: string[];
  action: string;
  created_at: string;
  updated_at?: string;
  status: CorrectiveActionStatus;
  entrepreneur_acknowledged_at?: string;
  entrepreneur_acknowledged_by?: string;
};

const STORAGE_KEY = 'altoppe_coach_corrective_actions_v1';

function readAll(): CorrectiveAction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    return parsed.map((row) => ({
      id: String(row.id || crypto.randomUUID()),
      coach_id: String(row.coach_id || ''),
      entrepreneur_id: row.entrepreneur_id ? String(row.entrepreneur_id) : undefined,
      entrepreneur_name: String(row.entrepreneur_name || ''),
      risk_score: Number(row.risk_score || 0),
      risk_notes: Array.isArray(row.risk_notes) ? row.risk_notes.map((x) => String(x)) : [],
      action: String(row.action || ''),
      created_at: String(row.created_at || new Date().toISOString()),
      updated_at: row.updated_at ? String(row.updated_at) : undefined,
      entrepreneur_acknowledged_at: row.entrepreneur_acknowledged_at
        ? String(row.entrepreneur_acknowledged_at)
        : undefined,
      entrepreneur_acknowledged_by: row.entrepreneur_acknowledged_by
        ? String(row.entrepreneur_acknowledged_by)
        : undefined,
      status:
        row.status === 'done' || row.status === 'in_progress' || row.status === 'todo'
          ? row.status
          : 'todo',
    }));
  } catch {
    return [];
  }
}

function writeAll(rows: CorrectiveAction[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows.slice(0, 500)));
}

export function listCorrectiveActionsByCoach(coachId: string): CorrectiveAction[] {
  return readAll()
    .filter((row) => row.coach_id === String(coachId))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function listCorrectiveActionsForEntrepreneur(params: {
  entrepreneur_id?: string | null;
  entrepreneur_name?: string | null;
}): CorrectiveAction[] {
  const id = String(params.entrepreneur_id || '').trim();
  const name = String(params.entrepreneur_name || '').trim().toLowerCase();
  return readAll()
    .filter((row) => {
      if (id && row.entrepreneur_id && String(row.entrepreneur_id) === id) return true;
      if (name && String(row.entrepreneur_name || '').trim().toLowerCase() === name) return true;
      return false;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function createCorrectiveAction(payload: {
  coach_id: string;
  entrepreneur_id?: string;
  entrepreneur_name: string;
  risk_score: number;
  risk_notes: string[];
  action: string;
}): CorrectiveAction {
  const rows = readAll();
  const row: CorrectiveAction = {
    id: crypto.randomUUID(),
    coach_id: String(payload.coach_id),
    entrepreneur_id: payload.entrepreneur_id ? String(payload.entrepreneur_id) : undefined,
    entrepreneur_name: String(payload.entrepreneur_name || ''),
    risk_score: Number(payload.risk_score || 0),
    risk_notes: Array.isArray(payload.risk_notes) ? payload.risk_notes.map((x) => String(x)) : [],
    action: String(payload.action || ''),
    created_at: new Date().toISOString(),
    status: 'todo',
  };
  writeAll([row, ...rows]);
  return row;
}

export function updateCorrectiveActionStatus(
  id: string,
  status: CorrectiveActionStatus,
): CorrectiveAction | null {
  const rows = readAll();
  let updated: CorrectiveAction | null = null;
  const next = rows.map((row) => {
    if (row.id !== id) return row;
    updated = { ...row, status, updated_at: new Date().toISOString() };
    return updated;
  });
  writeAll(next);
  return updated;
}

export function acknowledgeCorrectiveActionByEntrepreneur(params: {
  id: string;
  entrepreneur_id?: string | null;
}): CorrectiveAction | null {
  const rows = readAll();
  let updated: CorrectiveAction | null = null;
  const next = rows.map((row) => {
    if (row.id !== params.id) return row;
    updated = {
      ...row,
      entrepreneur_acknowledged_at: new Date().toISOString(),
      entrepreneur_acknowledged_by: String(params.entrepreneur_id || row.entrepreneur_id || ''),
      updated_at: new Date().toISOString(),
    };
    return updated;
  });
  writeAll(next);
  return updated;
}
