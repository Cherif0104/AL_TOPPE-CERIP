import { getSupabase } from "@/lib/supabaseClient";
import { normalizeEntrepreneurFromDbRow } from "./coachEntrepreneurNormalize";

function client() {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase client indisponible");
  return sb;
}

const autoCreateCooldownByUid = new Map<string, number>();
const AUTO_CREATE_COOLDOWN_MS = 60_000;
let supportsEntrepreneurUserIdColumn: boolean | null = null;
let supportsProfilesEntrepreneurIdLookup: boolean | null = null;
let canAutoCreateEntrepreneurRecord: boolean | null = null;
const ensureRecordInFlightByUid = new Map<string, Promise<string | null>>();
const ENABLE_ENTREPRENEUR_AUTO_LINK = false;

function isPermissionDenied(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; status?: number; message?: string; details?: string };
  const code = String(e.code || "").toLowerCase();
  const message = String(e.message || "").toLowerCase();
  const details = String(e.details || "").toLowerCase();
  return (
    e.status === 403 ||
    code === "42501" ||
    message.includes("permission denied") ||
    message.includes("row-level security") ||
    details.includes("row-level security")
  );
}

function isMissingColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string; details?: string };
  const code = String(e.code || "").toLowerCase();
  const message = String(e.message || "").toLowerCase();
  const details = String(e.details || "").toLowerCase();
  return (
    code === "42703" ||
    message.includes("column") && message.includes("does not exist") ||
    details.includes("column") && details.includes("does not exist")
  );
}

function isBadRequestLike(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; status?: number; message?: string };
  const code = String(e.code || "").toLowerCase();
  const message = String(e.message || "").toLowerCase();
  return e.status === 400 || code.startsWith("pgrst") || message.includes("bad request");
}

async function authUid(): Promise<string> {
  const sb = client();
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user?.id) throw new Error("Authentification Supabase requise.");
  return data.user.id;
}

export async function getCoachEntrepreneursNormalized(coachId: string) {
  const sb = client();
  const { data, error } = await sb
    .from("altoppe_entrepreneurs")
    .select("*")
    .eq("coach_id", coachId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => normalizeEntrepreneurFromDbRow(row as Record<string, unknown>));
}

