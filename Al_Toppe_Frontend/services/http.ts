import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '@/constants/config';

const API_BASE_URL = Config.API_BASE_URL;

export interface ApiConfig {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  formData?: FormData;
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await AsyncStorage.getItem('authToken');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function request(endpoint: string, config: ApiConfig = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = await getAuthHeaders();

  const requestConfig: RequestInit = {
    method: config.method || 'GET',
    headers: { ...headers, ...config.headers },
  };

  if (config.formData) {
    requestConfig.body = config.formData as any;
    if (requestConfig.headers && 'Content-Type' in requestConfig.headers) {
      delete (requestConfig.headers as any)['Content-Type'];
    }
  } else if (config.body !== undefined) {
    requestConfig.body = JSON.stringify(config.body);
  }

  const response = await fetch(url, requestConfig);
  
  // ✅ Gestion des erreurs 401 : Token expiré ou invalide
  if (response.status === 401) {
    console.warn('[HTTP] Token invalide ou expiré (401), nettoyage...');
    // Nettoyer les tokens
    await AsyncStorage.multiRemove([
      'authToken',
      'refreshToken',
      'userInfo',
      'entrepreneur_id'
    ]).catch(() => {});
    
    // Émettre un événement pour que les composants réagissent
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
  }
  
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      const text = await response.text().catch(() => '');
      errorData = { message: text || response.statusText };
    }
    
    const error = new Error(`HTTP ${response.status}: ${errorData.message || response.statusText}`);
    (error as any).status = response.status;
    (error as any).data = errorData;
    throw error;
  }
  return response.json();
}

export const buildQuery = (params?: Record<string, any>) => {
  const queryString = params ? new URLSearchParams(params).toString() : '';
  return queryString ? `?${queryString}` : '';
};


