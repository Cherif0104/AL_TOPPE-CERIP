import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import SyncService from '@/services/syncService';

// Import NetInfo conditionnel
let NetInfo: any;
try {
  NetInfo = require('@react-native-community/netinfo').default;
} catch (error) {
  console.warn('NetInfo not available');
}

interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSync: Date | null;
}

export function ConnectivityStatus() {
  const { isOnline } = useOfflineSync();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    lastSync: null,
  });

  useEffect(() => {
    // Charger le statut initial
    setSyncStatus(SyncService.getStatus());

    // S'abonner aux changements
    const unsubscribe = SyncService.subscribe((status) => {
      setSyncStatus(status);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const handleSync = async () => {
    await SyncService.syncPendingActions();
  };

  if (isOnline && syncStatus.pendingCount === 0) {
    return null; // Ne pas afficher si tout est OK
  }

  return (
    <View style={[
      styles.container,
      !isOnline && styles.offlineContainer,
      syncStatus.isSyncing && styles.syncingContainer
    ]}>
      <View style={styles.content}>
        {!isOnline ? (
          <View style={styles.statusRow}>
            <View style={styles.indicator} />
            <Text style={styles.text}>Mode hors ligne</Text>
          </View>
        ) : syncStatus.isSyncing ? (
          <View style={styles.statusRow}>
            <View style={[styles.indicator, styles.syncingIndicator]} />
            <Text style={styles.text}>Synchronisation...</Text>
          </View>
        ) : syncStatus.pendingCount > 0 ? (
          <View style={styles.statusRow}>
            <View style={[styles.indicator, styles.pendingIndicator]} />
            <Text style={styles.text}>
              {syncStatus.pendingCount} action(s) en attente
            </Text>
          </View>
        ) : null}
      </View>
      
      {syncStatus.pendingCount > 0 && isOnline && !syncStatus.isSyncing && (
        <TouchableOpacity 
          style={styles.syncButton}
          onPress={handleSync}
        >
          <Text style={styles.syncButtonText}>Synchroniser</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 4,
    left: 0,
    right: 0,
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    zIndex: 1000,
  },
  offlineContainer: {
    backgroundColor: '#ffe0e0',
    borderBottomColor: '#f44336',
  },
  syncingContainer: {
    backgroundColor: '#e3f2fd',
    borderBottomColor: '#2196f3',
  },
  content: {
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4caf50',
    marginRight: 8,
  },
  syncingIndicator: {
    backgroundColor: '#2196f3',
  },
  pendingIndicator: {
    backgroundColor: '#ff9800',
  },
  text: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  syncButton: {
    backgroundColor: '#2196f3',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 4,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ConnectivityStatus;

