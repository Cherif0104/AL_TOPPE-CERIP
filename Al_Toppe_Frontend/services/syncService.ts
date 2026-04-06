import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from './api';

interface OfflineAction {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'AUDIO';
  endpoint: string;
  method: string;
  data: any;
  timestamp: number;
  retries: number;
  audioUri?: string; // Pour les actions audio
  audioMetadata?: {
    filename: string;
    type: string;
    duration?: number;
    storageKey?: string; // Clé AsyncStorage pour web
    isWeb?: boolean; // Indicateur pour web
  };
}

interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSync: Date | null;
}

interface NetInfoState {
  isConnected?: boolean;
}

class SyncService {
  private isOnline: boolean = true;
  private isSyncing: boolean = false;
  private pendingActions: OfflineAction[] = [];
  private listeners: Set<(status: SyncStatus) => void> = new Set();

  constructor() {
    this.setupNetworkListener();
    this.loadPendingActions();
  }

  private setupNetworkListener() {
    // Définir l'état réseau initial basé sur la disponibilité
    this.isOnline = true;
    
    // Écouter les changements de réseau si NetInfo est disponible
    try {
      const NetInfo = require('@react-native-community/netinfo');
      NetInfo.addEventListener((state: NetInfoState) => {
        const wasOffline = !this.isOnline;
        this.isOnline = state.isConnected ?? false;
        
        if (wasOffline && this.isOnline) {
          // Just came back online
          this.syncPendingActions();
        }
        
        this.notifyListeners();
      });
    } catch (error) {
      console.warn('NetInfo not available, assuming online');
    }
  }

  private async loadPendingActions() {
    try {
      const stored = await AsyncStorage.getItem('pendingActions');
      if (stored) {
        this.pendingActions = JSON.parse(stored);
        this.notifyListeners();
      }
    } catch (error) {
      console.error('❌ Error loading pending actions:', error);
    }
  }

  private async savePendingActions() {
    try {
      await AsyncStorage.setItem('pendingActions', JSON.stringify(this.pendingActions));
      this.notifyListeners();
    } catch (error) {
      console.error('❌ Error saving pending actions:', error);
    }
  }

  private notifyListeners() {
    const status: SyncStatus = {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount: this.pendingActions.length,
      lastSync: null,
    };

    this.listeners.forEach(listener => listener(status));
  }

  async addOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retries'>) {
    const newAction: OfflineAction = {
      ...action,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      retries: 0,
    };

    this.pendingActions.push(newAction);
    await this.savePendingActions();
    
