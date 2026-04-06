import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '@/services/api';

interface OfflineAction {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  endpoint: string;
  data: any;
  timestamp: number;
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Monitor network status
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
      
      // If we just came back online, sync pending actions
      if (state.isConnected && pendingActions.length > 0) {
        syncPendingActions();
      }
    });

    // Load pending actions from storage
    loadPendingActions();

    return unsubscribe;
  }, []);

  const loadPendingActions = async () => {
    try {
      const stored = await AsyncStorage.getItem('pendingActions');
      if (stored) {
        setPendingActions(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading pending actions:', error);
    }
  };

  const savePendingActions = async (actions: OfflineAction[]) => {
    try {
      await AsyncStorage.setItem('pendingActions', JSON.stringify(actions));
    } catch (error) {
      console.error('Error saving pending actions:', error);
    }
  };

  const addOfflineAction = async (action: Omit<OfflineAction, 'id' | 'timestamp'>) => {
    const newAction: OfflineAction = {
      ...action,
      id: Date.now().toString(),
      timestamp: Date.now(),
    };

    const updatedActions = [...pendingActions, newAction];
    setPendingActions(updatedActions);
    await savePendingActions(updatedActions);
  };

  const syncPendingActions = async () => {
    if (!isOnline || pendingActions.length === 0 || isSyncing) {
      return;
    }

    setIsSyncing(true);
    const successfulActions: string[] = [];

    for (const action of pendingActions) {
      try {
        switch (action.type) {
          case 'CREATE':
            await fetch(action.endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await AsyncStorage.getItem('authToken')}`,
              },
              body: JSON.stringify(action.data),
            });
            break;
          case 'UPDATE':
            await fetch(action.endpoint, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await AsyncStorage.getItem('authToken')}`,
              },
              body: JSON.stringify(action.data),
            });
            break;
          case 'DELETE':
            await fetch(action.endpoint, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${await AsyncStorage.getItem('authToken')}`,
              },
            });
            break;
        }
        successfulActions.push(action.id);
      } catch (error) {
        console.error(`Error syncing action ${action.id}:`, error);
      }
    }

    // Remove successfully synced actions
    const remainingActions = pendingActions.filter(
      action => !successfulActions.includes(action.id)
    );
    setPendingActions(remainingActions);
    await savePendingActions(remainingActions);
    setIsSyncing(false);
  };

  const executeAction = async (
    type: 'CREATE' | 'UPDATE' | 'DELETE',
    endpoint: string,
    data?: any
  ) => {
    if (isOnline) {
      // Execute immediately if online
      try {
        const method = type === 'CREATE' ? 'POST' : type === 'UPDATE' ? 'PUT' : 'DELETE';
        const response = await fetch(endpoint, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await AsyncStorage.getItem('authToken')}`,
          },
          body: data ? JSON.stringify(data) : undefined,
        });
        return await response.json();
      } catch (error) {
        // If online request fails, queue for offline sync
        await addOfflineAction({ type, endpoint, data });
        throw error;
      }
    } else {
      // Queue for later sync if offline
      await addOfflineAction({ type, endpoint, data });
      return { offline: true };
    }
  };

  return {
    isOnline,
    pendingActions,
    isSyncing,
    executeAction,
    syncPendingActions,
  };
}