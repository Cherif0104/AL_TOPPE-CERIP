import { API_BASE_URL, isLocalDataBackend, isSupabaseAuthActive } from "@/config";
import { apiService } from "./api";
import {
  extractEntrepreneurListFromCoachPayload,
  normalizeEntrepreneurFromApiItem,
} from "./coachEntrepreneurNormalize";
import {
  getLocalAssignments,
  getLocalCoachEntrepreneurs,
  getLocalSessions,
} from "./localDataBackend";
import * as sbCoach from "./supabaseCoaching";

const getAuthHeaders = (contentType: string | null = "application/json") => {
  const headers: Record<string, string> = {};
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("altoppe_access_token") : null;
    if (contentType) headers["Content-Type"] = contentType;
    if (token) headers["Authorization"] = `Bearer ${token}`;
  } catch (e) {
    console.warn("coachService: erreur en lisant le token du localStorage", e);
  }
  return headers;
};

function normalizeRole(role?: string): string {
  return String(role ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** API Django ou profil : id coach à utiliser pour les appels. */
export function resolveCoachId(user: {
  id?: string;
  coach?: { id?: string };
  role?: string;
}): string | null {
  if (user.coach?.id) return String(user.coach.id);
  const rk = normalizeRole(user.role);
  if (user.id && (rk === "coach" || rk === "formateur")) return String(user.id);
  return null;
}

function coachingViaSupabase(): boolean {
  return isSupabaseAuthActive();
}

export const coachService = {
  async getCoachEntrepreneurs(coachId: string) {
    if (coachingViaSupabase()) {
      return sbCoach.getCoachEntrepreneursNormalized(coachId);
    }
    if (isLocalDataBackend()) {
      const raw = getLocalCoachEntrepreneurs(coachId);
      const list = extractEntrepreneurListFromCoachPayload(raw);
      return list.map((item) => normalizeEntrepreneurFromApiItem(item));
    }
    const res = await fetch(`${API_BASE_URL}/coaching/${coachId}/entrepreneurs/`, {
      headers: getAuthHeaders(null),
    });
    if (!res.ok) throw new Error("Erreur récupération entrepreneurs coach");
    const data = await res.json();
    const list = extractEntrepreneurListFromCoachPayload(data);
    return list.map((item) => normalizeEntrepreneurFromApiItem(item));
  },

  async createEntrepreneur(data: Record<string, unknown>) {
    if (coachingViaSupabase()) {
      return sbCoach.createEntrepreneurRecord(data);
    }
    if (isLocalDataBackend()) {
      const formattedData = {
        ...data,
        phone: data.phone,
        whatsapp: data.whatsapp,
      };
      return apiService.request("/entrepreneurs/", {
        method: "POST",
        body: JSON.stringify(formattedData),
      });
    }
    console.log("Données envoyées à l'API:", {
      ...data,
      phone: data.phone,
      whatsapp: data.whatsapp,
    });
    const formattedData = {
      ...data,
      phone: data.phone,
      whatsapp: data.whatsapp,
    };

    const res = await fetch(`${API_BASE_URL}/entrepreneurs/`, {
      method: "POST",
      headers: getAuthHeaders("application/json"),
      body: JSON.stringify(formattedData),
    });

    if (!res.ok) {
      let errorData = null;
      try {
        const text = await res.text();
        if (text) {
          try {
            errorData = JSON.parse(text);
          } catch {
            errorData = { detail: text };
          }
        }
      } catch (e) {
        console.error("Erreur lors de la lecture de la réponse:", e);
      }

      const errorMessage =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (errorData as any)?.non_field_errors?.[0] ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (Array.isArray((errorData as any)?.phone) ? (errorData as any).phone[0] : (errorData as any)?.phone) ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (errorData as any)?.detail ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (errorData as any)?.message ||
        "Erreur lors de la création de l'entrepreneur";

      const error = new Error(errorMessage) as Error & { status?: number; body?: unknown };
      error.status = res.status;
      error.body = errorData || { detail: errorMessage };
      throw error;
    }

    return await res.json();
  },

  async assignEntrepreneurToCoach(data: Record<string, unknown>) {
    if (coachingViaSupabase()) {
      return sbCoach.assignEntrepreneurToCoachRecord(
        data as {
          coach?: string;
          entrepreneur?: string;
          start_date?: string;
          end_date?: string;
          objectives?: unknown;
        },
      );
    }
    if (isLocalDataBackend()) {
      return apiService.request("/coaching/assignments/", {
        method: "POST",
        body: JSON.stringify(data),
      });
    }
    const res = await fetch(`${API_BASE_URL}/coaching/assignments/`, {
      method: "POST",
      headers: getAuthHeaders("application/json"),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      let errorMessage = "Erreur lors de l'assignation de l'entrepreneur au coach";
      if (errorData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ed = errorData as any;
        if (ed.non_field_errors && Array.isArray(ed.non_field_errors)) {
          errorMessage = ed.non_field_errors[0];
        } else if (ed.detail) errorMessage = ed.detail;
        else if (ed.message) errorMessage = ed.message;
        else if (ed.entrepreneur) errorMessage = Array.isArray(ed.entrepreneur) ? ed.entrepreneur[0] : String(ed.entrepreneur);
        else if (ed.coach) errorMessage = Array.isArray(ed.coach) ? ed.coach[0] : String(ed.coach);
      }
      const error = new Error(errorMessage) as Error & { status?: number; body?: unknown };
      error.status = res.status;
      error.body = errorData;
      throw error;
    }
    return await res.json();
  },

  async getSessions(coachId?: string, entrepreneurId?: string, dateFrom?: string, dateTo?: string) {
    if (coachingViaSupabase()) {
      return sbCoach.getSessionsForCoach(coachId, entrepreneurId, dateFrom, dateTo);
    }
    if (isLocalDataBackend()) {
      let list = getLocalSessions(coachId);
      if (entrepreneurId) {
        list = list.filter((s) => String(s.entrepreneur) === String(entrepreneurId));
      }
      return list;
    }
    let url = `${API_BASE_URL}/coaching/sessions/`;
    const params = new URLSearchParams();
    if (coachId) params.append("coach_id", String(coachId));
    if (entrepreneurId) params.append("entrepreneur_id", String(entrepreneurId));
    if (dateFrom) params.append("date_from", dateFrom);
    if (dateTo) params.append("date_to", dateTo);
    if (params.toString()) url = `${url}?${params.toString()}`;

    try {
      const res = await fetch(url, { headers: getAuthHeaders(null) });
      if (!res.ok) {
        const errText = await res.text().catch(() => null);
        const err = new Error("Erreur récupération sessions") as Error & { status?: number; body?: unknown };
        err.status = res.status;
        err.body = errText;
        throw err;
      }
      const data = await res.json().catch(() => null);
      if (!data) return [];
      if (Array.isArray(data)) return data;
      if (Array.isArray(data.results)) return data.results;
      return [];
    } catch (e) {
      console.warn("coachService.getSessions: réseau ou API indisponible", e);
      return [];
    }
  },

  async getAssignments(coachId?: string) {
    if (coachingViaSupabase()) {
      if (!coachId) return [];
      return sbCoach.getAssignmentsForCoach(coachId);
    }
    if (isLocalDataBackend()) {
      return getLocalAssignments(coachId);
    }
    let url = `${API_BASE_URL}/coaching/assignments/`;
    if (coachId) {
      const params = new URLSearchParams({ coach: String(coachId) });
      url = `${url}?${params.toString()}`;
    }
    try {
      const res = await fetch(url, { headers: getAuthHeaders(null) });
      if (!res.ok) {
        const errText = await res.text().catch(() => null);
        const err = new Error("Erreur récupération assignations") as Error & { status?: number; body?: unknown };
        err.status = res.status;
        err.body = errText;
        throw err;
      }
      const data = await res.json().catch(() => null);
      if (!data) return [];
      if (Array.isArray(data)) return data;
      if (Array.isArray(data.results)) return data.results;
      return [];
    } catch (e) {
      console.warn("coachService.getAssignments: réseau ou API indisponible", e);
      return [];
    }
  },

  async addSession(data: Record<string, unknown>) {
    if (coachingViaSupabase()) {
      return sbCoach.addSessionRecord(data);
    }
    if (isLocalDataBackend()) {
      return apiService.request("/coaching/sessions/", {
        method: "POST",
        body: JSON.stringify(data),
      });
    }
    console.log("Envoi POST /coaching/sessions/ payload:", data);
    const res = await fetch(`${API_BASE_URL}/coaching/sessions/`, {
      method: "POST",
      headers: getAuthHeaders("application/json"),
      body: JSON.stringify(data),
    });
    const raw = await res.text().catch(() => null);
    let parsed: unknown = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = raw;
    }
    if (!res.ok) {
      const parsedObj = parsed as { detail?: string; message?: string } | null;
      const message =
      (parsedObj && (parsedObj.detail || parsedObj.message)) || (typeof parsed === "string" ? parsed : `HTTP ${res.status}`);
      const err = new Error(message) as Error & { status?: number; body?: unknown };
      err.status = res.status;
      err.body = parsed;
      throw err;
    }
    return parsed ?? null;
  },

  async updateSession(id: string, data: Record<string, unknown>) {
    if (coachingViaSupabase()) {
      return sbCoach.updateSessionRecord(id, data);
    }
    if (isLocalDataBackend()) {
      return apiService.request(`/coaching/sessions/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    }
    const res = await fetch(`${API_BASE_URL}/coaching/sessions/${id}/`, {
      method: "PATCH",
      headers: getAuthHeaders("application/json"),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Erreur modification session");
    return await res.json();
  },

  async deleteSession(id: string) {
    if (coachingViaSupabase()) {
      return sbCoach.deleteSessionRecord(id);
    }
    if (isLocalDataBackend()) {
      await apiService.request(`/coaching/sessions/${id}/`, { method: "DELETE" });
      return true;
    }
    const res = await fetch(`${API_BASE_URL}/coaching/sessions/${id}/`, {
      method: "DELETE",
      headers: getAuthHeaders(null),
    });
    if (!res.ok) throw new Error("Erreur suppression session");
    return true;
  },

  async getReports(coachId?: string) {
    if (coachingViaSupabase() && coachId) {
      return sbCoach.getCoachPerformanceFromDb(coachId);
    }
    if (isLocalDataBackend()) {
      const path = coachId ? `/coaching/${coachId}/performance/` : `/coaching/performance/`;
      return apiService.request(path);
    }
    let url = `${API_BASE_URL}/coaching/performance/`;
    if (coachId) url = `${API_BASE_URL}/coaching/${coachId}/performance/`;
    const res = await fetch(url, { headers: getAuthHeaders(null) });
    const raw = await res.text().catch(() => null);
    let parsed: unknown = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = raw;
    }
    if (!res.ok) {
      const err = new Error("Erreur récupération rapport coach") as Error & { status?: number; body?: unknown };
      err.status = res.status;
      err.body = parsed;
      throw err;
    }
    return parsed;
  },

  async getEntrepreneur(id: string) {
    if (coachingViaSupabase()) {
      return sbCoach.getEntrepreneurRecord(id);
    }
    if (isLocalDataBackend()) {
      return apiService.request(`/entrepreneurs/${id}/`);
    }
    const res = await fetch(`${API_BASE_URL}/entrepreneurs/${id}/`, {
      headers: getAuthHeaders(null),
    });
    if (!res.ok) throw new Error("Erreur récupération détails entrepreneur");
    return await res.json();
  },

  async updateEntrepreneur(id: string, data: Record<string, unknown>) {
    if (coachingViaSupabase()) {
      return sbCoach.updateEntrepreneurRecord(id, data);
    }
    if (isLocalDataBackend()) {
      return apiService.request(`/entrepreneurs/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    }
    const res = await fetch(`${API_BASE_URL}/entrepreneurs/${id}/`, {
      method: "PATCH",
      headers: getAuthHeaders("application/json"),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      const error = new Error(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (errorData as any)?.non_field_errors?.[0] ||
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (errorData as any)?.detail ||
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (errorData as any)?.message ||
          "Erreur lors de la modification de l'entrepreneur",
      ) as Error & { status?: number; body?: unknown };
      error.status = res.status;
      error.body = errorData;
      throw error;
    }
    return await res.json();
  },
};