export async function getAssignmentsForCoach(coachId: string) {
  const sb = client();
  const { data: rows, error } = await sb
    .from("altoppe_assignments")
    .select("*")
    .eq("coach_id", coachId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const { data: ents, error: e2 } = await sb
    .from("altoppe_entrepreneurs")
    .select("id, first_name, last_name")
    .eq("coach_id", coachId);
  if (e2) throw e2;
  const nameMap = new Map<string, string>();
  (ents || []).forEach((r: { id: string; first_name: string; last_name: string }) => {
    nameMap.set(String(r.id), `${r.first_name || ""} ${r.last_name || ""}`.trim());
  });

  return (rows || []).map((a: Record<string, unknown>) => {
    const eid = String(a.entrepreneur_id ?? "");
    return {
      id: a.id,
      coach: a.coach_id,
      entrepreneur: eid,
      entrepreneur_id: eid,
      entrepreneur_name: nameMap.get(eid) || "Entrepreneur",
      status: a.status,
      start_date: a.start_date,
      end_date: a.end_date,
      duration_days: a.duration_days,
      objectives: a.objectives,
    };
  });
}

export async function getSessionsForCoach(
  coachId?: string,
  entrepreneurId?: string,
  dateFrom?: string,
  dateTo?: string,
) {
  const sb = client();
  let q = sb
    .from("altoppe_coaching_sessions")
    .select("*")
    .order("scheduled_date", { ascending: false });
  if (coachId) q = q.eq("coach_id", coachId);
  if (entrepreneurId) q = q.eq("entrepreneur_id", entrepreneurId);
  const { data: sessions, error } = await q;
  if (error) throw error;

  let list = (sessions || []) as Record<string, unknown>[];

  if (dateFrom) {
    const df = new Date(dateFrom).getTime();
    list = list.filter((s) => {
      const d = s.scheduled_date ? new Date(String(s.scheduled_date)).getTime() : 0;
      return !d || d >= df;
    });
  }
  if (dateTo) {
    const dt = new Date(dateTo).getTime() + 86400000;
    list = list.filter((s) => {
      const d = s.scheduled_date ? new Date(String(s.scheduled_date)).getTime() : 0;
      return !d || d <= dt;
    });
  }

  const entIds = [...new Set(list.map((s) => String(s.entrepreneur_id)))];
  const nameMap = new Map<string, string>();
  if (entIds.length) {
    const { data: ents } = await sb
      .from("altoppe_entrepreneurs")
      .select("id, first_name, last_name")
      .in("id", entIds);
    (ents || []).forEach((r: { id: string; first_name: string; last_name: string }) => {
      nameMap.set(String(r.id), `${r.first_name || ""} ${r.last_name || ""}`.trim());
    });
  }

  return list.map((s) => {
    const eid = String(s.entrepreneur_id ?? "");
    const name = nameMap.get(eid) || "Entrepreneur";
    return {
      id: s.id,
      assignment: s.assignment_id,
      coach_id: s.coach_id,
      entrepreneur: eid,
      entrepreneur_id: eid,
      entrepreneur_name: name,
      entrepreneur_detail: { id: eid, full_name: name },
      session_type: s.session_type,
      scheduled_date: s.scheduled_date,
      duration_minutes: s.duration_minutes,
      actual_duration_minutes: s.duration_minutes,
      agenda: s.agenda,
      notes: s.notes,
      status: s.status,
      created_at: s.created_at,
    };
  });
}

export async function createEntrepreneurRecord(payload: Record<string, unknown>) {
  const uid = await authUid();
  const row = {
    coach_id: uid,
    civility: payload.civility ?? null,
    first_name: String(payload.first_name || ""),
    last_name: String(payload.last_name || ""),
    email: (payload.email as string) || null,
    phone: (payload.phone as string) || null,
    whatsapp: (payload.whatsapp as string) || null,
    cni_number: (payload.cni_number as string) || null,
    birth_date: (payload.birth_date as string) || null,
    address: (payload.primary_address as string) || (payload.address as string) || null,
    business_name: null as string | null,
    sector: null as string | null,
    status: "Nouveau",
    notes:
      typeof payload.objectives === "string"
        ? payload.objectives
        : Array.isArray(payload.objectives)
          ? (payload.objectives as string[]).join("\n")
          : null,
  };
  const sb = client();
  const { data, error } = await sb.from("altoppe_entrepreneurs").insert(row).select("*").single();
  if (error) throw error;
  return data as Record<string, unknown>;
}

export async function updateEntrepreneurRecord(id: string, payload: Record<string, unknown>) {
  const uid = await authUid();
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (payload.first_name != null) patch.first_name = payload.first_name;
  if (payload.last_name != null) patch.last_name = payload.last_name;
  if (payload.email != null) patch.email = payload.email;
  if (payload.phone != null) patch.phone = payload.phone;
  if (payload.whatsapp != null) patch.whatsapp = payload.whatsapp;
  if (payload.cni_number != null) patch.cni_number = payload.cni_number;
  if (payload.birth_date != null) patch.birth_date = payload.birth_date;
  if (payload.primary_address != null) patch.address = payload.primary_address;
  if (payload.address != null) patch.address = payload.address;
  const sb = client();
  const { data, error } = await sb
    .from("altoppe_entrepreneurs")
    .update(patch)
    .eq("id", id)
    .eq("coach_id", uid)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function assignEntrepreneurToCoachRecord(body: {
  coach?: string;
  entrepreneur?: string;
  start_date?: string;
  end_date?: string;
  objectives?: unknown;
}) {
  const uid = await authUid();
  const coachId = body.coach ? String(body.coach) : uid;
  if (coachId !== uid) throw new Error("Assignation réservée au compte coach connecté.");
  const entId = String(body.entrepreneur || "");
  if (!entId) throw new Error("entrepreneur requis");
  const sb = client();
  const objectivesText = Array.isArray(body.objectives)
    ? (body.objectives as string[]).filter(Boolean).join("\n")
    : body.objectives != null
      ? String(body.objectives)
      : null;

  const { data, error } = await sb
    .from("altoppe_assignments")
    .insert({
      coach_id: uid,
      entrepreneur_id: entId,
      status: "active",
      start_date: body.start_date || null,
      end_date: body.end_date || null,
      objectives: objectivesText,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: existing } = await sb
        .from("altoppe_assignments")
        .select("*")
        .eq("coach_id", uid)
        .eq("entrepreneur_id", entId)
        .maybeSingle();
      return existing;
    }
    throw error;
  }
  return data;
}

export async function addSessionRecord(payload: Record<string, unknown>) {
  const uid = await authUid();
  const assignmentId = String(payload.assignment || "");
  if (!assignmentId) throw new Error("assignation requise");
  const sb = client();
  const { data: asg, error: e1 } = await sb
    .from("altoppe_assignments")
    .select("entrepreneur_id, coach_id")
    .eq("id", assignmentId)
    .single();
  if (e1 || !asg) throw new Error("Assignation introuvable.");
  if (String((asg as { coach_id: string }).coach_id) !== uid) {
    throw new Error("Assignation non autorisée.");
  }
  const entrepreneurId = String((asg as { entrepreneur_id: string }).entrepreneur_id);
  const row = {
    coach_id: uid,
    entrepreneur_id: entrepreneurId,
    assignment_id: assignmentId,
    session_type: String(payload.session_type || "follow_up"),
    scheduled_date: (payload.scheduled_date as string) || null,
    duration_minutes: Number(payload.duration_minutes) || 60,
    agenda: (payload.agenda as string) || null,
    notes: (payload.notes as string) || null,
    status: "scheduled",
  };
  const { data, error } = await sb.from("altoppe_coaching_sessions").insert(row).select("*").single();
  if (error) throw error;
  const sess = data as Record<string, unknown>;
  const sessions = await getSessionsForCoach(uid);
  const full = sessions.find((s: { id: unknown }) => String(s.id) === String(sess.id));
  return full || sess;
}

export async function updateSessionRecord(id: string, payload: Record<string, unknown>) {
  const uid = await authUid();
  const patch: Record<string, unknown> = {};
  if (payload.session_type != null) patch.session_type = payload.session_type;
  if (payload.scheduled_date != null) patch.scheduled_date = payload.scheduled_date;
  if (payload.duration_minutes != null) patch.duration_minutes = Number(payload.duration_minutes);
  if (payload.agenda != null) patch.agenda = payload.agenda;
  if (payload.notes != null) patch.notes = payload.notes;
  if (payload.status != null) patch.status = payload.status;
  const sb = client();
  const { error } = await sb
    .from("altoppe_coaching_sessions")
    .update(patch)
    .eq("id", id)
    .eq("coach_id", uid);
  if (error) throw error;
  const list = await getSessionsForCoach(uid);
  const found = list.find((s: { id: unknown }) => String(s.id) === String(id));
  return found || { id, ...patch };
}

export async function deleteSessionRecord(id: string) {
  const uid = await authUid();
  const sb = client();
  const { error } = await sb.from("altoppe_coaching_sessions").delete().eq("id", id).eq("coach_id", uid);
  if (error) throw error;
  return true;
}

export async function getCoachPerformanceFromDb(coachId: string) {
  const sessions = (await getSessionsForCoach(coachId)) as {
    status?: string;
    duration_minutes?: number;
  }[];
  const total = sessions.length;
  const completed = sessions.filter((s) => s.status === "completed").length;
  const durSum = sessions.reduce((acc, s) => acc + (Number(s.duration_minutes) || 0), 0);
  const avg = total > 0 ? Math.round(durSum / total) : 0;
  return {
    avg_session_duration: avg,
    success_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
    total_sessions: total,
    monthly_growth: 0,
    completed_programs: completed,
    completed_sessions: completed,
    avg_revenue_growth: 0,
  };
}

export async function getEntrepreneurRecord(id: string) {
  const sb = client();
  const { data, error } = await sb.from("altoppe_entrepreneurs").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getEntrepreneurRecordIdForCurrentUser(): Promise<string | null> {
  if (!ENABLE_ENTREPRENEUR_AUTO_LINK) {
    return null;
  }
  try {
    const uid = await authUid();
    const sb = client();
    if (supportsProfilesEntrepreneurIdLookup === false) {
      return null;
    }
    const { data: profileData, error: profileError } = await sb
      .from("profiles")
      .select("entrepreneur_id")
      .eq("id", uid)
      .maybeSingle();
    if (profileError) {
      if (isMissingColumnError(profileError) || isBadRequestLike(profileError)) {
        supportsProfilesEntrepreneurIdLookup = false;
      }
      return null;
    }
    supportsProfilesEntrepreneurIdLookup = true;
    if (!profileError && profileData?.entrepreneur_id) {
      return String(profileData.entrepreneur_id);
    }
    return null;
  } catch {
    return null;
  }
}

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const raw = String(fullName || "").trim();
  if (!raw) return { firstName: "", lastName: "" };
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

/**
 * Garantit qu'un dossier entrepreneur existe pour l'utilisateur Supabase connecté.
 * Retourne l'id existant ou créé.
 */
export async function ensureEntrepreneurRecordIdForCurrentUser(): Promise<string | null> {
  if (!ENABLE_ENTREPRENEUR_AUTO_LINK) {
    return null;
  }
  const sb = client();
  const { data: authData, error: authError } = await sb.auth.getUser();
  if (authError || !authData.user?.id) return null;
  const uid = authData.user.id;

  const inFlight = ensureRecordInFlightByUid.get(uid);
  if (inFlight) {
    return await inFlight;
  }

  const runner = (async (): Promise<string | null> => {
    const existingId = await getEntrepreneurRecordIdForCurrentUser();
    if (existingId) return existingId;

  if (canAutoCreateEntrepreneurRecord === false) {
    return null;
  }
  const cooldownUntil = autoCreateCooldownByUid.get(uid) ?? 0;
  if (Date.now() < cooldownUntil) {
    return null;
  }

  const meta = (authData.user.user_metadata || {}) as Record<string, unknown>;
  const fullName =
    String(meta.full_name || meta.name || authData.user.email?.split("@")[0] || "").trim();
  const { firstName, lastName } = splitFullName(fullName);

  const basePayload = {
    first_name: firstName,
    last_name: lastName,
    email: authData.user.email || null,
    phone: String(meta.phone || authData.user.phone || "") || null,
    status: "Nouveau",
  };

  const insertPayload =
    supportsEntrepreneurUserIdColumn === false
      ? basePayload
      : { ...basePayload, entrepreneur_user_id: uid };

  let created: { id?: string } | null = null;
  let insertError: unknown = null;

  const firstInsert = await sb
    .from("altoppe_entrepreneurs")
    .insert(insertPayload)
    .select("id")
    .single();
  created = firstInsert.data as { id?: string } | null;
  insertError = firstInsert.error;

  if (insertError && isMissingColumnError(insertError)) {
    supportsEntrepreneurUserIdColumn = false;
    const retryInsert = await sb
      .from("altoppe_entrepreneurs")
      .insert(basePayload)
      .select("id")
      .single();
    created = retryInsert.data as { id?: string } | null;
    insertError = retryInsert.error;
  } else if (!insertError) {
    supportsEntrepreneurUserIdColumn = true;
    canAutoCreateEntrepreneurRecord = true;
  }

  if (insertError) {
    canAutoCreateEntrepreneurRecord = false;
    autoCreateCooldownByUid.set(uid, Date.now() + AUTO_CREATE_COOLDOWN_MS);
    if (isPermissionDenied(insertError)) {
      return null;
    }
    // Schéma Supabase hétérogène côté client: on n'insiste pas pour éviter le spam réseau.
    return null;
  }
  const createdId = created?.id ? String(created.id) : null;
  if (createdId) {
    // Liaison best-effort du profil auth -> dossier entrepreneur.
    await sb.from("profiles").update({ entrepreneur_id: createdId }).eq("id", uid);
  }
  return createdId;
  })();

  ensureRecordInFlightByUid.set(uid, runner);
  try {
    return await runner;
  } finally {
    ensureRecordInFlightByUid.delete(uid);
  }
}
