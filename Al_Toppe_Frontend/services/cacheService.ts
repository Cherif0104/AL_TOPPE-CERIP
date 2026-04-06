import AsyncStorage from '@react-native-async-storage/async-storage';

interface CachedData {
  data: any;
  timestamp: number;
  expiresIn?: number; // milliseconds
}

interface CacheStats {
  totalKeys: number;
  totalSize: number;
  oldestEntry: number | null;
  newestEntry: number | null;
}

class CacheService {
  private readonly CACHE_PREFIX = 'altoppe_cache_';
  private readonly CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 jours par défaut

  /**
   * Sauvegarder des données dans le cache
   */
  async set(key: string, data: any, expiresIn?: number): Promise<void> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}${key}`;
      const cachedData: CachedData = {
        data,
        timestamp: Date.now(),
        expiresIn: expiresIn || this.CACHE_EXPIRY,
      };
      
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cachedData));
      console.log(`💾 Cache sauvegardé: ${key}`);
    } catch (error) {
      console.error(`❌ Erreur sauvegarde cache ${key}:`, error);
    }
  }

  /**
   * Récupérer des données du cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}${key}`;
      const stored = await AsyncStorage.getItem(cacheKey);
      
      if (!stored) {
        return null;
      }

      const cachedData: CachedData = JSON.parse(stored);
      
      // Vérifier l'expiration
      const age = Date.now() - cachedData.timestamp;
      if (age > (cachedData.expiresIn || this.CACHE_EXPIRY)) {
        console.log(`⏰ Cache expiré: ${key}`);
        await this.remove(key);
        return null;
      }

      console.log(`📦 Cache récupéré: ${key} (âge: ${Math.round(age / 1000)}s)`);
      return cachedData.data as T;
    } catch (error) {
      console.error(`❌ Erreur récupération cache ${key}:`, error);
      return null;
    }
  }

  /**
   * Vérifier si une clé existe dans le cache
   */
  async has(key: string): Promise<boolean> {
    const data = await this.get(key);
    return data !== null;
  }

  /**
   * Supprimer une clé du cache
   */
  async remove(key: string): Promise<void> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}${key}`;
      await AsyncStorage.removeItem(cacheKey);
      console.log(`🗑️ Cache supprimé: ${key}`);
    } catch (error) {
      console.error(`❌ Erreur suppression cache ${key}:`, error);
    }
  }

  /**
   * Nettoyer le cache expiré
   */
  async cleanExpired(): Promise<number> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith(this.CACHE_PREFIX));
      let cleaned = 0;

      for (const key of cacheKeys) {
        try {
          const stored = await AsyncStorage.getItem(key);
          if (stored) {
            const cachedData: CachedData = JSON.parse(stored);
            const age = Date.now() - cachedData.timestamp;
            
            if (age > (cachedData.expiresIn || this.CACHE_EXPIRY)) {
              await AsyncStorage.removeItem(key);
              cleaned++;
            }
          }
        } catch (error) {
          // Si erreur de parsing, supprimer la clé
          await AsyncStorage.removeItem(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        console.log(`🧹 ${cleaned} entrées de cache expirées supprimées`);
      }
      
      return cleaned;
    } catch (error) {
      console.error('❌ Erreur nettoyage cache:', error);
      return 0;
    }
  }

  /**
   * Vider tout le cache
   */
  async clear(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      await AsyncStorage.multiRemove(cacheKeys);
      console.log(`🗑️ Cache vidé: ${cacheKeys.length} clés supprimées`);
    } catch (error) {
      console.error('❌ Erreur vidage cache:', error);
    }
  }

  /**
   * Obtenir les statistiques du cache
   */
  async getStats(): Promise<CacheStats> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      let totalSize = 0;
      let oldestTimestamp: number | null = null;
      let newestTimestamp: number | null = null;

      for (const key of cacheKeys) {
        try {
          const stored = await AsyncStorage.getItem(key);
          if (stored) {
            totalSize += stored.length;
            const cachedData: CachedData = JSON.parse(stored);
            
            if (oldestTimestamp === null || cachedData.timestamp < oldestTimestamp) {
              oldestTimestamp = cachedData.timestamp;
            }
            if (newestTimestamp === null || cachedData.timestamp > newestTimestamp) {
              newestTimestamp = cachedData.timestamp;
            }
          }
        } catch (error) {
          // Ignorer les erreurs de parsing
        }
      }

      return {
        totalKeys: cacheKeys.length,
        totalSize,
        oldestEntry: oldestTimestamp,
        newestEntry: newestTimestamp,
      };
    } catch (error) {
      console.error('❌ Erreur stats cache:', error);
      return {
        totalKeys: 0,
        totalSize: 0,
        oldestEntry: null,
        newestEntry: null,
      };
    }
  }

}

/**
 * Clés de cache prédéfinies
 */
export const CacheKeys = {
  DASHBOARD: 'dashboard',
  TRANSACTIONS: 'transactions',
  CATEGORIES: 'categories',
  ACTIVITIES: 'activities',
  USER_PROFILE: 'user_profile',
  BUSINESS_PLANS: 'business_plans',
  HEALTH_SCORE: 'health_score',
  COACHING_SESSIONS: 'coaching_sessions',
  COACHING_ASSIGNMENTS: 'coaching_assignments',
  COACH: 'coach',
  ALERTS: 'alerts',
  RECOMMENDATIONS: 'recommendations',
  FINANCIAL_ANALYSIS: 'financial_analysis',
  RECURRING_EXPENSES: 'recurring_expenses',
  INCOME_STATEMENT: 'income_statement',
  PRODUCTION_CYCLES: 'production_cycles',
  BAILleurs: 'bailleurs',
  REPORTS: 'reports',
  ANALYTICS: 'analytics',
};

export default new CacheService();
