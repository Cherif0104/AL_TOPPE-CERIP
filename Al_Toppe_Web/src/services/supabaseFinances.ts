import { getSupabase } from "@/lib/supabaseClient";

type TxType = "income" | "expense";
type PaymentMethod = "cash" | "orange_money" | "wave" | "virement";

export interface ParsedCaptureTransaction {
  type: TxType;
  amount: number;
  category_name?: string;
  title?: string;
  description?: string;
  date?: string;
  payment_method?: PaymentMethod;
  client_supplier?: string;
  invoice_number?: string;
}

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

export async function listFinanceCategories() {
  try {
    const client = sb();
    const { data, error } = await client
      .from("finance_categories")
      .select("id,name,type")
      .order("name", { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (error) {
    if (!isSupabaseSchemaOrPermissionError(error)) throw error;
    return [];
  }
}

async function resolveCategoryIdByName(
  categoryName: string | undefined,
  type: TxType,
): Promise<string | null> {
  if (!categoryName) return null;
  const client = sb();
  const raw = String(categoryName).trim();
  if (!raw) return null;

  const { data: exact } = await client
    .from("finance_categories")
    .select("id,name,type")
    .eq("type", type)
    .ilike("name", raw)
    .limit(1)
    .maybeSingle();
  if (exact?.id) return String(exact.id);

  const { data: fuzzy } = await client
    .from("finance_categories")
    .select("id,name,type")
    .eq("type", type)
    .ilike("name", `%${raw}%`)
    .limit(1)
    .maybeSingle();
  return fuzzy?.id ? String(fuzzy.id) : null;
}

export async function listCashflowEntries(
  entrepreneurId: string,
  startDate?: string,
  endDate?: string,
) {
  try {
    const client = sb();
    let query = client
      .from("cashflow_entries")
      .select(
        "id,entrepreneur_id,type,title,description,amount,date,category_id,category_name,payment_method,client_supplier,invoice_number,has_invoice",
      )
      .eq("entrepreneur_id", entrepreneurId)
      .order("date", { ascending: false });
    if (startDate) query = query.gte("date", startDate);
    if (endDate) query = query.lte("date", endDate);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    if (!isSupabaseSchemaOrPermissionError(error)) throw error;
    return [];
  }
}

export async function updateCashflowEntry(
  entrepreneurId: string,
  txId: string,
  payload: Record<string, unknown>,
) {
  const client = sb();
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  const keys = [
    "title",
    "description",
    "amount",
    "category_id",
    "category_name",
    "date",
    "payment_method",
    "client_supplier",
    "invoice_number",
    "has_invoice",
  ];
  keys.forEach((k) => {
    if (payload[k] !== undefined) patch[k] = payload[k];
  });
  const { data, error } = await client
    .from("cashflow_entries")
    .update(patch)
    .eq("id", txId)
    .eq("entrepreneur_id", entrepreneurId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function createCashflowEntriesFromCapture(
  entrepreneurId: string,
  transactions: ParsedCaptureTransaction[],
): Promise<Array<Record<string, unknown>>> {
  if (!entrepreneurId || !Array.isArray(transactions) || transactions.length === 0) {
    return [];
  }
  const client = sb();
  const created: Array<Record<string, unknown>> = [];

  for (const tx of transactions) {
    const amount = Number(tx.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const type: TxType = normalizeTxType(tx.type);
    const categoryName = String(tx.category_name || "").trim() || "Non catégorisé";
    const categoryId = await resolveCategoryIdByName(categoryName, type);
    const row: Record<string, unknown> = {
      entrepreneur_id: entrepreneurId,
      type,
      title: String(tx.title || tx.description || (type === "income" ? "Recette" : "Dépense")),
      description: String(tx.description || tx.title || ""),
      amount,
      date: String(tx.date || new Date().toISOString().slice(0, 10)),
      category_id: categoryId,
      category_name: categoryName,
      payment_method: String(tx.payment_method || "cash"),
      client_supplier: tx.client_supplier ? String(tx.client_supplier) : null,
      invoice_number: tx.invoice_number ? String(tx.invoice_number) : null,
      has_invoice: Boolean(tx.invoice_number),
    };

    const { data, error } = await client
      .from("cashflow_entries")
      .insert(row)
      .select("*")
      .single();
    if (error) throw error;
    if (data) created.push(data as Record<string, unknown>);
  }
  return created;
}

export async function getFinanceSummary(
  entrepreneurId: string,
  startDate?: string,
  endDate?: string,
) {
  const list = (await listCashflowEntries(
    entrepreneurId,
    startDate,
    endDate,
  )) as Array<Record<string, unknown>>;
  const incomes = list.filter((r) => r.type === "income");
  const expenses = list.filter((r) => r.type === "expense");
  const totalProduits = incomes.reduce(
    (acc, r) => acc + Number(r.amount || 0),
    0,
  );
  const totalCharges = expenses.reduce(
    (acc, r) => acc + Number(r.amount || 0),
    0,
  );
  const benefice = totalProduits - totalCharges;
  const marge = totalProduits > 0 ? (benefice / totalProduits) * 100 : 0;

  const groupBy = (rows: Array<Record<string, unknown>>) => {
    const map = new Map<string, number>();
    rows.forEach((r) => {
      const k = String(r.category_name || "Non categorise");
      map.set(k, (map.get(k) || 0) + Number(r.amount || 0));
    });
    const total = rows.reduce((acc, r) => acc + Number(r.amount || 0), 0);
    return [...map.entries()].map(([category_name, amount]) => ({
      category_name,
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0,
    }));
  };

  return {
    period: {
      start_date: startDate || "",
      end_date: endDate || "",
      start_date_display: startDate || "",
      end_date_display: endDate || "",
    },
    summary: {
      total_produits: totalProduits,
      total_charges: totalCharges,
      benefice,
      marge_beneficiaire: marge,
    },
    produits_by_category: groupBy(incomes),
    charges_by_category: groupBy(expenses),
    transaction_count: {
      income: incomes.length,
      expense: expenses.length,
      total: list.length,
    },
  };
}

export async function exportFinanceReportPdf(
  entrepreneurId: string,
  startDate?: string,
  endDate?: string,
): Promise<Blob> {
  const client = sb();
  const payload = { entrepreneurId, startDate, endDate };
  const { data, error } = await client.functions.invoke("finance-export-pdf", {
    body: payload,
  });
  if (error) throw error;
  if (data instanceof Blob) return data;
  if (typeof data === "string") return new Blob([data], { type: "application/pdf" });
  return new Blob([JSON.stringify(data ?? {})], { type: "application/json" });
}

export function normalizeTxType(v: unknown): TxType {
  return String(v || "").toLowerCase() === "income" ? "income" : "expense";
}
