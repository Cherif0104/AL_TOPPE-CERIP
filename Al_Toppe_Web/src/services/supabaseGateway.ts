import {
  bulkAssignCoach,
  createExportAuditLog,
  createAdminUser,
  deleteAdminUser,
  getAdminAnalytics,
  getAdminMonitoring,
  getAdminSettings,
  getAdminStats,
  listExportAuditLogs,
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
  createCashflowEntriesFromCapture,
  exportFinanceReportPdf,
  getFinanceSummary,
  listCashflowEntries,
  listFinanceCategories,
  normalizeTxType,
  type ParsedCaptureTransaction,
  updateCashflowEntry,
} from "./supabaseFinances";
import {
  EDENAI_API_BASE_URL,
  EDENAI_API_KEY,
  EDENAI_CHAT_MODEL,
  EDENAI_CHAT_PROVIDER,
  getAiProviderMode,
  isEdenAiConfigured,
} from "@/config";

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

function normalizeAmount(raw: string): number {
  const n = raw
    .replace(/[^\d,.\s]/g, "")
    .replace(/\s+/g, "")
    .replace(",", ".");
  const parsed = Number(n);
  return Number.isFinite(parsed) ? parsed : 0;
}

function inferType(text: string): "income" | "expense" {
  const t = text.toLowerCase();
  if (/(vente|vendu|recette|encaisse|revenu|gain|paiement reçu|reçu de)/i.test(t)) return "income";
  return "expense";
}

function inferPaymentMethod(text: string): "cash" | "orange_money" | "wave" | "virement" {
  const t = text.toLowerCase();
  if (t.includes("orange money") || t.includes("orange")) return "orange_money";
  if (t.includes("wave")) return "wave";
  if (t.includes("virement") || t.includes("banque")) return "virement";
  return "cash";
}

