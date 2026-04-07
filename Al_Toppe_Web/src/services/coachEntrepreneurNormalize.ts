/**
 * Forme unique pour le tableau « Gestion des entrepreneurs » et le dashboard coach.
 */

export type NormalizedCoachEntrepreneur = {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  business: string;
  sector: string;
  address: string;
  status: string;
  progress: number;
  lastSession: string | null;
  revenue: string;
  raw: Record<string, unknown>;
};

function getStr(e: Record<string, unknown>, k: string): string {
  return typeof e[k] === "string" ? (e[k] as string) : "";
}

function getArr(e: Record<string, unknown>, k: string): unknown[] {
  return Array.isArray(e[k]) ? (e[k] as unknown[]) : [];
}

/** Réponse API Django /coaching/:id/entrepreneurs/ ou /entrepreneurs/ */
export function normalizeEntrepreneurFromApiItem(item: unknown): NormalizedCoachEntrepreneur {
  const e = item as Record<string, unknown>;
  const first_name = getStr(e, "first_name") || getStr(e, "prenom") || getStr(e, "prenom_fr");
  const last_name = getStr(e, "last_name") || getStr(e, "nom") || getStr(e, "nom_fr");
  const activities = getArr(e, "activities");
  const firstActivity =
    activities.length > 0 ? (activities[0] as Record<string, unknown>) : null;
  const business = firstActivity
    ? typeof firstActivity["title"] === "string"
      ? (firstActivity["title"] as string)
      : ""
    : getStr(e, "business") || getStr(e, "entreprise");
  const sector = firstActivity
    ? typeof firstActivity["sector_display"] === "string"
      ? (firstActivity["sector_display"] as string)
      : typeof firstActivity["sector"] === "string"
        ? (firstActivity["sector"] as string)
        : ""
    : getStr(e, "secteur") || getStr(e, "sector");
  const locationsArr = Array.isArray(e["locations"]) ? (e["locations"] as unknown[]) : [];
  const addressFromLocations =
    locationsArr.length > 0 &&
    typeof (locationsArr[0] as Record<string, unknown>)["address"] === "string"
      ? String((locationsArr[0] as Record<string, unknown>)["address"])
      : "";
  const address = getStr(e, "address") || addressFromLocations || getStr(e, "adresse");
  const isActive = typeof e["is_active"] === "boolean" ? (e["is_active"] as boolean) : undefined;
  const status =
    typeof isActive === "boolean"
      ? isActive
        ? "En cours"
        : "Suspendu"
      : getStr(e, "status_display") || getStr(e, "status") || "Nouveau";
  const progress =
    typeof e["progres"] === "number"
      ? (e["progres"] as number)
      : typeof e["progress"] === "number"
        ? (e["progress"] as number)
        : 0;
  const lastSession = getStr(e, "last_session") || getStr(e, "dernier_session") || null;
  const revenue =
    getStr(e, "total_revenue") || getStr(e, "chiffre_affaires") || getStr(e, "revenue") || "0 FCFA";

  return {
    id: getStr(e, "id") || String(e["id"] || ""),
    first_name,
    last_name,
    full_name: getStr(e, "full_name") || `${first_name} ${last_name}`.trim(),
    business,
    sector,
    address,
    status,
    progress,
    lastSession,
    revenue,
    raw: e,
  };
}

export function extractEntrepreneurListFromCoachPayload(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as { entrepreneurs?: unknown[] }).entrepreneurs)
  ) {
    return (data as { entrepreneurs: unknown[] }).entrepreneurs;
  }
  return [];
}

/** Ligne Postgres altoppe_entrepreneurs */
export function normalizeEntrepreneurFromDbRow(row: Record<string, unknown>): NormalizedCoachEntrepreneur {
  const first_name = String(row.first_name ?? "");
  const last_name = String(row.last_name ?? "");
  const status = String(row.status ?? "Nouveau");
  const progress = typeof row.progress === "number" ? row.progress : 0;

  return {
    id: String(row.id ?? ""),
    first_name,
    last_name,
    full_name: `${first_name} ${last_name}`.trim() || String(row.email ?? "—"),
    business: String(row.business_name ?? ""),
    sector: String(row.sector ?? ""),
    address: String(row.address ?? ""),
    status,
    progress,
    lastSession: null,
    revenue: "0 FCFA",
    raw: row,
  };
}
