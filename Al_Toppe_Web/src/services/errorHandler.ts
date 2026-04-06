import { toast } from 'sonner';

export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: any;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export class NetworkError extends Error {
  status: number;
  code?: string;
  details?: any;

  constructor(message: string, status: number, code?: string, details?: any) {
    super(message);
    this.name = 'NetworkError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class ErrorHandler {
  private static defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2
  };

  // Gestion centralisée des erreurs API
  static handleApiError(error: any, context?: string): ApiError {
    console.error(`Erreur API ${context ? `(${context})` : ''}:`, error);

    let apiError: ApiError;

    if (error instanceof NetworkError) {
      apiError = {
        message: error.message,
        status: error.status,
        code: error.code,
        details: error.details
      };
    } else if (error.response) {
      // Erreur de réponse HTTP
      const status = error.response.status;
      const data = error.response.data;
      
      apiError = {
        message: this.getErrorMessage(status, data),
        status,
        code: data?.code,
        details: data
      };
    } else if (error.request) {
      // Erreur réseau
      apiError = {
        message: 'Erreur de connexion. Vérifiez votre connexion internet.',
        status: 0,
        code: 'NETWORK_ERROR'
      };
    } else {
      // Autre erreur
      apiError = {
        message: error.message || 'Une erreur inattendue s\'est produite',
        status: 500,
        code: 'UNKNOWN_ERROR'
      };
    }

    // Afficher le toast d'erreur approprié
    this.showErrorToast(apiError, context);

    return apiError;
  }

  // Messages d'erreur personnalisés selon le statut HTTP
  private static getErrorMessage(status: number, data?: any): string {
    if (data?.message) return data.message;
    if (data?.detail) return data.detail;
    if (data?.error) return data.error;

    switch (status) {
      case 400:
        return 'Données invalides. Veuillez vérifier votre saisie.';
      case 401:
        return 'Session expirée. Veuillez vous reconnecter.';
      case 403:
        return 'Accès non autorisé à cette ressource.';
      case 404:
        return 'Ressource non trouvée.';
      case 409:
        return 'Conflit de données. Cette ressource existe déjà.';
      case 422:
        return 'Données de validation incorrectes.';
      case 429:
        return 'Trop de requêtes. Veuillez patienter avant de réessayer.';
      case 500:
        return 'Erreur interne du serveur. Veuillez réessayer plus tard.';
      case 502:
        return 'Service temporairement indisponible.';
      case 503:
        return 'Service en maintenance. Veuillez réessayer plus tard.';
      default:
        return `Erreur ${status}: Une erreur s'est produite.`;
    }
  }

  // Afficher le toast d'erreur approprié
  private static showErrorToast(error: ApiError, context?: string) {
    const title = context ? `Erreur ${context}` : 'Erreur';
    
    // Ne pas afficher de toast pour certaines erreurs silencieuses
    if (error.code === 'SILENT_ERROR') return;
    
    // Ne pas afficher de toast pour les 404 sur les endpoints de développement
    if (error.status === 404 && context && (
      context.includes('/coaches/sessions') || 
      context.includes('/coaches/assignments') ||
      context.includes('/entrepreneurs')
    )) {
      return;
    }

    if (error.status === 0) {
      toast.error(title, {
        description: error.message,
        action: {
          label: 'Mode hors-ligne',
          onClick: () => this.enableOfflineMode()
        }
      });
    } else if (error.status === 401) {
      toast.error('Session expirée', {
        description: 'Vous allez être redirigé vers la page de connexion.',
        action: {
          label: 'Se reconnecter',
          onClick: () => window.location.reload()
        }
      });
    } else if (error.status >= 500) {
      toast.error(title, {
        description: error.message,
        action: {
          label: 'Réessayer',
          onClick: () => window.location.reload()
        }
      });
    } else if (error.status !== 404) { // Ne pas afficher les 404 génériques
      toast.error(title, {
        description: error.message
      });
    }
  }

  // Retry avec backoff exponentiel
  static async withRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    context?: string
  ): Promise<T> {
    const finalConfig = { ...this.defaultRetryConfig, ...config };
    let lastError: any;

    for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === finalConfig.maxRetries) {
          throw error;
        }

        // Ne pas retry sur certaines erreurs
        if (error.status && [400, 401, 403, 404, 422].includes(error.status)) {
          throw error;
        }

        const delay = Math.min(
          finalConfig.baseDelay * Math.pow(finalConfig.backoffFactor, attempt),
          finalConfig.maxDelay
        );

        console.warn(`Tentative ${attempt + 1}/${finalConfig.maxRetries + 1} échouée ${context ? `(${context})` : ''}. Nouvelle tentative dans ${delay}ms...`);
        
        await this.delay(delay);
      }
    }

    throw lastError;
  }

  // Utilitaire pour créer un délai
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Activer le mode hors-ligne
  static enableOfflineMode() {
    // Stocker l'état hors-ligne
    localStorage.setItem('altoppe_offline_mode', 'true');
    
    // Émettre un événement personnalisé
    window.dispatchEvent(new CustomEvent('offline-mode-enabled'));
    
    toast.success('Mode hors-ligne activé', {
      description: 'Vous pouvez continuer à utiliser l\'application avec les données en cache.'
    });
  }

  // Vérifier si on est en mode hors-ligne
  static isOfflineMode(): boolean {
    return localStorage.getItem('altoppe_offline_mode') === 'true' || !navigator.onLine;
  }

  // Désactiver le mode hors-ligne
  static disableOfflineMode() {
    localStorage.removeItem('altoppe_offline_mode');
    window.dispatchEvent(new CustomEvent('offline-mode-disabled'));
    toast.success('Mode en ligne restauré');
  }

  // Vérifier la connectivité
  static async checkConnectivity(): Promise<boolean> {
    try {
      // Ping simple vers l'API
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Gérer les erreurs de validation de formulaire
  static handleValidationErrors(errors: Record<string, string[]>): void {
    Object.entries(errors).forEach(([field, messages]) => {
      messages.forEach(message => {
        toast.error(`Erreur ${field}`, {
          description: message
        });
      });
    });
  }

  // Logger les erreurs pour le debugging
  static logError(error: any, context?: string, additionalData?: any) {
    const logData = {
      timestamp: new Date().toISOString(),
      context,
      error: {
        message: error.message,
        stack: error.stack,
        status: error.status,
        code: error.code
      },
      additionalData,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    console.error('AL-TOPPE Error Log:', logData);

    // En production, on pourrait envoyer cela à un service de logging
    // comme Sentry, LogRocket, etc.
  }
}