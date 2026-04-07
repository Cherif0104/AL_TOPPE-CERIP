import { getSupabase } from "@/lib/supabaseClient";

export type PlanStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "archived";

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

function parseSortStatus(status: string): string {
  const s = String(status || "").toLowerCase();
  if (
    s === "draft" ||
    s === "submitted" ||
    s === "under_review" ||
    s === "approved" ||
    s === "rejected" ||
    s === "archived"
  ) {
    return s;
  }
  return "draft";
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: "Brouillon",
    submitted: "Soumis",
    under_review: "En revue",
    approved: "Approuve",
    rejected: "Rejete",
    archived: "Archive",
  };
  return map[status] || "Brouillon";
}

export async function listBusinessPlans(status?: string) {
  try {
    const client = sb();
    let query = client
      .from("business_plans")
      .select(
        "id,title,summary,status,entrepreneur_id,entrepreneur_name,activity_title,sector_display,is_validated,financial_projections,created_at,updated_at",
      )
      .order("updated_at", { ascending: false });
    if (status && status !== "all") {
      query = query.eq("status", parseSortStatus(status));
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((r) => ({
      ...r,
      entrepreneur: r.entrepreneur_id,
      status_display: statusLabel(String(r.status)),
    }));
  } catch (error) {
    if (!isSupabaseSchemaOrPermissionError(error)) throw error;
    return [];
  }
}

export async function getBusinessPlan(planId: string) {
  const client = sb();
  const { data, error } = await client
    .from("business_plans")
    .select("*")
    .eq("id", planId)
    .single();
  if (error) throw error;
  return {
    ...data,
    entrepreneur: data.entrepreneur_id,
    status_display: statusLabel(String(data.status)),
  };
}

export async function updateBusinessPlan(
  planId: string,
  payload: Record<string, unknown>,
) {
  const client = sb();
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (payload.title != null) patch.title = payload.title;
  if (payload.summary != null) patch.summary = payload.summary;
  if (payload.financial_projections != null) {
    patch.financial_projections = payload.financial_projections;
  }

  const { data, error } = await client
    .from("business_plans")
    .update(patch)
    .eq("id", planId)
    .select("*")
    .single();
  if (error) throw error;
  return {
    ...data,
    entrepreneur: data.entrepreneur_id,
    status_display: statusLabel(String(data.status)),
  };
}

export async function validateBusinessPlanWorkflow(
  planId: string,
  payload: Record<string, unknown>,
) {
  const client = sb();
  const approve = Boolean(payload.is_approved);
  const comments = String(payload.comments || "");
  const validationType = String(payload.validation_type || "initial_review");
  const workflowType = String(payload.workflow_type || "basic");

  const { data: authData, error: authErr } = await client.auth.getUser();
  if (authErr || !authData.user) throw new Error("Authentification requise");
  const reviewerId = authData.user.id;

  const { error: insErr } = await client.from("business_plan_reviews").insert({
    business_plan_id: planId,
    reviewer_id: reviewerId,
    validation_type: validationType,
    workflow_type: workflowType,
    is_approved: approve,
    comments: comments || null,
  });
  if (insErr) throw insErr;

  const nextStatus = approve ? "approved" : "rejected";
  const { error: upErr } = await client
    .from("business_plans")
    .update({
      status: nextStatus,
      is_validated: approve,
      updated_at: new Date().toISOString(),
    })
    .eq("id", planId);
  if (upErr) throw upErr;

  return {
    message: approve ? "Validation enregistree" : "Plan rejete",
    business_plan_status: nextStatus,
    business_plan_status_display: statusLabel(nextStatus),
    is_workflow_complete: approve,
  };
}

export async function downloadBusinessPlanPdf(planId: string): Promise<Blob> {
  const client = sb();
  const { data, error } = await client.storage
    .from("business-plan-pdfs")
    .download(`${planId}.pdf`);
  if (error || !data) {
    throw new Error(
      "PDF introuvable dans Supabase Storage (bucket business-plan-pdfs).",
    );
  }
  return data;
}
