import { API_BASE_URL } from "@/config";

const getAuthHeaders = (contentType: string | null = 'application/json') => {
  const headers: Record<string, string> = {};
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('altoppe_access_token') : null;
    if (contentType) headers['Content-Type'] = contentType;
    if (token) headers['Authorization'] = `Bearer ${token}`;
    else console.warn('coachService: aucun token trouvé dans localStorage (altoppe_access_token)');
  } catch (e) {
    console.warn('coachService: erreur en lisant le token du localStorage', e);
  }
  return headers;
};

export const coachService = {
  // Liste des entrepreneurs pour un coach
  async getCoachEntrepreneurs(coachId) {
    const res = await fetch(`${API_BASE_URL}/coaching/${coachId}/entrepreneurs/`, {
      headers: getAuthHeaders(null),
    });
    if (!res.ok) throw new Error('Erreur récupération entrepreneurs coach');
    return await res.json();
  },

  // Ajouter un entrepreneur
  async createEntrepreneur(data) {
    // Log des données avant l'envoi
    console.log('Données envoyées à l\'API:', {
      ...data,
      phone: data.phone,
      whatsapp: data.whatsapp
    });

    // Conserver le format exact des numéros (avec les espaces)
    const formattedData = {
      ...data,
      phone: data.phone,
      whatsapp: data.whatsapp
    };

    console.log('Données formatées:', formattedData);

    const res = await fetch(`${API_BASE_URL}/entrepreneurs/`, {
      method: 'POST',
      headers: getAuthHeaders('application/json'),
      body: JSON.stringify(formattedData),
    });
    
    if (!res.ok) {
      let errorData = null;
      try {
        const text = await res.text();
        if (text) {
          try {
            errorData = JSON.parse(text);
          } catch (e) {
            // Si ce n'est pas du JSON, utiliser le texte comme message
            errorData = { detail: text };
          }
        }
      } catch (e) {
        console.error('Erreur lors de la lecture de la réponse:', e);
      }
      
      console.error('Erreur création entrepreneur - Status:', res.status);
      console.error('Erreur création entrepreneur - Données:', errorData);
      
      // Créer une erreur avec les données complètes pour permettre l'extraction des erreurs de validation
      const errorMessage = errorData?.non_field_errors?.[0] ||
                         (Array.isArray(errorData?.phone) ? errorData.phone[0] : errorData?.phone) ||
                         errorData?.detail || 
                         errorData?.message || 
                         'Erreur lors de la création de l\'entrepreneur';
      
      const error = new Error(errorMessage) as Error & { status?: number; body?: unknown };
      error.status = res.status;
      error.body = errorData; // Inclure toutes les données d'erreur pour l'extraction des erreurs de validation
      
      // Si errorData est null, essayer d'inclure au moins le status
      if (!error.body) {
        error.body = { detail: errorMessage };
      }
      
      throw error;
    }
    
    const responseData = await res.json();
    console.log('Réponse de l\'API:', responseData);
    return responseData;
  },

  // Assigner un entrepreneur à un coach
  async assignEntrepreneurToCoach(data) {
    const res = await fetch(`${API_BASE_URL}/coaching/assignments/`, {
      method: 'POST',
      headers: getAuthHeaders('application/json'),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      console.error('Erreur assignation:', errorData);
      
      // Extraire le message d'erreur
      let errorMessage = 'Erreur lors de l\'assignation de l\'entrepreneur au coach';
      
      if (errorData) {
        if (errorData.non_field_errors && Array.isArray(errorData.non_field_errors)) {
          errorMessage = errorData.non_field_errors[0];
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.entrepreneur) {
          errorMessage = Array.isArray(errorData.entrepreneur) 
            ? errorData.entrepreneur[0] 
            : String(errorData.entrepreneur);
        } else if (errorData.coach) {
          errorMessage = Array.isArray(errorData.coach) 
            ? errorData.coach[0] 
            : String(errorData.coach);
        }
      }
      
      const error = new Error(errorMessage) as Error & { status?: number; body?: unknown };
      error.status = res.status;
      error.body = errorData;
      throw error;
    }
    return await res.json();
  },

  // Liste des sessions (optionnellement filtrée par coach, entrepreneur ou dates)
  async getSessions(coachId?: string, entrepreneurId?: string, dateFrom?: string, dateTo?: string) {
    let url = `${API_BASE_URL}/coaching/sessions/`;
    const params = new URLSearchParams();
    if (coachId) {
      params.append('coach_id', String(coachId));
    }
    if (entrepreneurId) {
      params.append('entrepreneur_id', String(entrepreneurId));
    }
    if (dateFrom) {
      params.append('date_from', dateFrom);
    }
    if (dateTo) {
      params.append('date_to', dateTo);
    }
    if (params.toString()) {
      url = `${url}?${params.toString()}`;
    }

    const res = await fetch(url, {
      headers: getAuthHeaders(null),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => null);
      const err = new Error('Erreur récupération sessions') as Error & { status?: number; body?: unknown };
      err.status = res.status;
      err.body = errText;
      throw err;
    }

    // L'API peut renvoyer un tableau ou un objet paginé { results: [...] }
    const data = await res.json().catch(() => null);
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.results)) return data.results;
    return [];
  },

  // Liste des assignations (optionnellement filtrée par coach)
  async getAssignments(coachId?: string) {
    let url = `${API_BASE_URL}/coaching/assignments/`;
    if (coachId) {
      const params = new URLSearchParams({ coach: String(coachId) });
      url = `${url}?${params.toString()}`;
    }

    const res = await fetch(url, {
      headers: getAuthHeaders(null),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => null);
      const err = new Error('Erreur récupération assignations') as Error & { status?: number; body?: unknown };
      err.status = res.status;
      err.body = errText;
      throw err;
    }

    const data = await res.json().catch(() => null);
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.results)) return data.results;
    return [];
  },

  // Ajouter une session
  async addSession(data) {
    // Log du payload envoyé pour debug
    console.log('Envoi POST /coaching/sessions/ payload:', data);

    const res = await fetch(`${API_BASE_URL}/coaching/sessions/`, {
      method: 'POST',
      headers: getAuthHeaders('application/json'),
      body: JSON.stringify(data),
    });

    // Lire le corps (texte) pour pouvoir l'afficher même si ce n'est pas du JSON
    const raw = await res.text().catch(() => null);
    let parsed: unknown = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch (e) {
      parsed = raw;
    }

    if (!res.ok) {
      console.error('Erreur création session:', res.status, parsed);
      const parsedObj = parsed as { detail?: string; message?: string } | null;
      const message = (parsedObj && (parsedObj.detail || parsedObj.message)) || (typeof parsed === 'string' ? parsed : `HTTP ${res.status}`);
      const err = new Error(message) as Error & { status?: number; body?: unknown };
      err.status = res.status;
      err.body = parsed;
      throw err;
    }

    // Retourner JSON si possible, sinon le texte brut
    return parsed ?? null;
  },

  // Modifier une session
  async updateSession(id, data) {
    const res = await fetch(`${API_BASE_URL}/coaching/sessions/${id}/`, {
      method: 'PATCH',
      headers: getAuthHeaders('application/json'),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Erreur modification session');
    return await res.json();
  },

  // Supprimer une session
  async deleteSession(id) {
    const res = await fetch(`${API_BASE_URL}/coaching/sessions/${id}/`, {
      method: 'DELETE',
      headers: getAuthHeaders(null),
    });
    if (!res.ok) throw new Error('Erreur suppression session');
    return true;
  },

  // Rapports coach (coachId optional)
  async getReports(coachId?: string) {
    let url = `${API_BASE_URL}/coaching/performance/`;
    if (coachId) url = `${API_BASE_URL}/coaching/${coachId}/performance/`;

    const res = await fetch(url, {
      headers: getAuthHeaders(null),
    });

    const raw = await res.text().catch(() => null);
    let parsed: unknown = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch (e) {
      parsed = raw;
    }

    if (!res.ok) {
      const err = new Error('Erreur récupération rapport coach') as Error & { status?: number; body?: unknown };
      err.status = res.status;
      err.body = parsed;
      throw err;
    }

    return parsed;
  },

  // Récupérer un entrepreneur spécifique
  async getEntrepreneur(id: string) {
    const res = await fetch(`${API_BASE_URL}/entrepreneurs/${id}/`, {
      headers: getAuthHeaders(null),
    });
    if (!res.ok) throw new Error('Erreur récupération détails entrepreneur');
    return await res.json();
  },

  // Mettre à jour un entrepreneur
  async updateEntrepreneur(id: string, data: Record<string, unknown>) {
    const res = await fetch(`${API_BASE_URL}/entrepreneurs/${id}/`, {
      method: 'PATCH',
      headers: getAuthHeaders('application/json'),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      console.error('Erreur modification entrepreneur:', errorData);
      
      // Créer une erreur avec les données complètes pour permettre l'extraction des erreurs de validation
      const error = new Error(
        errorData?.non_field_errors?.[0] ||
        errorData?.detail || 
        errorData?.message || 
        'Erreur lors de la modification de l\'entrepreneur'
      ) as Error & { status?: number; body?: unknown };
      
      error.status = res.status;
      error.body = errorData; // Inclure toutes les données d'erreur pour l'extraction des erreurs de validation
      throw error;
    }
    return await res.json();
  },
};