    console.log(`📤 Action ajoutée à la queue offline: ${action.type} ${action.endpoint}`);
  }

  async syncPendingActions() {
    if (!this.isOnline || this.pendingActions.length === 0 || this.isSyncing) {
      return;
    }

    this.isSyncing = true;
    this.notifyListeners();

    console.log(`🔄 Synchronisation de ${this.pendingActions.length} actions...`);

    const successfulActions: string[] = [];
    const failedActions: OfflineAction[] = [];

    for (const action of this.pendingActions) {
      try {
        const response = await this.executeAction(action);
        
        if (response && !response.error) {
          successfulActions.push(action.id);
          console.log(`✅ Action synchronisée: ${action.type} ${action.endpoint}`);
        } else {
          action.retries += 1;
          if (action.retries < 3) {
            failedActions.push(action);
          } else {
            console.log(`❌ Action abandonnée après 3 tentatives: ${action.id}`);
          }
        }
      } catch (error) {
        console.error(`❌ Erreur sync action ${action.id}:`, error);
        action.retries += 1;
        if (action.retries < 3) {
          failedActions.push(action);
        }
      }
    }

    this.pendingActions = failedActions;
    await this.savePendingActions();
    
    this.isSyncing = false;
    this.notifyListeners();

    if (successfulActions.length > 0) {
      console.log(`✅ ${successfulActions.length} actions synchronisées avec succès`);
    }
  }

  private async executeAction(action: OfflineAction) {
    const token = await AsyncStorage.getItem('authToken');
    const headers: Record<string, string> = {};

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    let requestBody: BodyInit | undefined;

    // Gérer les actions audio avec FormData
    if (action.type === 'AUDIO' && action.audioUri && action.audioMetadata) {
      const form = new FormData();
      
      // Récupérer le fichier audio
      let audioFile: any = null;
      
      if (action.audioMetadata.isWeb && action.audioMetadata.storageKey) {
        // Sur web, récupérer depuis AsyncStorage
        try {
          const audioDataStr = await AsyncStorage.getItem(action.audioMetadata.storageKey);
          if (audioDataStr) {
            const audioData = JSON.parse(audioDataStr);
            // Sur web, l'URI peut être un blob URL ou data URL
            if (typeof audioData.uri === 'string') {
              try {
                const resp = await fetch(audioData.uri);
                const blob = await resp.blob();
                const file = new File([blob], audioData.filename || 'recording.wav', { 
                  type: audioData.type || blob.type || 'audio/wav' 
                });
                audioFile = file;
              } catch (fetchError) {
                console.error('❌ Erreur récupération audio depuis URI:', fetchError);
                throw new Error('Impossible de récupérer le fichier audio');
              }
            }
          }
        } catch (storageError) {
          console.error('❌ Erreur récupération audio depuis AsyncStorage:', storageError);
          throw new Error('Impossible de récupérer le fichier audio depuis le stockage');
        }
      } else if (action.audioUri) {
        // Sur mobile, utiliser l'URI du fichier
        // Le fichier est déjà sauvegardé dans FileSystem
        audioFile = {
          uri: action.audioUri,
          name: action.audioMetadata.filename,
          type: action.audioMetadata.type,
        };
      }

      if (!audioFile) {
        throw new Error('Fichier audio introuvable');
      }

      // Ajouter le fichier au FormData
      if (typeof audioFile === 'object' && 'uri' in audioFile) {
        // React Native: passer l'objet directement
        form.append('audio', audioFile as any);
      } else if (audioFile instanceof File || audioFile instanceof Blob) {
        // Web: utiliser File/Blob
        form.append('audio', audioFile);
      } else {
        form.append('audio', audioFile as any);
      }

      requestBody = form as any;
      // Ne pas définir Content-Type pour FormData, le navigateur le fera automatiquement
    } else {
      // Pour les autres actions, utiliser JSON
      headers['Content-Type'] = 'application/json';
      requestBody = action.data ? JSON.stringify(action.data) : undefined;
    }

    const response = await fetch(action.endpoint, {
      method: action.method,
      headers,
      body: requestBody,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Erreur HTTP ${response.status}:`, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
  }

  async executeRequest(
    endpoint: string,
    method: string,
    data?: any
  ): Promise<any> {
    if (this.isOnline) {
      try {
        return await this.executeAction({
          id: '',
          type: method === 'POST' ? 'CREATE' : method === 'PUT' || method === 'PATCH' ? 'UPDATE' : 'DELETE',
          endpoint,
          method,
          data,
          timestamp: Date.now(),
          retries: 0,
        });
      } catch (error) {
        // Si la requête online échoue, queue pour offline
        await this.addOfflineAction({
          type: method === 'POST' ? 'CREATE' : method === 'PUT' || method === 'PATCH' ? 'UPDATE' : 'DELETE',
          endpoint,
          method,
          data,
        });
        throw error;
      }
    } else {
      // Queue pour offline
      await this.addOfflineAction({
        type: method === 'POST' ? 'CREATE' : method === 'PUT' || method === 'PATCH' ? 'UPDATE' : 'DELETE',
        endpoint,
        method,
        data,
      });
      
      return { offline: true, message: 'Action enregistrée pour synchronisation' };
    }
  }

  /**
   * Ajouter une action audio en queue offline
   */
  async addAudioAction(
    endpoint: string,
    audioUri: string,
    metadata: {
      filename: string;
      type: string;
      duration?: number;
      storageKey?: string; // Clé AsyncStorage pour web
      isWeb?: boolean; // Indicateur pour web
    }
  ): Promise<string> {
    const actionId = `${Date.now()}-${Math.random()}`;
    
    await this.addOfflineAction({
      type: 'AUDIO',
      endpoint,
      method: 'POST',
      data: {},
      audioUri,
      audioMetadata: metadata,
    });
    
    console.log(`🎤 Audio ajouté à la queue offline: ${metadata.filename}`);
    return actionId;
  }

  subscribe(listener: (status: SyncStatus) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getStatus(): SyncStatus {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount: this.pendingActions.length,
      lastSync: null,
    };
  }

  async clearPendingActions() {
    this.pendingActions = [];
    await this.savePendingActions();
  }

  getPendingActions() {
    return [...this.pendingActions];
  }
}

export default new SyncService();

