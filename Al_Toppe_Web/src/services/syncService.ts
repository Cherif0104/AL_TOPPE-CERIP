import { apiService } from './api';
import { cacheService } from './cacheService';
import { ErrorHandler } from './errorHandler';
import { toast } from 'sonner';

export interface SyncOperation {
  id: string;
  method: string;
  endpoint: string;
  data: any;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

export class SyncService {
  private static instance: SyncService;
  private isSyncing = false;
  private syncQueue: SyncOperation[] = [];

  private constructor() {
    this.loadPendingOperations();
    this.setupAutoSync();
  }

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  // Ajouter une opération à synchroniser
  addOperation(operation: Omit<SyncOperation, 'id' | 'retries' | 'maxRetries'>) {
    const syncOperation: SyncOperation = {
      ...operation,
      id: Date.now().toString(),
      retries: 0,
      maxRetries: 3
    };

    this.syncQueue.push(syncOperation);
    this.savePendingOperations();

    // Essayer de synchroniser immédiatement si en ligne
    if (navigator.onLine && !ErrorHandler.isOfflineMode()) {
      this.syncPendingOperations();
    }
  }

  // Synchroniser toutes les opérations en attente
  async syncPendingOperations(): Promise<void> {
    if (this.isSyncing || this.syncQueue.length === 0) {
      return;
    }

    this.isSyncing = true;
    const operationsToSync = [...this.syncQueue];
    let successCount = 0;
    let failureCount = 0;

    console.log(`Début de synchronisation de ${operationsToSync.length} opérations`);

    for (const operation of operationsToSync) {
      try {
        await this.syncSingleOperation(operation);
        this.removeOperation(operation.id);
        successCount++;
      } catch (error) {
        console.error(`Erreur lors de la synchronisation de l'opération ${operation.id}:`, error);
        
        operation.retries++;
        if (operation.retries >= operation.maxRetries) {
          this.removeOperation(operation.id);
          failureCount++;
          console.warn(`Opération ${operation.id} abandonnée après ${operation.maxRetries} tentatives`);
        }
      }
    }

    this.savePendingOperations();
    this.isSyncing = false;

    // Afficher un résumé de la synchronisation
    if (successCount > 0 || failureCount > 0) {
      const message = `Sync: ${successCount} réussies${failureCount > 0 ? `, ${failureCount} échouées` : ''}`;
      if (failureCount === 0) {
        toast.success(message);
      } else {
        toast.warning(message);
      }
    }

    console.log(`Synchronisation terminée: ${successCount} réussies, ${failureCount} échouées`);
  }

  // Synchroniser une seule opération
  private async syncSingleOperation(operation: SyncOperation): Promise<void> {
    const { method, endpoint, data } = operation;

    switch (method.toUpperCase()) {
      case 'POST':
        await apiService['makeRequest'](endpoint, {
          method: 'POST',
          body: JSON.stringify(data)
        });
        break;

      case 'PUT':
        await apiService['makeRequest'](endpoint, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
        break;

      case 'PATCH':
        await apiService['makeRequest'](endpoint, {
          method: 'PATCH',
          body: JSON.stringify(data)
        });
        break;

      case 'DELETE':
        await apiService['makeRequest'](endpoint, {
          method: 'DELETE'
        });
        break;

      default:
        throw new Error(`Méthode HTTP non supportée: ${method}`);
    }
  }

  // Supprimer une opération de la queue
  private removeOperation(operationId: string): void {
    this.syncQueue = this.syncQueue.filter(op => op.id !== operationId);
  }

  // Charger les opérations en attente depuis le cache
  private loadPendingOperations(): void {
    const pending = cacheService.getPendingSync();
    this.syncQueue = pending.map((op, index) => ({
      id: `${op.timestamp}_${index}`,
      method: op.method,
      endpoint: op.endpoint,
      data: op.data,
      timestamp: op.timestamp,
      retries: 0,
      maxRetries: 3
    }));
  }

  // Sauvegarder les opérations en attente dans le cache
  private savePendingOperations(): void {
    const operations = this.syncQueue.map(op => ({
      method: op.method,
      endpoint: op.endpoint,
      data: op.data,
      timestamp: op.timestamp
    }));
    
    cacheService.set('pending_sync', operations, 7 * 24 * 60 * 60 * 1000); // 7 jours
  }

  // Configuration de la synchronisation automatique
  private setupAutoSync(): void {
    // Synchroniser quand on revient en ligne
    window.addEventListener('online', () => {
      setTimeout(() => {
        this.syncPendingOperations();
      }, 1000); // Délai pour laisser la connexion se stabiliser
    });

    // Synchronisation périodique si en ligne
    setInterval(() => {
      if (navigator.onLine && !ErrorHandler.isOfflineMode() && this.syncQueue.length > 0) {
        this.syncPendingOperations();
      }
    }, 30000); // Toutes les 30 secondes

    // Synchroniser au focus de la fenêtre
    window.addEventListener('focus', () => {
      if (navigator.onLine && !ErrorHandler.isOfflineMode() && this.syncQueue.length > 0) {
        this.syncPendingOperations();
      }
    });
  }

  // Obtenir le nombre d'opérations en attente
  getPendingCount(): number {
    return this.syncQueue.length;
  }

  // Obtenir la liste des opérations en attente
  getPendingOperations(): SyncOperation[] {
    return [...this.syncQueue];
  }

  // Effacer toutes les opérations en attente
  clearPendingOperations(): void {
    this.syncQueue = [];
    this.savePendingOperations();
    cacheService.clearPendingSync();
  }

  // Vérifier si une synchronisation est en cours
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  // Forcer une synchronisation manuelle
  async forcSync(): Promise<void> {
    if (!navigator.onLine) {
      throw new Error('Impossible de synchroniser hors ligne');
    }

    await this.syncPendingOperations();
  }

  // Statistiques de synchronisation
  getStats() {
    const now = Date.now();
    const operations = this.syncQueue;

    return {
      totalPending: operations.length,
      oldestOperation: operations.length > 0 
        ? new Date(Math.min(...operations.map(op => op.timestamp)))
        : null,
      newestOperation: operations.length > 0
        ? new Date(Math.max(...operations.map(op => op.timestamp)))
        : null,
      operationsByMethod: operations.reduce((acc, op) => {
        acc[op.method] = (acc[op.method] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      failedOperations: operations.filter(op => op.retries > 0).length
    };
  }
}

export const syncService = SyncService.getInstance();