// Service API pour AL-TOPPE
// L'URL de base est centralisée dans src/config.ts

// Imports pour la gestion d'erreurs et le cache
import { ErrorHandler, NetworkError } from "./errorHandler";
import { cacheService } from "./cacheService";
import { API_BASE_URL, isLocalDataBackend, isSupabaseDataBackend } from "@/config";
import { localMakeRequest } from "./localDataBackend";
import { supabaseMakeRequest } from "./supabaseGateway";
// Types basés sur l'API AL-TOPPE
export interface Location {
  id: string;
  address: string;
  region: string;
  city: string;
  lat: string;
  lng: string;
  is_primary: boolean;
  created_at: string;
}

export interface Activity {
  id: string;
  title: string;
  sector:
    | "commerce"
    | "agriculture"
    | "artisanat"
    | "service"
    | "technologie";
  sector_display: string;
  description: string;
  creation_date: string;
  legal_form: "Informel" | "Formel";
  legal_form_display: string;
  tax_regime: "Non imposable" | "Imposable";
  status: "active" | "inactive" | "suspended";
  status_display: string;
  age_days: number;
  total_revenue: string;
  total_expenses: string;
  profit: string;
  created_at: string;
  updated_at: string;
}

export interface Entrepreneur {
  id: string;
  user: string;
  first_name: string;
  last_name: string;
  full_name: string;
  civility: "M" | "Mme" | "Mlle";
  civility_display: string;
  cni_number: string;
  address: string;
  whatsapp: string;
  birth_date: string;
  age: number;
  phone: string;
  email: string;
  is_active: boolean;
  activities_count: number;
  total_revenue: string;
  locations: Location[];
  activities: Activity[];
  created_at: string;
  updated_at: string;
}

export interface Coach {
  id: string;
  user: string;
  organization: string;
  specialization: string;
  years_experience: number;
  is_certified: boolean;
  is_active: boolean;
  max_entrepreneurs: number;
  current_entrepreneurs_count: number;
  available_slots: number;
  bio: string;
  skills: string[];
  certifications: string[];
  preferred_contact_method: "phone" | "email" | "whatsapp";
  availability_schedule: any;
  success_rate: string;
  average_rating: string;
  total_sessions: number;
  completed_sessions: number;
  created_at: string;
  updated_at: string;
}

export interface CoachAssignment {
  id: string;
  coach: string;
  entrepreneur: string;
  status: "active" | "completed" | "paused" | "cancelled";
  start_date: string;
  end_date: string | null;
  duration_days: number;
  objectives: string;
  progress_notes: string;
  initial_assessment: string;
  final_assessment: string;
  created_at: string;
  updated_at: string;
}

export interface CoachingSession {
  id: string;
  assignment: string;
  coach: string;
  entrepreneur: string;
  session_type:
    | "individual"
    | "group"
    | "workshop"
    | "assessment";
  status:
    | "scheduled"
    | "in_progress"
    | "completed"
    | "cancelled"
    | "no_show";
  scheduled_date: string;
  duration_minutes: number;
  actual_start_time: string | null;
  actual_end_time: string | null;
  actual_duration_minutes: number | null;
  agenda: string;
  notes: string;
  action_items: string[];
  entrepreneur_rating: number | null;
  coach_rating: number | null;
  feedback: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  phone: string;
  email: string;
  role: "entrepreneur" | "coach" | "admin" | "bailleur";
  role_display: string;
  language: string;
  is_active: boolean;
  created_at: string;
  last_login: string;
  full_name: string;
  entrepreneur?: Entrepreneur;
  coach?: Coach;
}

export interface LoginCredentials {
  phone: string;
  password: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface ApiError {
  message: string;
  details?: any;
}

/** GET lecture : erreur réseau / serveur injoignable → liste vide plutôt que throw. */
function isBenignCoachingReadFailure(error: unknown): boolean {
  if (typeof TypeError !== "undefined" && error instanceof TypeError) return true;
  if (!(error instanceof NetworkError)) return false;
  if (error.status === 404 || error.status === 0) return true;
  if (error.code === "NETWORK_ERROR") return true;
  const m = String(error.message || "").toLowerCase();
  if (m.includes("fetch") || m.includes("connexion") || m.includes("network")) return true;
  return false;
}

class ApiService {
  private accessToken: string | null = null;

  constructor() {
    // Récupérer le token du localStorage au démarrage
    this.accessToken = localStorage.getItem(
      "altoppe_access_token",
    );
  }

