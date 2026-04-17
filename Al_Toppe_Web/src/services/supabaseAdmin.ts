import { getSupabase } from "@/lib/supabaseClient";

function sb() {
  const client = getSupabase();
  if (!client) throw new Error("Supabase client indisponible");
  return client;
}

function isSupabaseSchemaOrPermissionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; status?: number; message?: string; details?: string };
  const code = String(e.code || "").toLowerCase();
  const message = String(e.message || "").toLowerCase();
  const details = String(e.details || "").toLowerCase();
  return (
    e.status === 401 ||
    e.status === 403 ||
    code === "42501" ||
    code === "42p01" ||
    message.includes("permission denied") ||
    message.includes("row-level security") ||
    message.includes("relation") ||
    details.includes("row-level security")
  );
}

export async function getAdminStats() {
  try {
    const client = sb();
    const [{ count: users }, { count: coaches }, { count: entrepreneurs }, { count: bailleurs }] =
      await Promise.all([
        client.from("profiles").select("*", { count: "exact", head: true }).then((r) => r),
        client
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "coach")
          .then((r) => r),
        client
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "entrepreneur")
          .then((r) => r),
        client
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "bailleur")
          .then((r) => r),
      ]);

    const { data: cashRows } = await client
      .from("cashflow_entries")
      .select("type,amount");
    const totalFunding = (cashRows || [])
      .filter((r) => r.type === "income")
      .reduce((acc, r) => acc + Number(r.amount || 0), 0);

    return {
      total_users: users || 0,
      active_entrepreneurs: entrepreneurs || 0,
      total_coaches: coaches || 0,
      total_bailleurs: bailleurs || 0,
      monthly_growth: "N/A",
      total_funding: String(Math.round(totalFunding)),
      entrepreneurs_new_this_month: 0,
      funding_vs_prev_label: "N/A",
      system_health: 100,
      recent_activities: [],
      system_metrics: [
        { name: "DB", value: 100, color: "#006666" },
        { name: "Functions", value: 100, color: "#FF9933" },
      ],
    };
  } catch (error) {
    if (!isSupabaseSchemaOrPermissionError(error)) throw error;
    return {
      total_users: 0,
      active_entrepreneurs: 0,
      total_coaches: 0,
      total_bailleurs: 0,
      monthly_growth: "N/A",
      total_funding: "0",
      entrepreneurs_new_this_month: 0,
      funding_vs_prev_label: "N/A",
      system_health: 80,
      recent_activities: [],
      system_metrics: [
        { name: "DB", value: 80, color: "#006666" },
        { name: "Functions", value: 80, color: "#FF9933" },
      ],
    };
  }
}

export async function getAdminAnalytics(period?: string) {
  const stats = await getAdminStats();
  return {
    period: period || "last_30_days",
    summary: stats,
    series: [],
  };
}

export async function getAdminMonitoring() {
  return {
    status: "ok",
    services: [
      { name: "supabase-db", status: "up" },
      { name: "supabase-auth", status: "up" },
      { name: "supabase-storage", status: "up" },
    ],
  };
}

export async function getAdminSettings() {
  try {
    const client = sb();
    const { data, error } = await client
      .from("platform_settings")
      .select("*")
      .eq("id", "default")
      .maybeSingle();
    if (error) throw error;
    return data || { id: "default", site_name: "AL TOPPE", maintenance: false };
  } catch (error) {
    if (!isSupabaseSchemaOrPermissionError(error)) throw error;
    return { id: "default", site_name: "AL TOPPE", maintenance: false };
  }
}

