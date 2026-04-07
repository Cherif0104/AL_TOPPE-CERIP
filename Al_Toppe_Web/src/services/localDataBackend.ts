/**
 * Backend de données locales (hors API Django) — démo / dev sans serveur.
 * Activé par défaut ; pour utiliser l’API réelle : VITE_DATA_BACKEND=remote dans .env
 */
import type {
  Coach,
  CoachAssignment,
  CoachingSession,
  User,
} from "./api";
export { isLocalDataBackend } from "@/config";

let localBusinessPlans = seedBusinessPlans();
const localAssignments = seedAssignments();
const localSessions = seedSessions();
let localEntrepreneurs = seedEntrepreneurs();
const localFinanceCategories = seedFinanceCategories();

function seedBusinessPlans() {
  const now = new Date().toISOString();
  return [
    {
      id: "local-bp-1",
      title: "Boutique locale — plan local",
      summary: "Données de démonstration (sans API Django).",
      status: "under_review" as const,
      status_display: "En revue",
      entrepreneur: "local-ent-1",
      entrepreneur_name: "Aminata Diallo",
      activity_title: "Commerce",
      sector_display: "Commerce",
      is_validated: false,
      created_at: now,
      updated_at: now,
      financial_projections: {
        year_1_revenue: 1200000,
        monthly_revenue: 100000,
      },
    },
    {
      id: "local-bp-2",
      title: "Atelier artisanal",
      summary: "Second exemple en mémoire locale.",
      status: "draft" as const,
      status_display: "Brouillon",
      entrepreneur: "local-ent-2",
      entrepreneur_name: "Ousmane Fall",
      activity_title: "Artisanat",
      sector_display: "Artisanat",
      is_validated: false,
      created_at: now,
      updated_at: now,
    },
  ];
}

function seedAssignments(): CoachAssignment[] {
  const now = new Date().toISOString();
  return [
    {
      id: "local-asg-1",
      coach: "local-coach-1",
      entrepreneur: "local-ent-1",
      status: "active",
      start_date: now.split("T")[0],
      end_date: null,
      duration_days: 90,
      objectives: "Structurer l’offre",
      progress_notes: "",
      initial_assessment: "",
      final_assessment: "",
      created_at: now,
      updated_at: now,
    },
  ];
}

function seedSessions(): CoachingSession[] {
  const now = new Date().toISOString();
  return [
    {
      id: "local-sess-1",
      assignment: "local-asg-1",
      coach: "local-coach-1",
      entrepreneur: "local-ent-1",
      session_type: "individual",
      status: "scheduled",
      scheduled_date: now,
      duration_minutes: 60,
      actual_start_time: null,
      actual_end_time: null,
      actual_duration_minutes: null,
      agenda: "Point d’étape",
      notes: "",
      action_items: [],
      entrepreneur_rating: null,
      coach_rating: null,
      feedback: "",
      created_at: now,
      updated_at: now,
      entrepreneur_name: "Aminata Diallo",
      entrepreneur_detail: { full_name: "Aminata Diallo" },
    },
  ];
}

function seedEntrepreneurs(): Record<string, unknown>[] {
  return [
    {
      id: "local-ent-1",
      full_name: "Aminata Diallo",
      first_name: "Aminata",
      last_name: "Diallo",
      phone: "221 77 000 00 01",
      is_active: true,
      activities: [{ title: "Boutique quartier" }],
    },
    {
      id: "local-ent-2",
      full_name: "Ousmane Fall",
      first_name: "Ousmane",
      last_name: "Fall",
      phone: "221 77 000 00 02",
      is_active: true,
      activities: [{ title: "Atelier menuiserie" }],
    },
  ];
}

