import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '@/constants/config';
import SyncService from './syncService';

const API_BASE_URL = Config.API_BASE_URL; // Centralisé

interface ApiConfig {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  offline?: boolean; // Force offline mode
}

class ApiService {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await AsyncStorage.getItem('authToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    return headers;
  }

  private async request(endpoint: string, config: ApiConfig = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = await this.getAuthHeaders();

    // Si GET ou si offline désactivé explicitement, utiliser fetch normal
    const useSyncService = config.method && config.method !== 'GET' && config.offline !== false;

    if (useSyncService) {
      // Utiliser le service de sync pour offline
      return await SyncService.executeRequest(url, config.method || 'GET', config.body);
    }

    // Requête normale pour GET
    const requestConfig: RequestInit = {
      method: config.method || 'GET',
      headers: { ...headers, ...config.headers },
    };

    if (config.body) {
      requestConfig.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, requestConfig);
      
      // ✅ Gestion des erreurs 401 : Token expiré ou invalide
      if (response.status === 401) {
        console.warn('[ApiService] Token invalide ou expiré (401), déconnexion...');
        // Nettoyer les tokens et rediriger
        await this.handleUnauthorized();
        throw new Error(`HTTP 401: Unauthorized`);
      }
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      // Si c'est déjà une erreur 401, la propager
      if (error.message?.includes('401')) {
        throw error;
      }
      console.error('API Request failed:', error);
      throw error;
    }
  }

  private async handleUnauthorized() {
    // Nettoyer les tokens
    await AsyncStorage.multiRemove([
      'authToken',
      'refreshToken',
      'userInfo',
      'entrepreneur_id'
    ]);
    
    // Émettre un événement pour que les composants réagissent
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
  }

  // Auth endpoints
  async login(phone: string, password: string) {
    return this.request('/auth/login/', {
      method: 'POST',
      body: { phone, password }
    });
  }

  async register(userData: any) {
    return this.request('/entrepreneurs/', {
      method: 'POST',
      body: userData
    });
  }

  async logout() {
    const refresh = await AsyncStorage.getItem('refreshToken');
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('refreshToken');
    return ;
  }

  // Password reset
  async requestPasswordReset(phone: string) {
    return this.request('/auth/password/reset/request/', {
      method: 'POST',
      body: { phone },
      offline: false,
    });
  }

  async confirmPasswordReset(phone: string, otpCode: string, newPassword: string, newPasswordConfirm: string) {
    return this.request('/auth/password/reset/confirm/', {
      method: 'POST',
      body: { 
        phone, 
        otp_code: otpCode, 
        new_password: newPassword,
        new_password_confirm: newPasswordConfirm
      },
      offline: false,
    });
  }

  async changePassword(oldPassword: string, newPassword: string, newPasswordConfirm: string) {
    return this.request('/auth/password/change/', {
      method: 'POST',
      body: {
        old_password: oldPassword,
        new_password: newPassword,
        new_password_confirm: newPasswordConfirm
      },
      offline: false,
    });
  }

  // User profile
  async getUserProfile() {
    return this.request('/users/profile/');
  }

  async updateUserProfile(userData: any) {
    return this.request('/users/profile/', {
      method: 'PUT',
      body: userData
    });
  }

  // 

  // Transactionshttp://localhost:8000/api/finances/entrepreneurs/3fa85f64-5717-4562-b3fc-2c963f66afa6/cashflow
  async getTransactions(id: string, params?: any) {
    const queryString = params ? new URLSearchParams(params).toString() : '';
    return this.request(`/finances/entrepreneurs/${id}/cashflow/${queryString ? `?${queryString}` : ''}`);
  }

  // Activities by entrepreneur
  async getActivities(entrepreneurId: string, params?: any) {
    const queryString = params ? new URLSearchParams(params).toString() : '';
    return this.request(`/entrepreneurs/${entrepreneurId}/activities/${queryString ? `?${queryString}` : ''}`);
  }

  async getTransactionss(params?: any) {
    const queryString = params ? new URLSearchParams(params).toString() : '';
    return this.request(`/transactions/${queryString ? `?${queryString}` : ''}`);
  }

  async createTransaction(id: string,  transactionData: any) {
    return this.request(`/finances/entrepreneurs/${id}/cashflow/`, {
      method: 'POST',
      body: transactionData
    });
  }

  async updateTransaction(id: number, transactionData: any) {
    return this.request(`/transactions/${id}/`, {
      method: 'PUT',
      body: transactionData
    });
  }

  async deleteTransaction(id: number) {
    return this.request(`/transactions/${id}/`, {
      method: 'DELETE'
    });
  }

  // Dashboard data
  async getDashboardData() {
    return this.request('/dashboard/');
  }

  // Alerts
  async getAlerts() {
    return this.request('/alerts/');
  }

  async markAlertAsRead(alertId: number) {
    return this.request(`/alerts/${alertId}/read/`, {
      method: 'POST'
    });
  }

  // Business plans
  async getBusinessPlans() {
    return this.request('/business-plans/');
  }

  async createBusinessPlan(planData: any) {
    return this.request('/business-plans/', {
      method: 'POST',
      body: planData
    });
  }

  // Categories
  async getCategories() {
    return this.request('/categories/');
  }

  // Reports
  async generateReport(reportType: string, params?: any) {
    const queryString = params ? new URLSearchParams(params).toString() : '';
    return this.request(`/reports/${reportType}/${queryString ? `?${queryString}` : ''}`);
  }
}

export default new ApiService();