export async function updateAdminSettings(payload: Record<string, unknown>) {
  const client = sb();
  const row = {
    id: "default",
    ...payload,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await client
    .from("platform_settings")
    .upsert(row)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listAdminUsers(params?: {
  search?: string;
  role?: string;
  is_active?: boolean;
  page?: number;
}) {
  try {
    const client = sb();
    let query = client
      .from("profiles")
      .select("id,email,phone,role,language,is_active,full_name,created_at", {
        count: "exact",
      })
      .order("created_at", { ascending: false });
    if (params?.role) query = query.eq("role", params.role);
    if (typeof params?.is_active === "boolean") {
      query = query.eq("is_active", params.is_active);
    }
    if (params?.search) {
      const s = `%${params.search}%`;
      query = query.or(`full_name.ilike.${s},email.ilike.${s},phone.ilike.${s}`);
    }
    const page = params?.page && params.page > 0 ? params.page : 1;
    const pageSize = 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, count, error } = await query.range(from, to);
    if (error) throw error;
    return {
      results: data || [],
      count: count || 0,
      page,
      page_size: pageSize,
    };
  } catch (error) {
    if (!isSupabaseSchemaOrPermissionError(error)) throw error;
    return {
      results: [],
      count: 0,
      page: params?.page && params.page > 0 ? params.page : 1,
      page_size: 20,
    };
  }
}

export async function updateAdminUser(
  id: string,
  payload: Record<string, unknown>,
) {
  const client = sb();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  ["email", "role", "language", "is_active", "full_name", "phone"].forEach((k) => {
    if (payload[k] !== undefined) patch[k] = payload[k];
  });
  const { data, error } = await client
    .from("profiles")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function createAdminUser(payload: Record<string, unknown>) {
  const client = sb();
  const { data, error } = await client.functions.invoke("admin-user-create", {
    body: payload,
  });
  if (error) throw error;
  return data;
}

export async function deleteAdminUser(id: string) {
  const client = sb();
  const { error } = await client.from("profiles").delete().eq("id", id);
  if (error) throw error;
  return true;
}

export async function setAdminUserPassword(id: string, password: string) {
  const client = sb();
  const { data, error } = await client.functions.invoke("admin-user-set-password", {
    body: { id, password },
  });
  if (error) throw error;
  return data || { ok: true };
}

export async function bulkAssignCoach(payload: {
  coach: string;
  entrepreneurs: string[];
  start_date?: string;
  objectives?: string | string[];
}) {
  const client = sb();
  const coachId = String(payload.coach || "");
  const entrepreneurIds = Array.isArray(payload.entrepreneurs)
    ? payload.entrepreneurs.map(String)
    : [];
  const objectivesText = Array.isArray(payload.objectives)
    ? payload.objectives.join("\n")
    : String(payload.objectives || "");

  const created: Array<{ assignment_id: string; entrepreneur_id: string; entrepreneur_name: string }> = [];
  const skipped: Array<{ entrepreneur_id: string; entrepreneur_name: string; reason: string }> = [];
  const errors: Array<{ entrepreneur_id: string; reason: string }> = [];

  for (const entrepreneurId of entrepreneurIds) {
    const { data: existing, error: e1 } = await client
      .from("altoppe_assignments")
      .select("id")
      .eq("coach_id", coachId)
      .eq("entrepreneur_id", entrepreneurId)
      .maybeSingle();
    if (e1) {
      errors.push({ entrepreneur_id: entrepreneurId, reason: e1.message });
      continue;
    }
    if (existing?.id) {
      skipped.push({
        entrepreneur_id: entrepreneurId,
        entrepreneur_name: entrepreneurId,
        reason: "Deja assigne",
      });
      continue;
    }
    const { data: row, error: e2 } = await client
      .from("altoppe_assignments")
      .insert({
        coach_id: coachId,
        entrepreneur_id: entrepreneurId,
        status: "active",
        start_date: payload.start_date || null,
        objectives: objectivesText || null,
      })
      .select("id")
      .single();
    if (e2) {
      errors.push({ entrepreneur_id: entrepreneurId, reason: e2.message });
      continue;
    }
    created.push({
      assignment_id: String(row.id),
      entrepreneur_id: entrepreneurId,
      entrepreneur_name: entrepreneurId,
    });
  }

  return {
    message: "Assignation en masse terminee",
    created,
    skipped,
    errors,
    summary: {
      total_requested: entrepreneurIds.length,
      created: created.length,
      skipped: skipped.length,
      errors: errors.length,
    },
  };
}

export async function createExportAuditLog(payload: Record<string, unknown>) {
  try {
    const client = sb();
    const row = {
      actor_id: String(payload.actor_id || ''),
      actor_role: String(payload.actor_role || ''),
      scope: String(payload.scope || ''),
      format: String(payload.format || ''),
      item_count: Number(payload.item_count || 0),
      metadata: (payload.metadata && typeof payload.metadata === 'object') ? payload.metadata : {},
      created_at: new Date().toISOString(),
    };
    const { data, error } = await client
      .from("export_audit_logs")
      .insert(row)
      .select("*")
      .single();
    if (error) throw error;
    return data || row;
  } catch (error) {
    if (!isSupabaseSchemaOrPermissionError(error)) throw error;
    return {
      id: crypto.randomUUID(),
      ...payload,
      fallback: true,
      created_at: new Date().toISOString(),
    };
  }
}

export async function listExportAuditLogs(limit = 100) {
  try {
    const client = sb();
    const { data, error } = await client
      .from("export_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  } catch (error) {
    if (!isSupabaseSchemaOrPermissionError(error)) throw error;
    return [];
  }
}
