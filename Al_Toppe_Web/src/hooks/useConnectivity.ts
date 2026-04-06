import { useState, useEffect } from 'react';
import { ErrorHandler } from '../services/errorHandler';
import { syncService } from '../services/syncService';

export interface ConnectivityState {
  isOnline: boolean;
  isOfflineMode: boolean;
  pendingSyncCount: number;
  isSyncing: boolean;
  lastSync: Date | null;
}

export function useConnectivity() {
  const [state, setState] = useState<ConnectivityState>({
    isOnline: navigator.onLine,
    isOfflineMode: ErrorHandler.isOfflineMode(),
    pendingSyncCount: syncService.getPendingCount(),
    isSyncing: syncService.isSyncInProgress(),
    lastSync: null
  });

  useEffect(() => {
    const updateState = () => {
      setState(prev => ({
        ...prev,
        isOnline: navigator.onLine,
        isOfflineMode: ErrorHandler.isOfflineMode(),
        pendingSyncCount: syncService.getPendingCount(),
        isSyncing: syncService.isSyncInProgress()
      }));
    };

    // Écouter les changements de connectivité
    const handleOnline = () => {
      updateState();
    };

    const handleOffline = () => {
      updateState();
    };

    const handleOfflineModeEnabled = () => {
      updateState();
    };

    const handleOfflineModeDisabled = () => {
      updateState();
    };

    // Ajouter les listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-mode-enabled', handleOfflineModeEnabled);
    window.addEventListener('offline-mode-disabled', handleOfflineModeDisabled);

    // Mettre à jour l'état périodiquement
    const interval = setInterval(updateState, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-mode-enabled', handleOfflineModeEnabled);
      window.removeEventListener('offline-mode-disabled', handleOfflineModeDisabled);
      clearInterval(interval);
    };
  }, []);

  const toggleOfflineMode = () => {
    if (state.isOfflineMode) {
      ErrorHandler.disableOfflineMode();
    } else {
      // Activer le mode hors-ligne manuellement
      localStorage.setItem('altoppe_offline_mode', 'true');
      window.dispatchEvent(new CustomEvent('offline-mode-enabled'));
    }
  };

  const forceSync = async () => {
    try {
      await syncService.forcSync();
      setState(prev => ({ 
        ...prev, 
        lastSync: new Date(),
        pendingSyncCount: syncService.getPendingCount()
      }));
    } catch (error) {
      throw error;
    }
  };

  const checkConnectivity = async () => {
    return await ErrorHandler.checkConnectivity();
  };

  return {
    ...state,
    toggleOfflineMode,
    forceSync,
    checkConnectivity
  };
}