/**
 * OPTIMISATIONS PERFORMANCES - APPLICATION MOBILE
 * ===============================================
 * 
 * Ce fichier contient les optimisations de performance pour l'application mobile :
 * - Cache local optimisé
 * - Requêtes API optimisées
 * - Gestion de la mémoire
 * - Mode offline
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Cache } from 'react-native-cache';

// Configuration du cache local
const CACHE_CONFIG = {
  maxSize: 50 * 1024 * 1024, // 50MB
  defaultTTL: 300, // 5 minutes
};

// Instance du cache
const localCache = new Cache({
  namespace: 'altoppe_cache',
  policy: {
    maxEntries: 1000,
    stdTTL: CACHE_CONFIG.defaultTTL,
  },
});

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private requestCache = new Map<string, Promise<any>>();
  private offlineQueue: Array<{key: string, data: any}> = [];

  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  /**
   * Cache une requête API avec gestion de la déduplication
   */
  async cacheRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
    ttl: number = CACHE_CONFIG.defaultTTL
  ): Promise<T> {
    // Vérifier le cache local d'abord
    const cachedData = await this.getFromCache<T>(key);
    if (cachedData) {
      return cachedData;
    }

    // Éviter les requêtes dupliquées
    if (this.requestCache.has(key)) {
      return this.requestCache.get(key);
    }

    // Exécuter la requête
    const requestPromise = requestFn().then(async (data) => {
      // Mettre en cache le résultat
      await this.setCache(key, data, ttl);
      this.requestCache.delete(key);
      return data;
    }).catch((error) => {
      this.requestCache.delete(key);
      throw error;
    });

    this.requestCache.set(key, requestPromise);
    return requestPromise;
  }

  /**
   * Récupérer des données du cache local
   */
  async getFromCache<T>(key: string): Promise<T | null> {
    try {
      const cached = await localCache.get(key);
      if (cached) {
        const entry: CacheEntry<T> = JSON.parse(cached);
        
        // Vérifier si l'entrée a expiré
        if (Date.now() - entry.timestamp > entry.ttl * 1000) {
          await localCache.del(key);
          return null;
        }
        
        return entry.data;
      }
    } catch (error) {
      console.error('Erreur récupération cache:', error);
    }
    return null;
  }

  /**
   * Mettre des données en cache local
   */
  async setCache<T>(key: string, data: T, ttl: number = CACHE_CONFIG.defaultTTL): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
      };
      
      await localCache.set(key, JSON.stringify(entry));
    } catch (error) {
      console.error('Erreur mise en cache:', error);
    }
  }

  /**
   * Invalider le cache pour une clé spécifique
   */
  async invalidateCache(key: string): Promise<void> {
    try {
      await localCache.del(key);
    } catch (error) {
      console.error('Erreur invalidation cache:', error);
    }
  }

  /**
   * Nettoyer le cache expiré
   */
  async cleanExpiredCache(): Promise<void> {
    try {
      const keys = await localCache.keys();
      const now = Date.now();
      
      for (const key of keys) {
        try {
          const cached = await localCache.get(key);
          if (cached) {
            const entry: CacheEntry<any> = JSON.parse(cached);
            if (now - entry.timestamp > entry.ttl * 1000) {
              await localCache.del(key);
            }
          }
        } catch (error) {
          // Supprimer les entrées corrompues
          await localCache.del(key);
        }
      }
    } catch (error) {
      console.error('Erreur nettoyage cache:', error);
    }
  }

  /**
   * Mettre en queue les requêtes pour le mode offline
   */
  async queueOfflineRequest(key: string, data: any): Promise<void> {
    this.offlineQueue.push({ key, data });
    await AsyncStorage.setItem('offline_queue', JSON.stringify(this.offlineQueue));
  }

  /**
   * Traiter la queue offline quand la connexion revient
   */
  async processOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) {
      const stored = await AsyncStorage.getItem('offline_queue');
      if (stored) {
        this.offlineQueue = JSON.parse(stored);
      }
    }

    while (this.offlineQueue.length > 0) {
      const { key, data } = this.offlineQueue.shift()!;
      try {
        await this.setCache(key, data);
      } catch (error) {
        console.error('Erreur traitement queue offline:', error);
      }
    }

    await AsyncStorage.removeItem('offline_queue');
  }

  /**
   * Optimiser les images avec lazy loading
   */
  static optimizeImageLoad(imageUrl: string): string {
    // Ajouter des paramètres d'optimisation si nécessaire
    return imageUrl;
  }

  /**
   * Debounce pour éviter les appels API multiples
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  /**
   * Throttle pour limiter la fréquence des appels
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
}

// Hook React pour utiliser les optimisations
export const usePerformanceOptimizer = () => {
  const optimizer = PerformanceOptimizer.getInstance();
  
  return {
    cacheRequest: optimizer.cacheRequest.bind(optimizer),
    getFromCache: optimizer.getFromCache.bind(optimizer),
    setCache: optimizer.setCache.bind(optimizer),
    invalidateCache: optimizer.invalidateCache.bind(optimizer),
    cleanExpiredCache: optimizer.cleanExpiredCache.bind(optimizer),
    queueOfflineRequest: optimizer.queueOfflineRequest.bind(optimizer),
    processOfflineQueue: optimizer.processOfflineQueue.bind(optimizer),
  };
};

// Service API optimisé
export class OptimizedApiService {
  private static instance: OptimizedApiService;
  private optimizer: PerformanceOptimizer;

  private constructor() {
    this.optimizer = PerformanceOptimizer.getInstance();
  }

  static getInstance(): OptimizedApiService {
    if (!OptimizedApiService.instance) {
      OptimizedApiService.instance = new OptimizedApiService();
    }
    return OptimizedApiService.instance;
  }

  /**
   * Requête API optimisée avec cache
   */
  async optimizedRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    cacheKey?: string,
    ttl?: number
  ): Promise<T> {
    const key = cacheKey || `api_${endpoint}_${JSON.stringify(options)}`;
    
    return this.optimizer.cacheRequest(
      key,
      async () => {
        const response = await fetch(endpoint, options);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response.json();
      },
      ttl
    );
  }

  /**
   * Requête avec retry automatique
   */
  async requestWithRetry<T>(
    endpoint: string,
    options: RequestInit = {},
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(endpoint, options);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response.json();
      } catch (error) {
        lastError = error as Error;
        
        if (i < maxRetries - 1) {
          // Attendre avant de réessayer
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        }
      }
    }
    
    throw lastError!;
  }
}

// Configuration des performances
export const PerformanceConfig = {
  // Cache
  CACHE_TTL: {
    DASHBOARD: 300, // 5 minutes
    TRANSACTIONS: 120, // 2 minutes
    USER_PROFILE: 600, // 10 minutes
    CATEGORIES: 1800, // 30 minutes
  },
  
  // Requêtes
  REQUEST_TIMEOUT: 10000, // 10 secondes
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  
  // UI
  DEBOUNCE_DELAY: 300,
  THROTTLE_LIMIT: 1000,
  
  // Images
  IMAGE_QUALITY: 0.8,
  IMAGE_MAX_WIDTH: 800,
  IMAGE_MAX_HEIGHT: 600,
};

export default PerformanceOptimizer;