function inferCategoryName(text: string, type: "income" | "expense"): string {
  const t = text.toLowerCase();
  if (type === "income") {
    if (/(vente|client|facture|prestation)/i.test(t)) return "Ventes";
    return "Autres revenus";
  }
  if (/(stock|achat|marchandise|fourniture)/i.test(t)) return "Achats";
  if (/(transport|carburant|taxi|livraison)/i.test(t)) return "Transport";
  if (/(salaire|employé|main.?d'oeuvre|ressource humaine)/i.test(t)) return "Ressources humaines";
  if (/(loyer|électricité|internet|eau|charge)/i.test(t)) return "Charges fixes";
  return "Dépenses diverses";
}

function parseStructuredTransactions(text: string): ParsedCaptureTransaction[] {
  const source = String(text || "").trim();
  if (!source) return [];

  const chunks = source
    .split(/\n|;| et | puis |,/i)
    .map((s) => s.trim())
    .filter(Boolean);

  const out: ParsedCaptureTransaction[] = [];
  for (const chunk of chunks) {
    const amounts = [...chunk.matchAll(/(\d[\d\s]*(?:[,.]\d{1,2})?)/g)].map((m) => normalizeAmount(m[1]));
    const amount = amounts.find((n) => n > 0) || 0;
    if (!amount) continue;

    const type = inferType(chunk);
    const category_name = inferCategoryName(chunk, type);
    out.push({
      type,
      amount,
      category_name,
      title: chunk.slice(0, 100),
      description: chunk,
      date: new Date().toISOString().slice(0, 10),
      payment_method: inferPaymentMethod(chunk),
      client_supplier: undefined,
    });
  }
  return out.slice(0, 10);
}

function parseJsonTransactionsFromText(raw: string): ParsedCaptureTransaction[] {
  const text = String(raw || "");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return [];
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as {
      transactions?: ParsedCaptureTransaction[];
    };
    return Array.isArray(parsed.transactions) ? parsed.transactions : [];
  } catch {
    return [];
  }
}

function extractProviderText(responseJson: unknown): string {
  if (!responseJson || typeof responseJson !== "object") return "";
  const obj = responseJson as Record<string, unknown>;
  const provider = obj[EDENAI_CHAT_PROVIDER];
  if (provider && typeof provider === "object") {
    const p = provider as Record<string, unknown>;
    const generated = p.generated_text;
    if (typeof generated === "string" && generated.trim()) return generated;
    const message = p.message;
    if (typeof message === "string" && message.trim()) return message;
    const text = p.text;
    if (typeof text === "string" && text.trim()) return text;
  }
  const generated = obj.generated_text;
  if (typeof generated === "string" && generated.trim()) return generated;
  return "";
}

async function analyzeWithEdenAi(text: string): Promise<{
  transactions: ParsedCaptureTransaction[];
  warnings: string[];
  confidence: number;
}> {
  const systemInstruction = [
    "Tu es un extracteur financier AL-TOPPE.",
    "Retourne UNIQUEMENT du JSON valide avec la structure:",
    '{ "transactions": [{ "type":"income|expense","amount":number,"category_name":string,"title":string,"description":string,"date":"YYYY-MM-DD","payment_method":"cash|orange_money|wave|virement","client_supplier":string }] }',
    "Si aucune transaction n'est détectée, retourne {\"transactions\":[]}.",
  ].join(" ");

  const endpoint = `${EDENAI_API_BASE_URL.replace(/\/$/, "")}/text/chat`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${EDENAI_API_KEY}`,
    "Content-Type": "application/json",
  };

  const payloadA = {
    providers: EDENAI_CHAT_PROVIDER,
    response_as_dict: true,
    settings: { [EDENAI_CHAT_PROVIDER]: { model: EDENAI_CHAT_MODEL } },
    messages: [
      { role: "system", content: systemInstruction },
      { role: "user", content: text },
    ],
    temperature: 0.1,
    max_tokens: 700,
  };

  let response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(payloadA),
  });

  // Compat éventuelle selon shape Eden.
  if (!response.ok) {
    const payloadB = {
      providers: EDENAI_CHAT_PROVIDER,
      response_as_dict: true,
      settings: { [EDENAI_CHAT_PROVIDER]: EDENAI_CHAT_MODEL },
      text: [
        { role: "system", content: systemInstruction },
        { role: "user", content: text },
      ],
      temperature: 0.1,
      max_tokens: 700,
    };
    response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payloadB),
    });
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Eden AI HTTP ${response.status}: ${body.slice(0, 200)}`);
  }

  const json = (await response.json()) as unknown;
  const providerText = extractProviderText(json);
  const transactions = parseJsonTransactionsFromText(providerText);
  return {
    transactions,
    warnings: transactions.length ? [] : ["Aucune transaction exploitable renvoyée par Eden AI."],
    confidence: transactions.length ? 0.82 : 0.3,
  };
}

