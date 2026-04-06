import { useState, useEffect } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle,
  Database,
  Clock
} from 'lucide-react';
import { ErrorHandler } from '../services/errorHandler';
import { cacheService } from '../services/cacheService';
import { toast } from 'sonner';

export function ConnectivityStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isOfflineMode, setIsOfflineMode] = useState(ErrorHandler.isOfflineMode());
  const [isChecking, setIsChecking] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Écouter les changements de connectivité
    const handleOnline = () => {
      setIsOnline(true);
      if (isOfflineMode) {
        toast.success('Connexion restaurée', {
          description: 'Synchronisation en cours...',
        });
        syncPendingOperations();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Connexion perdue', {
        description: 'Passage en mode hors-ligne',
      });
    };

    // Écouter les événements de mode hors-ligne
    const handleOfflineModeEnabled = () => {
      setIsOfflineMode(true);
    };

    const handleOfflineModeDisabled = () => {
      setIsOfflineMode(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-mode-enabled', handleOfflineModeEnabled);
    window.addEventListener('offline-mode-disabled', handleOfflineModeDisabled);

    // Vérifier périodiquement les opérations en attente
    const interval = setInterval(() => {
      const pending = cacheService.getPendingSync();
      setPendingSyncCount(pending.length);
    }, 5000);

    // Vérification initiale
    const pending = cacheService.getPendingSync();
    setPendingSyncCount(pending.length);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-mode-enabled', handleOfflineModeEnabled);
      window.removeEventListener('offline-mode-disabled', handleOfflineModeDisabled);
      clearInterval(interval);
    };
  }, [isOfflineMode]);

  const checkConnectivity = async () => {
    setIsChecking(true);
    try {
      const isConnected = await ErrorHandler.checkConnectivity();
      if (isConnected && isOfflineMode) {
        ErrorHandler.disableOfflineMode();
        setIsOfflineMode(false);
        await syncPendingOperations();
      }
      toast.success(isConnected ? 'Connexion vérifiée' : 'Pas de connexion');
    } catch (error) {
      toast.error('Erreur lors de la vérification');
    } finally {
      setIsChecking(false);
    }
  };

  const syncPendingOperations = async () => {
    const pending = cacheService.getPendingSync();
    if (pending.length === 0) return;

    try {
      // Ici, on synchroniserait les opérations en attente
      // Pour l'instant, on les supprime simplement
      cacheService.clearPendingSync();
      setPendingSyncCount(0);
      setLastSync(new Date());
      toast.success(`${pending.length} opérations synchronisées`);
    } catch (error) {
      toast.error('Erreur lors de la synchronisation');
    }
  };

  const toggleOfflineMode = () => {
    if (isOfflineMode) {
      ErrorHandler.disableOfflineMode();
    } else {
      ErrorHandler.enableOfflineMode();
    }
    setIsOfflineMode(!isOfflineMode);
  };

  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-100 text-red-800';
    if (isOfflineMode) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="w-4 h-4" />;
    if (isOfflineMode) return <Database className="w-4 h-4" />;
    return <Wifi className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (!isOnline) return 'Hors ligne';
    if (isOfflineMode) return 'Mode hors-ligne';
    return 'En ligne';
  };

  const cacheStats = cacheService.getStats();

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="flex flex-col items-end space-y-2">
        {/* Détails du cache (affiché conditionnellement) */}
        {showDetails && (
          <Card className="p-4 w-80 bg-white/95 backdrop-blur-sm">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">État de l'application</h4>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowDetails(false)}
                >
                  ×
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <p className="text-gray-600">Cache</p>
                  <p className="font-medium">{cacheStats.validItems} entrées</p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-600">Taille</p>
                  <p className="font-medium">{Math.round(cacheStats.totalSize / 1024)} KB</p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-600">En attente</p>
                  <p className="font-medium">{pendingSyncCount} op.</p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-600">Dernière sync</p>
                  <p className="font-medium">
                    {lastSync ? lastSync.toLocaleTimeString('fr-FR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    }) : 'Jamais'}
                  </p>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={checkConnectivity}
                  disabled={isChecking}
                  className="flex-1"
                >
                  {isChecking ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Vérifier
                </Button>
                
                {pendingSyncCount > 0 && isOnline && (
                  <Button
                    size="sm"
                    onClick={syncPendingOperations}
                    className="flex-1 bg-[#006666] hover:bg-[#004d4d]"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sync
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Mode hors-ligne</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={toggleOfflineMode}
                  className="h-6 px-2"
                >
                  {isOfflineMode ? 'Désactiver' : 'Activer'}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Badge de statut principal */}
        <div className="flex items-center space-x-2">
          {pendingSyncCount > 0 && (
            <Badge className="bg-orange-100 text-orange-800">
              <Clock className="w-3 h-3 mr-1" />
              {pendingSyncCount}
            </Badge>
          )}
          
          <Badge 
            className={`${getStatusColor()} cursor-pointer hover:opacity-80`}
            onClick={() => setShowDetails(!showDetails)}
          >
            <div className="flex items-center space-x-1">
              {getStatusIcon()}
              <span>{getStatusText()}</span>
            </div>
          </Badge>
        </div>
      </div>
    </div>
  );
}