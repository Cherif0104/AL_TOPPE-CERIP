import { useState, useEffect, useCallback, useRef } from 'react';
import { useOfflineSync } from './useOfflineSync';
import cacheService, { CacheKeys } from '@/services/cacheService';

interface UseOfflineDataOptions<T> {
  cacheKey: string;
  fetchFunction: () => Promise<T>;
  cacheExpiry?: number; // milliseconds, default 24h
  enabled?: boolean; // Si false, ne charge pas automatiquement
  onError?: (error: any) => void;
  onSuccess?: (data: T) => void;
}

interface UseOfflineDataResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isFromCache: boolean;
}

/**
 * Hook réutilisable pour gérer les données avec cache offline
 * 
 * @example
 * const { data, loading, error, refetch, isFromCache } = useOfflineData({
 *   cacheKey: `${CacheKeys.TRANSACTIONS}_${entrepreneurId}`,
 *   fetchFunction: () => FinanceService.listTransactions(entrepreneurId),
 *   cacheExpiry: 24 * 60 * 60 * 1000, // 24h
 * });
 */
export function useOfflineData<T = any>({
  cacheKey,
  fetchFunction,
  cacheExpiry = 24 * 60 * 60 * 1000, // 24h par défaut
  enabled = true,
  onError,
  onSuccess,
}: UseOfflineDataOptions<T>): UseOfflineDataResult<T> {
  const { isOnline } = useOfflineSync();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadData = useCallback(async (forceRefresh = false) => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setIsFromCache(false);

      // 1. Si offline ou forceRefresh=false, essayer le cache d'abord
      if (!forceRefresh) {
        const cachedData = await cacheService.get<T>(cacheKey);
        
        if (cachedData) {
          // Si offline, utiliser directement le cache
          if (!isOnline) {
            console.log(`📦 [useOfflineData] Utilisation du cache (offline): ${cacheKey}`);
            if (isMountedRef.current) {
              setData(cachedData);
              setIsFromCache(true);
              setLoading(false);
              onSuccess?.(cachedData);
              return;
            }
          } else {
            // Si online, utiliser le cache temporairement pendant le chargement
            console.log(`📦 [useOfflineData] Cache disponible, affichage temporaire: ${cacheKey}`);
            if (isMountedRef.current) {
              setData(cachedData);
              setIsFromCache(true);
            }
          }
        }
      }

      // 2. Si online, récupérer les données fraîches
      if (isOnline) {
        try {
          const freshData = await fetchFunction();
          
          if (isMountedRef.current) {
            setData(freshData);
            setIsFromCache(false);
            
            // Sauvegarder dans le cache
            await cacheService.set(cacheKey, freshData, cacheExpiry);
            console.log(`💾 [useOfflineData] Données mises en cache: ${cacheKey}`);
            
            onSuccess?.(freshData);
          }
        } catch (fetchError: any) {
          // Si erreur réseau et cache disponible, utiliser le cache
          const cachedData = await cacheService.get<T>(cacheKey);
          if (cachedData) {
            console.log(`⚠️ [useOfflineData] Erreur réseau, utilisation du cache: ${cacheKey}`);
            if (isMountedRef.current) {
              setData(cachedData);
              setIsFromCache(true);
              onSuccess?.(cachedData);
            }
          } else {
            // Pas de cache et erreur réseau
            throw fetchError;
          }
        }
      } else {
        // Offline et pas de cache - ne rien faire si on a déjà des données
        // Ne pas logger si on a déjà des données en cache
      }
    } catch (err: any) {
      console.error(`❌ [useOfflineData] Erreur: ${cacheKey}`, err);
      
      // Ne pas traiter les erreurs 401 comme des erreurs de cache
      if (err.message?.includes('401') || err.status === 401 || err.message?.includes('Unauthorized')) {
        if (isMountedRef.current) {
          setError(err);
          onError?.(err);
        }
        return;
      }

      // Pour les erreurs réseau, essayer le cache en dernier recours
      if (err.message?.includes('Network') || err.message?.includes('fetch')) {
        const cachedData = await cacheService.get<T>(cacheKey);
        if (cachedData && isMountedRef.current) {
          console.log(`📦 [useOfflineData] Utilisation du cache après erreur réseau: ${cacheKey}`);
          setData(cachedData);
          setIsFromCache(true);
          onSuccess?.(cachedData);
        } else {
          if (isMountedRef.current) {
            setError(err);
            onError?.(err);
          }
        }
      } else {
        if (isMountedRef.current) {
          setError(err);
          onError?.(err);
        }
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [cacheKey, fetchFunction, cacheExpiry, isOnline, enabled, onError, onSuccess]);

  // Charger les données au montage et quand isOnline change
  useEffect(() => {
    if (enabled && cacheKey) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, isOnline, cacheKey]); // Recharger quand la connexion ou la clé change

  // Utiliser une ref pour éviter que refetch change à chaque render
  const loadDataRef = useRef(loadData);
  loadDataRef.current = loadData;

  const refetch = useCallback(() => {
    return loadDataRef.current(true); // Force refresh
  }, []); // Pas de dépendances pour garder refetch stable

  return {
    data,
    loading,
    error,
    refetch,
    isFromCache,
  };
}
