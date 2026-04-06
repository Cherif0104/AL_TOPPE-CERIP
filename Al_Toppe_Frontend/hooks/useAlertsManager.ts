import { useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AlertsService from '@/services/alerts';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UseAlertsManagerOptions {
  userId?: string;
  checkInterval?: number; // en millisecondes
  autoCheckOnAppFocus?: boolean;
}

/**
 * Hook personnalisé pour gérer les alertes automatiquement
 */
export const useAlertsManager = (options: UseAlertsManagerOptions = {}) => {
  const {
    userId,
    checkInterval = 5 * 60 * 1000, // 5 minutes par défaut
    autoCheckOnAppFocus = true,
  } = options;

  // Fonction pour vérifier et déclencher des alertes automatiques
  const checkAutomaticAlerts = useCallback(async () => {
    if (!userId) return;

    try {
      console.log('🔍 Vérification des alertes automatiques...');
      
      // Vérifier les alertes automatiques
      const triggeredAlerts = await AlertsService.checkAndTriggerAutomaticAlerts(userId);
      
      if (triggeredAlerts.length > 0) {
        console.log(`🚨 ${triggeredAlerts.length} nouvelles alertes déclenchées`);
        
        // Stocker les nouvelles alertes pour notification
        await AsyncStorage.setItem(
          'newAlerts',
          JSON.stringify(triggeredAlerts.map(alert => ({
            id: alert.id,
            title: alert.title,
            severity: alert.severity,
            triggered_at: alert.triggered_at,
          })))
        );
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des alertes automatiques:', error);
    }
  }, [userId]);

  // Fonction pour déclencher une alerte financière spécifique
  const triggerFinancialAlert = useCallback(async (alertData: {
    type: 'budget_exceeded' | 'low_revenue' | 'payment_overdue' | 'goal_progress';
    amount?: number;
    budget?: number;
    category?: string;
    client?: string;
    daysOverdue?: number;
    current?: number;
    target?: number;
  }) => {
    if (!userId) return null;

    try {
      const alert = await AlertsService.triggerFinancialAlert({
        ...alertData,
        userId,
      });
      
      console.log(`🚨 Alerte financière déclenchée: ${alert.title}`);
      return alert;
    } catch (error) {
      console.error('Erreur lors du déclenchement de l\'alerte financière:', error);
      return null;
    }
  }, [userId]);

  // Fonction pour obtenir les nouvelles alertes non vues
  const getNewAlerts = useCallback(async () => {
    try {
      const newAlertsData = await AsyncStorage.getItem('newAlerts');
      if (newAlertsData) {
        const newAlerts = JSON.parse(newAlertsData);
        await AsyncStorage.removeItem('newAlerts'); // Supprimer après lecture
        return newAlerts;
      }
      return [];
    } catch (error) {
      console.error('Erreur lors de la récupération des nouvelles alertes:', error);
      return [];
    }
  }, []);

  // Fonction pour marquer toutes les alertes comme vues
  const markAllAlertsAsRead = useCallback(async () => {
    try {
      const unreadAlerts = await AlertsService.getUnreadAlerts();
      const alertIds = unreadAlerts.map(alert => alert.id);
      
      if (alertIds.length > 0) {
        await AlertsService.markAlertsAsRead(alertIds);
        console.log(`✅ ${alertIds.length} alertes marquées comme lues`);
      }
    } catch (error) {
      console.error('Erreur lors du marquage des alertes comme lues:', error);
    }
  }, []);

  // Fonction pour obtenir les statistiques des alertes
  const getAlertsStats = useCallback(async () => {
    try {
      const [unreadCount, statistics] = await Promise.all([
        AlertsService.getUnreadAlertsCount(),
        AlertsService.getAlertStatistics(),
      ]);
      
      return {
        unreadCount: unreadCount.count,
        totalAlerts: statistics.total_alerts,
        alertsToday: statistics.alerts_today,
        resolutionRate: statistics.resolution_rate,
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      return {
        unreadCount: 0,
        totalAlerts: 0,
        alertsToday: 0,
        resolutionRate: 0,
      };
    }
  }, []);

  // Effet pour la vérification périodique
  useEffect(() => {
    if (!userId) return;

    // Vérification initiale
    checkAutomaticAlerts();

    // Vérification périodique
    const interval = setInterval(checkAutomaticAlerts, checkInterval);

    return () => clearInterval(interval);
  }, [userId, checkInterval, checkAutomaticAlerts]);

  // Effet pour la vérification lors du focus de l'app
  useEffect(() => {
    if (!autoCheckOnAppFocus || !userId) return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkAutomaticAlerts();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => subscription?.remove();
  }, [autoCheckOnAppFocus, userId, checkAutomaticAlerts]);

  return {
    checkAutomaticAlerts,
    triggerFinancialAlert,
    getNewAlerts,
    markAllAlertsAsRead,
    getAlertsStats,
  };
};

/**
 * Hook pour gérer les alertes en temps réel
 */
export const useRealtimeAlerts = (userId?: string) => {
  const {
    checkAutomaticAlerts,
    triggerFinancialAlert,
    getNewAlerts,
    markAllAlertsAsRead,
    getAlertsStats,
  } = useAlertsManager({
    userId,
    checkInterval: 2 * 60 * 1000, // 2 minutes pour le temps réel
    autoCheckOnAppFocus: true,
  });

  return {
    checkAutomaticAlerts,
    triggerFinancialAlert,
    getNewAlerts,
    markAllAlertsAsRead,
    getAlertsStats,
  };
};

/**
 * Hook pour les alertes financières spécifiques
 */
export const useFinancialAlerts = (userId?: string) => {
  const { triggerFinancialAlert } = useAlertsManager({ userId });

  const triggerBudgetExceededAlert = useCallback(async (data: {
    amount: number;
    budget: number;
    category: string;
  }) => {
    return triggerFinancialAlert({
      type: 'budget_exceeded',
      amount: data.amount,
      budget: data.budget,
      category: data.category,
    });
  }, [triggerFinancialAlert]);

  const triggerLowRevenueAlert = useCallback(async (data: {
    amount: number;
    average: number;
  }) => {
    return triggerFinancialAlert({
      type: 'low_revenue',
      amount: data.amount,
      average: data.average,
    });
  }, [triggerFinancialAlert]);

  const triggerPaymentOverdueAlert = useCallback(async (data: {
    amount: number;
    client: string;
    daysOverdue: number;
  }) => {
    return triggerFinancialAlert({
      type: 'payment_overdue',
      amount: data.amount,
      client: data.client,
      daysOverdue: data.daysOverdue,
    });
  }, [triggerFinancialAlert]);

  const triggerGoalProgressAlert = useCallback(async (data: {
    current: number;
    target: number;
  }) => {
    return triggerFinancialAlert({
      type: 'goal_progress',
      current: data.current,
      target: data.target,
    });
  }, [triggerFinancialAlert]);

  return {
    triggerBudgetExceededAlert,
    triggerLowRevenueAlert,
    triggerPaymentOverdueAlert,
    triggerGoalProgressAlert,
  };
};

export default useAlertsManager;