async function analyzeExpenseImageWithEdenAi(imageBase64: string): Promise<{
  extractedText: string;
  transactions: ParsedCaptureTransaction[];
  warnings: string[];
  confidence: number;
}> {
  const cleanBase64 = String(imageBase64 || "").replace(/^data:[^;]+;base64,/, "");
  if (!cleanBase64) {
    return {
      extractedText: "",
      transactions: [],
      warnings: ["Image OCR vide."],
      confidence: 0.2,
    };
  }

  const endpoint = `${EDENAI_API_BASE_URL.replace(/\/$/, "")}/ocr/ocr`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${EDENAI_API_KEY}`,
    "Content-Type": "application/json",
  };

  const payload = {
    providers: "google",
    language: "fr",
    file_base64: cleanBase64,
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Eden OCR HTTP ${response.status}: ${body.slice(0, 200)}`);
  }

  const json = (await response.json()) as Record<string, unknown>;
  const providerObj =
    typeof json.google === "object" && json.google
      ? (json.google as Record<string, unknown>)
      : json;
  const extracted =
    String(
      providerObj.text ||
      providerObj.extracted_text ||
      providerObj.ocr_text ||
      "",
    ).trim();
  const transactions = parseStructuredTransactions(extracted);
  return {
    extractedText: extracted,
    transactions,
    warnings: extracted ? [] : ["Aucun texte OCR détecté."],
    confidence: extracted ? 0.75 : 0.3,
  };
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
  if (path === "/audit/exports" && method === "POST") {
    return (await createExportAuditLog(body)) as T;
  }
  if (path === "/audit/exports" && method === "GET") {
    const limit = query.get("limit") ? Number(query.get("limit")) : 100;
    const rows = await listExportAuditLogs(Number.isFinite(limit) ? limit : 100);
    return { results: rows } as T;
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
    let transactions: ParsedCaptureTransaction[] = [];
    let warnings: string[] = [];
    let confidence = 0.35;

    if (getAiProviderMode() === "edenai" && isEdenAiConfigured()) {
      try {
        const eden = await analyzeWithEdenAi(text);
        transactions = eden.transactions;
        warnings = eden.warnings;
        confidence = eden.confidence;
      } catch (e) {
        console.warn("[ai] Eden AI indisponible, fallback parseur local:", e);
      }
    }

    if (!transactions.length) {
      transactions = parseStructuredTransactions(text);
      if (transactions.length > 0) {
        confidence = Math.max(confidence, 0.72);
      } else if (text) {
        warnings.push("Aucune transaction chiffrée détectée.");
      }
    }

    return {
      success: true,
      intent: text.length > 50 ? "analyse_besoin_detaille" : "capture_rapide",
      voice_response: text ? "Proposition IA prête. Vérifiez avant validation." : "",
      confidence,
      warnings,
      needs_confirmation: true,
      transactions,
    } as T;
  }

  if (path === "/ai/capture/to-cashflow" && method === "POST") {
    const entrepreneurId = String(body.entrepreneur_id || "").trim();
    const transactions = Array.isArray(body.transactions)
      ? (body.transactions as ParsedCaptureTransaction[])
      : [];
    const sourceText = String(body.source_text || "");
    const created = await createCashflowEntriesFromCapture(entrepreneurId, transactions);
    return {
      success: true,
      entrepreneur_id: entrepreneurId,
      source_text: sourceText,
      parsed_count: transactions.length,
      created_count: created.length,
      created_entries: created,
    } as T;
  }

  if (path === "/ai/ocr/expense" && method === "POST") {
    const imageBase64 = String(body.image_base64 || "");
    let extractedText = "";
    let transactions: ParsedCaptureTransaction[] = [];
    let warnings: string[] = [];
    let confidence = 0.3;

    if (getAiProviderMode() === "edenai" && isEdenAiConfigured()) {
      try {
        const ocr = await analyzeExpenseImageWithEdenAi(imageBase64);
        extractedText = ocr.extractedText;
        transactions = ocr.transactions;
        warnings = ocr.warnings;
        confidence = ocr.confidence;
      } catch (e) {
        console.warn("[ocr] Eden OCR indisponible:", e);
      }
    }

    if (!transactions.length && extractedText) {
      transactions = parseStructuredTransactions(extractedText);
      if (transactions.length) confidence = Math.max(confidence, 0.65);
    }

    if (!transactions.length && !extractedText) {
      warnings.push("OCR indisponible pour cette image. Essayez une photo plus nette.");
    }

    return {
      success: true,
      needs_confirmation: true,
      confidence,
      warnings,
      extracted_text: extractedText,
      transactions,
      voice_response: extractedText
        ? "Texte OCR extrait. Vérifiez les transactions avant validation."
        : "Impossible d'extraire le texte de l'image.",
    } as T;
  }

  throw new Error(`[supabaseGateway] Endpoint non pris en charge: ${method} ${endpoint}`);
}