  /** Réaligne le token mémoire ↔ localStorage (après login, autre onglet, hot reload). */
  syncTokenFromStorage(): void {
    this.accessToken = localStorage.getItem("altoppe_access_token");
  }

  // ===== ADMIN API =====
  async getAdminStats(): Promise<any> {
    return await this.makeRequest<any>("/admin/stats/");
  }

  async getAdminAnalytics(period?: string): Promise<any> {
    const q =
      period && ["last_7_days", "last_30_days", "last_90_days", "last_year"].includes(period)
        ? `?period=${encodeURIComponent(period)}`
        : "";
    return await this.makeRequest<any>(`/admin/analytics/${q}`);
  }

  async getAdminMonitoring(): Promise<any> {
    return await this.makeRequest<any>("/admin/monitoring/");
  }

  async getAdminSettings(): Promise<any> {
    return await this.makeRequest<any>("/admin/settings/");
  }

  async updateAdminSettings(settings: any): Promise<any> {
    return await this.makeRequest<any>("/admin/settings/", {
      method: "PUT",
      body: JSON.stringify(settings),
    }, false);
  }

  // Admin Users CRUD
  async adminListUsers(params?: { search?: string; role?: string; is_active?: boolean; page?: number; }): Promise<any> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.role) query.set('role', params.role);
    if (typeof params?.is_active === 'boolean') query.set('is_active', String(params.is_active));
    if (params?.page) query.set('page', String(params.page));
    const qs = query.toString();
    return await this.makeRequest<any>(`/admin/users/${qs ? `?${qs}` : ''}`);
  }

  async adminCreateUser(data: { phone: string; email?: string; role: string; password: string; password_confirm: string; language?: string; }): Promise<any> {
    return await this.makeRequest<any>("/admin/users/", { method: "POST", body: JSON.stringify(data) }, false);
  }

  async adminUpdateUser(id: string, data: Partial<{ email: string; role: string; language: string; is_active: boolean; }>): Promise<any> {
    return await this.makeRequest<any>(`/admin/users/${id}/`, { method: "PATCH", body: JSON.stringify(data) }, false);
  }

  async adminDeleteUser(id: string): Promise<void> {
    await this.makeRequest<void>(`/admin/users/${id}/`, { method: "DELETE" }, false);
  }

  async adminSetUserPassword(id: string, password: string): Promise<any> {
    return await this.makeRequest<any>(`/admin/users/${id}/set_password/`, { method: "POST", body: JSON.stringify({ password }) }, false);
  }

  // Role profiles
  async createEntrepreneur(data: Record<string, unknown>): Promise<unknown> {
    return await this.makeRequest<unknown>("/entrepreneurs/", { method: "POST", body: JSON.stringify(data) }, false);
  }

  async createBailleur(data: Record<string, unknown>): Promise<unknown> {
    return await this.makeRequest<unknown>("/bailleurs/", { method: "POST", body: JSON.stringify(data) }, false);
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    useCache = true,
  ): Promise<T> {
    this.syncTokenFromStorage();
    if (isSupabaseDataBackend()) {
      const data = await supabaseMakeRequest<T>(endpoint, options);
      return data;
    }
    if (isLocalDataBackend()) {
      return await localMakeRequest<T>(endpoint, options);
    }
    const url = `${API_BASE_URL}${endpoint}`;
    const cacheKey = `request_${endpoint}_${JSON.stringify(options)}`;

    // Vérifier le cache pour les requêtes GET en mode hors-ligne
    if (options.method === "GET" || !options.method) {
      if (ErrorHandler.isOfflineMode() && useCache) {
        const cached = cacheService.get<T>(cacheKey);
        if (cached) {
          console.log(
            `Données récupérées du cache pour ${endpoint}`,
          );
          return cached;
        }
      }
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> | undefined),
    };

    // Ajouter le token d'authentification si disponible
    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await ErrorHandler.withRetry(
        async () => {
          const res = await fetch(url, {
            ...options,
            headers: headers as HeadersInit,
          });

          if (!res.ok) {
            // Créer une erreur avec plus de détails
            let errorData;
            try {
              errorData = await res.json();
            } catch {
              errorData = null;
            }

            throw new NetworkError(
              errorData?.message || `Erreur ${res.status}`,
              res.status,
              errorData?.code,
              errorData,
            );
          }

          return res;
        },
        { maxRetries: 2 },
        `${options.method || "GET"} ${endpoint}`,
      );

      // Gérer le cas où le token a expiré
      if (response.status === 401 && this.accessToken) {
        try {
          // Tenter de rafraîchir le token
          await this.refreshToken();
          // Refaire la requête avec le nouveau token
          headers.Authorization = `Bearer ${this.accessToken}`;
          const retryResponse = await fetch(url, {
            ...options,
            headers: headers as HeadersInit,
          });

          if (!retryResponse.ok) {
            throw new NetworkError(
              `Erreur ${retryResponse.status}`,
              retryResponse.status,
            );
          }

          const data = await retryResponse.json();

          // Mettre en cache les données GET
          if (
            (options.method === "GET" || !options.method) &&
            useCache
          ) {
            cacheService.set(cacheKey, data);
          }

          return data;
        } catch (refreshError) {
          // Si le refresh échoue, déconnecter l'utilisateur
          this.logout();
          throw new NetworkError(
            "Session expirée. Veuillez vous reconnecter.",
            401,
            "TOKEN_EXPIRED",
          );
        }
      }

      const data = await response.json();

      // Mettre en cache les données GET
      if (
        (options.method === "GET" || !options.method) &&
        useCache
      ) {
        cacheService.set(cacheKey, data);
      }

      return data;
    } catch (error) {
      // En mode hors-ligne, essayer de récupérer du cache
      if (!navigator.onLine || ErrorHandler.isOfflineMode()) {
        if (
          (options.method === "GET" || !options.method) &&
          useCache
        ) {
          const cached = cacheService.get<T>(cacheKey);
          if (cached) {
            console.log(
              `Données récupérées du cache (hors-ligne) pour ${endpoint}`,
            );
            return cached;
          }
        }

        // Sauvegarder les opérations de modification pour synchronisation future
        if (
          options.method &&
          ["POST", "PUT", "PATCH", "DELETE"].includes(
            options.method,
          )
        ) {
          cacheService.addPendingSync({
            method: options.method,
            endpoint,
            data: options.body
              ? JSON.parse(options.body as string)
              : null,
            timestamp: Date.now(),
          });
        }
      }

      // Gérer l'erreur avec ErrorHandler
      const apiError = ErrorHandler.handleApiError(
        error,
        `${options.method || "GET"} ${endpoint}`,
      );
      throw new NetworkError(
        apiError.message,
        apiError.status,
        apiError.code,
        apiError.details,
      );
    }
  }

  // Authentification
  async login(
    credentials: LoginCredentials,
  ): Promise<AuthResponse> {
    const response = await this.makeRequest<AuthResponse>(
      "/auth/login/",
      {
        method: "POST",
        body: JSON.stringify(credentials),
      },
    );

    // Stocker le token
    this.accessToken = response.access;
    localStorage.setItem(
      "altoppe_access_token",
      response.access,
    );
    localStorage.setItem(
      "altoppe_refresh_token",
      response.refresh,
    );
    localStorage.setItem(
      "altoppe_user",
      JSON.stringify(response.user),
    );

    return response;
  }

  // Récupérer le profil utilisateur
  async getProfile(): Promise<User> {
    return await this.makeRequest<User>("/auth/profile/");
  }

  async updateProfile(data: Partial<{ email: string; language: string; phone: string }>): Promise<User> {
    return await this.makeRequest<User>("/auth/profile/update/", {
      method: "PATCH",
      body: JSON.stringify(data),
    }, false);
  }

  // Déconnexion
  logout(): void {
    this.accessToken = null;
    localStorage.removeItem("altoppe_access_token");
    localStorage.removeItem("altoppe_refresh_token");
    localStorage.removeItem("altoppe_user");
  }

  // Vérifier si l'utilisateur est connecté
  isAuthenticated(): boolean {
    this.syncTokenFromStorage();
    return !!this.accessToken;
  }

  // Récupérer l'utilisateur stocké localement
  getStoredUser(): User | null {
    const userStr = localStorage.getItem("altoppe_user");
    if (!userStr) return null;
    try {
      return JSON.parse(userStr) as User;
    } catch {
      console.warn("[api] altoppe_user JSON invalide — ignoré.");
      return null;
    }
  }

  // Méthode publique pour faire des requêtes génériques
  async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return await this.makeRequest<T>(endpoint, options);
  }

  async getFinanceCategories(): Promise<Array<{ id: string; name: string; type: "income" | "expense" }>> {
    const response = await this.makeRequest<{ results?: Array<{ id: string; name: string; type: "income" | "expense" }> } | Array<{ id: string; name: string; type: "income" | "expense" }>>(
      "/finances/categories/",
      { method: "GET" },
    );
    if (Array.isArray(response)) return response;
    return Array.isArray(response?.results) ? response.results : [];
  }

  async getCashflowEntries(
    entrepreneurId: string,
    params?: { start_date?: string; end_date?: string },
  ): Promise<Record<string, unknown>[]> {
    const q = new URLSearchParams();
    if (params?.start_date) q.set("start_date", params.start_date);
    if (params?.end_date) q.set("end_date", params.end_date);
    const endpoint = `/finances/entrepreneurs/${entrepreneurId}/cashflow/${q.toString() ? `?${q.toString()}` : ""}`;
    const response = await this.makeRequest<{ results?: Record<string, unknown>[] } | Record<string, unknown>[]>(endpoint, { method: "GET" });
    if (Array.isArray(response)) return response;
    return Array.isArray(response?.results) ? response.results : [];
  }

  async updateCashflowEntry(
    entrepreneurId: string,
    txId: string,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return await this.makeRequest<Record<string, unknown>>(
      `/finances/entrepreneurs/${entrepreneurId}/cashflow/${txId}/`,
      { method: "PATCH", body: JSON.stringify(payload) },
      false,
    );
  }

  async getFinanceSummary(
    entrepreneurId: string,
    params?: { start_date?: string; end_date?: string },
  ): Promise<Record<string, unknown>> {
    const q = new URLSearchParams();
    if (params?.start_date) q.set("start_date", params.start_date);
    if (params?.end_date) q.set("end_date", params.end_date);
    const endpoint = `/finances/entrepreneurs/${entrepreneurId}/report/summary/${q.toString() ? `?${q.toString()}` : ""}`;
    return await this.makeRequest<Record<string, unknown>>(endpoint, { method: "GET" });
  }

  async downloadFinanceReportPdf(
    entrepreneurId: string,
    params?: { start_date?: string; end_date?: string },
  ): Promise<Blob> {
    const q = new URLSearchParams();
    if (params?.start_date) q.set("start_date", params.start_date);
    if (params?.end_date) q.set("end_date", params.end_date);
    const endpoint = `/finances/entrepreneurs/${entrepreneurId}/report/export-pdf/${q.toString() ? `?${q.toString()}` : ""}`;
    const response = await this.makeRequest<{ __blob?: Blob } | Blob>(endpoint, { method: "GET" }, false);
    if (response instanceof Blob) return response;
    if ((response as { __blob?: Blob })?.__blob instanceof Blob) return (response as { __blob: Blob }).__blob;
    return new Blob([JSON.stringify(response ?? {})], { type: "application/json" });
  }

  async downloadBusinessPlanPdf(planId: string): Promise<Blob> {
    const response = await this.makeRequest<{ __blob?: Blob } | Blob>(
      `/business-plans/${planId}/pdf/`,
      { method: "GET" },
      false,
    );
    if (response instanceof Blob) return response;
    if ((response as { __blob?: Blob })?.__blob instanceof Blob) return (response as { __blob: Blob }).__blob;
    return new Blob([JSON.stringify(response ?? {})], { type: "application/json" });
  }

  // Rafraîchir le token (fetch direct : évite la récursion avec makeRequest + 401)
  async refreshToken(): Promise<string> {
    if (isLocalDataBackend() || isSupabaseDataBackend()) {
      const t =
        localStorage.getItem("altoppe_access_token") || "local-access-token";
      this.accessToken = t;
      localStorage.setItem("altoppe_access_token", t);
      return t;
    }
    const refresh = localStorage.getItem("altoppe_refresh_token");
    if (!refresh) {
      throw new Error("Aucun token de rafraîchissement disponible");
    }

    const url = `${API_BASE_URL}/auth/refresh/`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });

    if (!res.ok) {
      let detail: string | undefined;
      try {
        const err = (await res.json()) as { detail?: string; message?: string };
        detail = err.detail || err.message;
      } catch {
        /* ignore */
      }
      throw new NetworkError(detail || `Erreur ${res.status}`, res.status);
    }

    const data = (await res.json()) as {
      access?: string;
      access_token?: string;
      refresh?: string;
    };
    const access = data.access ?? data.access_token;
    if (!access) {
      throw new Error("Réponse refresh invalide (pas de access)");
    }

    this.accessToken = access;
    localStorage.setItem("altoppe_access_token", access);
    if (data.refresh) {
      localStorage.setItem("altoppe_refresh_token", data.refresh);
    }

    return access;
  }

  // ===== COACHES API =====

  // Récupérer la liste des coaches
  async getCoaches(): Promise<Coach[]> {
    try {
      const response = await this.makeRequest<Coach[] | { results: Coach[] }>("/coaching/");
      // Normaliser la réponse : peut être un tableau ou un objet avec 'results'
      const coaches = Array.isArray(response)
        ? response
        : (Array.isArray(response?.results)
          ? response.results
          : []);
      cacheService.cacheCoaches(coaches);
      return coaches;
    } catch (error) {
      const cached = cacheService.getCoaches();
      if (cached) {
        console.log("Récupération des coaches depuis le cache");
        // S'assurer que le cache est aussi un tableau
        return Array.isArray(cached) ? cached : [];
      }
      return []; // Retourner un tableau vide en cas d'erreur
    }
  }

  // Récupérer les détails d'un coach
  async getCoach(id: string): Promise<Coach> {
    try {
      const coach = await this.makeRequest<Coach>(
        `/coaching/${id}/`,
      );
      cacheService.set(`coach_${id}`, coach, 15 * 60 * 1000);
      return coach;
    } catch (error) {
      const cached = cacheService.getCoach(id);
      if (cached) {
        console.log(
          `Récupération du coach ${id} depuis le cache`,
        );
        return cached;
      }
      throw error;
    }
  }

  // Créer un nouveau coach
  async createCoach(coachData: Partial<Coach>): Promise<Coach> {
    return await this.makeRequest<Coach>("/coaching/", {
      method: "POST",
      body: JSON.stringify(coachData),
    });
  }

  // Mettre à jour un coach
  async updateCoach(
    id: string,
    coachData: Partial<Coach>,
  ): Promise<Coach> {
    return await this.makeRequest<Coach>(`/coaching/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(coachData),
    });
  }

  // ===== ASSIGNATIONS API =====

  // Récupérer les assignations
  async getAssignments(): Promise<CoachAssignment[]> {
    try {
      const assignments = await this.makeRequest<
        CoachAssignment[]
      >("/coaching/assignments/");
      cacheService.cacheAssignments(assignments);
      return assignments;
    } catch (error) {
      const cached = cacheService.getAssignments();
      if (cached) {
        console.log(
          "Récupération des assignations depuis le cache",
        );
        return cached;
      }
      // Si l'endpoint n'existe pas (404), retourner un tableau vide plutôt que de throw
      if ((error as NetworkError)?.status === 404) {
        console.log(
          "Endpoint /coaching/assignments/ non disponible",
        );
        return [];
      }
      if (isBenignCoachingReadFailure(error)) {
        console.warn("Assignations: API indisponible ou hors ligne, liste vide.");
        return [];
      }
      throw error;
    }
  }

  // Créer une nouvelle assignation
  async createAssignment(
    assignmentData: Partial<CoachAssignment>,
  ): Promise<CoachAssignment> {
    return await this.makeRequest<CoachAssignment>(
      "/coaching/assignments/",
      {
        method: "POST",
        body: JSON.stringify(assignmentData),
      },
    );
  }

  // Assigner un coach à plusieurs entrepreneurs en masse
  async bulkAssignCoach(data: {
    coach: string;
    entrepreneurs: string[];
    start_date?: string;
    objectives?: string | string[];
  }): Promise<{
    message: string;
    created: Array<{ assignment_id: string; entrepreneur_id: string; entrepreneur_name: string }>;
    skipped: Array<{ entrepreneur_id: string; entrepreneur_name: string; reason: string }>;
    errors: Array<{ entrepreneur_id: string; reason: string }>;
    summary: {
      total_requested: number;
      created: number;
      skipped: number;
      errors: number;
    };
  }> {
    return await this.makeRequest(
      "/coaching/assignments/bulk-assign/",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  }

  // Mettre à jour une assignation
  async updateAssignment(
    id: string,
    assignmentData: Partial<CoachAssignment>,
  ): Promise<CoachAssignment> {
    return await this.makeRequest<CoachAssignment>(
      `/coaching/assignments/${id}/`,
      {
        method: "PATCH",
        body: JSON.stringify(assignmentData),
      },
    );
  }

  // ===== SESSIONS API =====

  // Récupérer les sessions de coaching
  async getSessions(): Promise<CoachingSession[]> {
    try {
      const sessions = await this.makeRequest<
        CoachingSession[]
      >("/coaching/sessions/");
      cacheService.cacheSessions(sessions);
      return sessions;
    } catch (error) {
      const cached = cacheService.getSessions();
      if (cached) {
        console.log(
          "Récupération des sessions depuis le cache",
        );
        return cached;
      }
      // Si l'endpoint n'existe pas (404), retourner un tableau vide plutôt que de throw
      if ((error as NetworkError)?.status === 404) {
        console.log(
          "Endpoint /coaching/sessions/ non disponible",
        );
        return [];
      }
      if (isBenignCoachingReadFailure(error)) {
        console.warn("Sessions coaching: API indisponible ou hors ligne, liste vide.");
        return [];
      }
      throw error;
    }
  }

  // Créer une nouvelle session
  async createSession(
    sessionData: Partial<CoachingSession>,
  ): Promise<CoachingSession> {
    return await this.makeRequest<CoachingSession>(
      "/coaching/sessions/",
      {
        method: "POST",
        body: JSON.stringify(sessionData),
      },
    );
  }

  // Démarrer une session
  async startSession(
    sessionId: string,
  ): Promise<CoachingSession> {
    return await this.makeRequest<CoachingSession>(
      `/coaching/sessions/${sessionId}/start/`,
      {
        method: "POST",
      },
    );
  }

  // Terminer une session
  async completeSession(
    sessionId: string,
    sessionData: Partial<CoachingSession>,
  ): Promise<CoachingSession> {
    return await this.makeRequest<CoachingSession>(
      `/coaching/sessions/${sessionId}/complete/`,
      {
        method: "POST",
        body: JSON.stringify(sessionData),
      },
    );
  }

  // ===== RAPPORTS COACH API =====

  // Performance d'un coach
  async getCoachPerformance(coachId: string): Promise<any> {
    return await this.makeRequest<any>(
      `/coaching/${coachId}/performance/`,
    );
  }

  // Entrepreneurs d'un coach
  async getCoachEntrepreneurs(coachId: string): Promise<any[]> {
    return await this.makeRequest<any[]>(
      `/coaching/${coachId}/entrepreneurs/`,
    );
  }
}

// Instance singleton du service API
export const apiService = new ApiService();

// Utilitaires pour formater les données
export const formatRevenue = (revenue: string): string => {
  const amount = parseFloat(revenue);
  if (isNaN(amount)) return "0 FCFA";

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    minimumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
};

export const getActivityStatusColor = (
  status: string,
): string => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800";
    case "inactive":
      return "bg-gray-100 text-gray-800";
    case "suspended":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const getAssignmentStatusColor = (
  status: string,
): string => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800";
    case "completed":
      return "bg-blue-100 text-blue-800";
    case "paused":
      return "bg-yellow-100 text-yellow-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const getSessionStatusColor = (
  status: string,
): string => {
  switch (status) {
    case "scheduled":
      return "bg-blue-100 text-blue-800";
    case "in_progress":
      return "bg-yellow-100 text-yellow-800";
    case "completed":
      return "bg-green-100 text-green-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    case "no_show":
      return "bg-orange-100 text-orange-800";
    case "evaluation_completed":
      return "bg-purple-100 text-purple-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const getSectorIcon = (sector: string): string => {
  switch (sector) {
    case "commerce":
      return "🏪";
    case "agriculture":
      return "🌾";
    case "artisanat":
      return "🔨";
    case "service":
      return "🛎️";
    case "technologie":
      return "💻";
    default:
      return "💼";
  }
};

export const getSessionTypeIcon = (type: string): string => {
  switch (type) {
    case "individual":
      return "👤";
    case "group":
      return "👥";
    case "workshop":
      return "🛠️";
    case "assessment":
      return "📊";
    default:
      return "💼";
  }
};

export const formatSessionDuration = (
  minutes: number,
): string => {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h${remainingMinutes > 0 ? remainingMinutes.toString().padStart(2, "0") : ""}`;
  }
  return `${minutes}min`;
};

export const formatRating = (rating: number | null): string => {
  if (!rating) return "Non évalué";
  return `${rating.toFixed(1)}/5`;
};