function seedFinanceCategories() {
  return [
    { id: "fc1", name: "Ventes", type: "income" as const },
    { id: "fc2", name: "Achats", type: "expense" as const },
    { id: "fc3", name: "Salaires", type: "expense" as const },
  ];
}

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem("altoppe_user");
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function defaultLocalUser(): User {
  return {
    id: "local-user-1",
    phone: "221000000000",
    email: "demo@local.dev",
    role: "coach",
    role_display: "Coach",
    language: "fr",
    is_active: true,
    created_at: new Date().toISOString(),
    last_login: new Date().toISOString(),
    full_name: "Utilisateur local",
    coach: {
      id: "local-coach-1",
      user: "local-user-1",
      organization: "AL TOPPE (local)",
      specialization: "Accompagnement",
      years_experience: 5,
      is_certified: true,
      is_active: true,
      max_entrepreneurs: 20,
      current_entrepreneurs_count: 2,
      available_slots: 18,
      bio: "",
      skills: ["Gestion", "Marketing"],
      certifications: [],
      preferred_contact_method: "whatsapp",
      availability_schedule: {},
      success_rate: "85",
      average_rating: "4.5",
      total_sessions: 10,
      completed_sessions: 8,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
}

/** Catégories finances pour TransactionJournal et écrans similaires */
export function getLocalFinanceCategories(): Array<{
  id: string;
  name: string;
  type: "income" | "expense";
}> {
  return localFinanceCategories.map((c) => ({ ...c }));
}

/** GET /entrepreneurs/ — liste démo */
export function getLocalEntrepreneursList(): { results: Record<string, unknown>[] } {
  return { results: localEntrepreneurs };
}

/** Coaching : assignations filtrées par coach */
export function getLocalAssignments(coachId?: string): CoachAssignment[] {
  if (!coachId) return [...localAssignments];
  return localAssignments.filter((a) => String(a.coach) === String(coachId));
}

/** Coaching : sessions filtrées */
export function getLocalSessions(coachId?: string): CoachingSession[] {
  if (!coachId) return [...localSessions];
  return localSessions.filter((s) => String(s.coach) === String(coachId));
}

/** Coaching : entrepreneurs d’un coach */
export function getLocalCoachEntrepreneurs(_coachId: string): Record<string, unknown>[] {
  return localEntrepreneurs.map((e) => ({ ...e }));
}

/**
 * Répond aux requêtes HTTP simulées (même contrat que l’API Django).
 */
export async function localMakeRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const qIndex = endpoint.indexOf("?");
  const pathFull = qIndex >= 0 ? endpoint.slice(0, qIndex) : endpoint;
  const query = qIndex >= 0 ? endpoint.slice(qIndex + 1) : "";
  const params = new URLSearchParams(query);
  const path = pathFull.replace(/\/$/, "") || "/";
  let body: Record<string, unknown> = {};
  if (
    options.body &&
    typeof options.body === "string" &&
    options.body.length > 0
  ) {
    try {
      body = JSON.parse(options.body) as Record<string, unknown>;
    } catch {
      body = {};
    }
  }

  // --- Auth ---
  if (method === "POST" && path === "/auth/login") {
    const u = readStoredUser() || defaultLocalUser();
    const access = "local-access-token";
    const refresh = "local-refresh-token";
    localStorage.setItem("altoppe_access_token", access);
    localStorage.setItem("altoppe_refresh_token", refresh);
    localStorage.setItem("altoppe_user", JSON.stringify(u));
    return { access, refresh, user: u } as T;
  }
  if (method === "GET" && path === "/auth/profile") {
    const u = readStoredUser() || defaultLocalUser();
    return u as T;
  }
  if (method === "PATCH" && path === "/auth/profile/update") {
    const prev = readStoredUser() || defaultLocalUser();
    const merged = {
      ...prev,
      ...body,
      email: (body.email as string) ?? prev.email,
      phone: (body.phone as string) ?? prev.phone,
      language: (body.language as string) ?? prev.language,
    } as User;
    localStorage.setItem("altoppe_user", JSON.stringify(merged));
    return merged as T;
  }

  // --- Business plans ---
  if (method === "GET" && path === "/business-plans") {
    let list = [...localBusinessPlans];
    const st = params.get("status");
    if (st && st !== "all") {
      list = list.filter((p) => p.status === st);
    }
    return list as T;
  }
  const bpValidate = path.match(
    /^\/business-plans\/([^/]+)\/workflow\/validate$/,
  );
  if (bpValidate && method === "POST") {
    return {
      status: "approved",
      message: "OK (local)",
      plan_id: bpValidate[1],
    } as T;
  }

  const bpOne = path.match(/^\/business-plans\/([^/]+)$/);
  if (bpOne) {
    const id = bpOne[1];
    if (method === "GET") {
      const p = localBusinessPlans.find((x) => x.id === id);
      if (!p) throw new Error("Plan introuvable");
      return p as T;
    }
    if (method === "PATCH") {
      const idx = localBusinessPlans.findIndex((x) => x.id === id);
      if (idx < 0) throw new Error("Plan introuvable");
      localBusinessPlans[idx] = {
        ...localBusinessPlans[idx],
        ...body,
        updated_at: new Date().toISOString(),
      } as (typeof localBusinessPlans)[0];
      return localBusinessPlans[idx] as T;
    }
  }

  // --- Coaching lists (via apiService) ---
  if (method === "GET" && path === "/coaching/assignments") {
    return [...localAssignments] as T;
  }
  if (path === "/coaching/assignments/bulk-assign" && method === "POST") {
    return {
      message: "OK (local)",
      created: [],
      skipped: [],
      errors: [],
      summary: {
        total_requested: 0,
        created: 0,
        skipped: 0,
        errors: 0,
      },
    } as T;
  }
  if (method === "GET" && path === "/coaching/sessions") {
    return [...localSessions] as T;
  }

  // --- Admin ---
  if (method === "GET" && path === "/admin/stats") {
    return {
      total_users: 12,
      active_entrepreneurs: 8,
      total_coaches: 3,
      total_bailleurs: 1,
      monthly_growth: "+2 %",
      total_funding: "15000000",
      entrepreneurs_new_this_month: 2,
      funding_vs_prev_label: "Stable",
      system_health: 98,
      recent_activities: [],
      system_metrics: [
        { name: "CPU", value: 12, color: "#006666" },
        { name: "Mémoire", value: 34, color: "#FF9933" },
      ],
    } as T;
  }
  if (method === "GET" && path === "/admin/analytics") {
    return {
      period: params.get("period") || "last_30_days",
      series: [],
      summary: { total: 0 },
    } as T;
  }
  if (method === "GET" && path === "/admin/monitoring") {
    return { status: "ok", services: [] } as T;
  }
  if (method === "GET" && path === "/admin/settings") {
    return { site_name: "AL TOPPE (local)", maintenance: false } as T;
  }
  if (method === "PUT" && path === "/admin/settings") {
    return { ...body, saved: true } as T;
  }

  if (method === "GET" && path === "/admin/users") {
    return {
      results: [],
      count: 0,
    } as T;
  }
  const adminUserPatch = path.match(/^\/admin\/users\/([^/]+)$/);
  if (adminUserPatch && method === "PATCH") {
    return { id: adminUserPatch[1], ...body } as T;
  }
  if (adminUserPatch && method === "DELETE") {
    return undefined as T;
  }
  if (path.match(/^\/admin\/users\/[^/]+\/set_password\/?$/) && method === "POST") {
    return { ok: true } as T;
  }
  if (path === "/admin/users" && method === "POST") {
    return { id: `local-${Date.now()}`, ...body } as T;
  }

  // --- Entrepreneurs / coaching CRUD ---
  if (method === "GET" && path === "/entrepreneurs") {
    return { results: localEntrepreneurs, count: localEntrepreneurs.length } as T;
  }
  if (method === "POST" && path === "/entrepreneurs") {
    const row = {
      id: `local-ent-${Date.now()}`,
      ...body,
    };
    localEntrepreneurs = [...localEntrepreneurs, row];
    return row as T;
  }
  const entOne = path.match(/^\/entrepreneurs\/([^/]+)$/);
  if (entOne) {
    const id = entOne[1];
    if (method === "GET") {
      const row = localEntrepreneurs.find((e) => String(e.id) === id);
      if (!row) throw new Error("Entrepreneur introuvable");
      return row as T;
    }
    if (method === "PATCH") {
      const idx = localEntrepreneurs.findIndex((e) => String(e.id) === id);
      if (idx < 0) throw new Error("Entrepreneur introuvable");
      localEntrepreneurs[idx] = { ...localEntrepreneurs[idx], ...body };
      return localEntrepreneurs[idx] as T;
    }
  }

  if (method === "GET" && (path === "/coaching/performance" || /^\/coaching\/[^/]+\/performance$/.test(path))) {
    return {
      sessions_completed: 8,
      entrepreneurs_active: 2,
      rating_avg: 4.5,
      summary: "Données locales",
    } as T;
  }

  if (method === "GET" && path === "/coaching") {
    const c: Coach = {
      id: "local-coach-1",
      user: "local-user-1",
      organization: "Coach démo",
      specialization: "Général",
      years_experience: 5,
      is_certified: true,
      is_active: true,
      max_entrepreneurs: 20,
      current_entrepreneurs_count: 2,
      available_slots: 18,
      bio: "",
      skills: [],
      certifications: [],
      preferred_contact_method: "phone",
      availability_schedule: {},
      success_rate: "80",
      average_rating: "4.5",
      total_sessions: 5,
      completed_sessions: 4,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return [c] as T;
  }

  const coachIdPath = path.match(/^\/coaching\/([^/]+)$/);
  if (coachIdPath && method === "PATCH") {
    return { id: coachIdPath[1], ...body } as T;
  }
  if (path === "/coaching" && method === "POST") {
    return { id: `local-coach-${Date.now()}`, ...body } as T;
  }

  const coachEnt = path.match(/^\/coaching\/([^/]+)\/entrepreneurs\/?$/);
  if (coachEnt && method === "GET") {
    return getLocalCoachEntrepreneurs(coachEnt[1]) as T;
  }

  if (method === "GET" && path === "/finances/categories") {
    return { results: localFinanceCategories } as T;
  }

  // --- Assignments POST ---
  if (path === "/coaching/assignments" && method === "POST") {
    return { id: `local-asg-${Date.now()}`, ...body } as T;
  }

  // --- Sessions POST/PATCH ---
  if (path === "/coaching/sessions" && method === "POST") {
    return { id: `local-sess-${Date.now()}`, ...body } as T;
  }
  const sessId = path.match(/^\/coaching\/sessions\/([^/]+)\/?$/);
  if (sessId && (method === "PATCH" || method === "DELETE")) {
    return (method === "DELETE" ? true : { id: sessId[1], ...body }) as T;
  }

  console.warn(`[localDataBackend] non mappé: ${method} ${endpoint} — retour vide`);
  if (method === "GET") {
    if (path.endsWith("/") || path.split("/").filter(Boolean).length <= 1) {
      return [] as unknown as T;
    }
    return {} as T;
  }
  return { ok: true, local: true } as T;
}
