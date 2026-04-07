import {
  bulkAssignCoach,
  createAdminUser,
  deleteAdminUser,
  getAdminAnalytics,
  getAdminMonitoring,
  getAdminSettings,
  getAdminStats,
  listAdminUsers,
  setAdminUserPassword,
  updateAdminSettings,
  updateAdminUser,
} from "./supabaseAdmin";
import {
  downloadBusinessPlanPdf,
  getBusinessPlan,
  listBusinessPlans,
  updateBusinessPlan,
  validateBusinessPlanWorkflow,
} from "./supabaseBusinessPlans";
import {
  exportFinanceReportPdf,
  getFinanceSummary,
  listCashflowEntries,
  listFinanceCategories,
  normalizeTxType,
  updateCashflowEntry,
} from "./supabaseFinances";

function parsePath(endpoint: string) {
  const qIndex = endpoint.indexOf("?");
  const path = qIndex >= 0 ? endpoint.slice(0, qIndex) : endpoint;
  const query = qIndex >= 0 ? endpoint.slice(qIndex + 1) : "";
  return { path: path.replace(/\/$/, ""), query: new URLSearchParams(query) };
}

function parseBody(options: RequestInit): Record<string, unknown> {
  if (!options.body || typeof options.body !== "string") return {};
  try {
    return JSON.parse(options.body) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function mkBlobResponse(blob: Blob) {
  return { __blob: blob };
}

export async function supabaseMakeRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const body = parseBody(options);
  const { path, query } = parsePath(endpoint);

  // Auth/profile abstrait: retourne le profil local déjà stocké.
  if (path === "/auth/profile" && method === "GET") {
    const user = localStorage.getItem("altoppe_user");
    return (user ? JSON.parse(user) : null) as T;
  }
  if (path === "/auth/profile/update" && method === "PATCH") {
    const prev = localStorage.getItem("altoppe_user");
    const row = prev ? { ...JSON.parse(prev), ...body } : body;
    localStorage.setItem("altoppe_user", JSON.stringify(row));
    return row as T;
  }

  // Admin
  if (path === "/admin/stats" && method === "GET") return (await getAdminStats()) as T;
  if (path === "/admin/analytics" && method === "GET") {
    return (await getAdminAnalytics(query.get("period") || undefined)) as T;
  }
  if (path === "/admin/monitoring" && method === "GET") {
    return (await getAdminMonitoring()) as T;
  }
  if (path === "/admin/settings" && method === "GET") return (await getAdminSettings()) as T;
  if (path === "/admin/settings" && method === "PUT") {
    return (await updateAdminSettings(body)) as T;
  }
  if (path === "/admin/users" && method === "GET") {
    return (await listAdminUsers({
      search: query.get("search") || undefined,
      role: query.get("role") || undefined,
      is_active: query.get("is_active") != null ? query.get("is_active") === "true" : undefined,
      page: query.get("page") ? Number(query.get("page")) : undefined,
    })) as T;
  }
  if (path === "/admin/users" && method === "POST") {
    return (await createAdminUser(body)) as T;
  }
  if (path === "/coaching/assignments/bulk-assign" && method === "POST") {
    return (await bulkAssignCoach({
      coach: String(body.coach || ""),
      entrepreneurs: Array.isArray(body.entrepreneurs)
        ? (body.entrepreneurs as unknown[]).map((x) => String(x))
        : [],
      start_date: body.start_date ? String(body.start_date) : undefined,
      objectives: body.objectives as string | string[] | undefined,
    })) as T;
  }
  const adminUserPath = path.match(/^\/admin\/users\/([^/]+)$/);
  if (adminUserPath) {
    if (method === "PATCH") return (await updateAdminUser(adminUserPath[1], body)) as T;
    if (method === "DELETE") return (await deleteAdminUser(adminUserPath[1])) as T;
  }
  const adminPwdPath = path.match(/^\/admin\/users\/([^/]+)\/set_password$/);
  if (adminPwdPath && method === "POST") {
    return (await setAdminUserPassword(adminPwdPath[1], String(body.password || ""))) as T;
  }

  // Coaches / entrepreneurs
  if (path === "/coaching" && method === "GET") {
    const users = await listAdminUsers({ role: "coach" });
    return users.results as T;
  }
  if (path === "/entrepreneurs" && method === "GET") {
    const users = await listAdminUsers({ role: "entrepreneur" });
    return users as T;
  }
  if (path === "/entrepreneurs" && method === "POST") {
    return (await createAdminUser({ ...body, role: "entrepreneur" })) as T;
  }
  if (path === "/coaching" && method === "POST") {
    return (await createAdminUser({ ...body, role: "coach" })) as T;
  }
  if (path === "/bailleurs" && method === "POST") {
    return (await createAdminUser({ ...body, role: "bailleur" })) as T;
  }

  // Business plans
  if (path === "/business-plans" && method === "GET") {
    return (await listBusinessPlans(query.get("status") || undefined)) as T;
  }
  const bpPath = path.match(/^\/business-plans\/([^/]+)$/);
  if (bpPath) {
    if (method === "GET") return (await getBusinessPlan(bpPath[1])) as T;
    if (method === "PATCH") return (await updateBusinessPlan(bpPath[1], body)) as T;
  }
  const bpWorkflow = path.match(/^\/business-plans\/([^/]+)\/workflow\/validate$/);
  if (bpWorkflow && method === "POST") {
    return (await validateBusinessPlanWorkflow(bpWorkflow[1], body)) as T;
  }
  const bpPdf = path.match(/^\/business-plans\/([^/]+)\/(pdf|export\/pdf)$/);
  if (bpPdf && method === "GET") {
    const blob = await downloadBusinessPlanPdf(bpPdf[1]);
    return mkBlobResponse(blob) as T;
  }

  // Finances
  if (path === "/finances/categories" && method === "GET") {
    const cats = await listFinanceCategories();
    return { results: cats } as T;
  }
  const cashflowPath = path.match(/^\/finances\/entrepreneurs\/([^/]+)\/cashflow$/);
  if (cashflowPath && method === "GET") {
    const list = await listCashflowEntries(
      cashflowPath[1],
      query.get("start_date") || undefined,
      query.get("end_date") || undefined,
    );
    return {
      results: list.map((r) => ({
        ...r,
        type: normalizeTxType(r.type),
        category: r.category_id,
      })),
    } as T;
  }
  const cashflowOne = path.match(/^\/finances\/entrepreneurs\/([^/]+)\/cashflow\/([^/]+)$/);
  if (cashflowOne && method === "PATCH") {
    return (await updateCashflowEntry(cashflowOne[1], cashflowOne[2], body)) as T;
  }
  const financeSummary = path.match(/^\/finances\/entrepreneurs\/([^/]+)\/report\/summary$/);
  if (financeSummary && method === "GET") {
    return (await getFinanceSummary(
      financeSummary[1],
      query.get("start_date") || undefined,
      query.get("end_date") || undefined,
    )) as T;
  }
  const financePdf = path.match(/^\/finances\/entrepreneurs\/([^/]+)\/report\/export-pdf$/);
  if (financePdf && method === "GET") {
    const blob = await exportFinanceReportPdf(
      financePdf[1],
      query.get("start_date") || undefined,
      query.get("end_date") || undefined,
    );
    return mkBlobResponse(blob) as T;
  }

  // IA assist
  if (path === "/ai/text/analyze" && method === "POST") {
    const text = String(body.text || "");
    return {
      success: true,
      intent: text.length > 50 ? "analyse_besoin_detaille" : "capture_rapide",
      voice_response: text ? "Suggestion locale: clarifier objectif, cout et calendrier." : "",
    } as T;
  }

  throw new Error(`[supabaseGateway] Endpoint non pris en charge: ${method} ${endpoint}`);
}
