import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { TriangleAlert as AlertTriangle, TrendingDown, Calendar, DollarSign, Target, CircleCheck as CheckCircle, X } from 'lucide-react-native';
import AlertsService, { Alert, AlertDashboard } from '@/services/alerts';
import { useAlertsManager } from '@/hooks/useAlertsManager';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import Header from '@/components/ui/Header';
import { router } from 'expo-router';
import Footer from '@/components/ui/Footer';
import { useAuth } from '@/contexts/AuthContext';


export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dashboard, setDashboard] = useState<AlertDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  // Hook pour la gestion automatique des alertes
  const { 
    checkAutomaticAlerts, 
    getNewAlerts, 
    markAllAlertsAsRead,
    getAlertsStats 
  } = useAlertsManager({
    userId: user?.id?.toString() || '', // Utiliser l'ID de l'utilisateur connecté
    checkInterval: 3 * 60 * 1000, // 3 minutes
    autoCheckOnAppFocus: true,
  });

  // Charger les données au montage du composant et quand l'utilisateur change
  useEffect(() => {
    if (user?.id) {
      loadAlertsData();
    }
  }, [user?.id]);

  const loadAlertsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // S'assurer que l'utilisateur est connecté
      if (!user?.id) {
        setError('Utilisateur non connecté');
        setLoading(false);
        return;
      }
      
      // Charger les alertes et le tableau de bord en parallèle
      // Le backend filtre automatiquement par utilisateur connecté
      const [alertsData, dashboardData] = await Promise.all([
        AlertsService.getAlerts({ ordering: '-triggered_at' }),
        AlertsService.getAlertDashboard()
      ]);
      
      console.log('alertsData', alertsData);
      console.log('dashboardData', dashboardData);
      setAlerts(alertsData);
      setDashboard(dashboardData);
    } catch (err) {
      console.error('Error loading alerts data:', err);
      setError('Erreur lors du chargement des alertes');
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Impossible de charger les alertes',
        position: 'top',
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAlertsData();
    setRefreshing(false);
  };

  const markAllAsRead = async () => {
    try {
      await markAllAlertsAsRead();
      await loadAlertsData(); // Recharger pour mettre à jour l'état
      Toast.show({
        type: 'success',
        text1: 'Succès',
        text2: 'Toutes les alertes ont été marquées comme lues',
        position: 'top',
      });
    } catch (err) {
      console.error('Error marking all alerts as read:', err);
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Impossible de marquer toutes les alertes comme lues',
        position: 'top',
      });
    }
  };

  const markAsRead = async (alertId: string) => {
    try {
      await AlertsService.acknowledgeAlert(alertId);
      setAlerts(alerts.map(alert => 
        alert.id === alertId ? { ...alert, status: 'acknowledged' as const } : alert
      ));
      Toast.show({
        type: 'success',
        text1: 'Succès',
        text2: 'Alerte marquée comme lue',
        position: 'top',
      });
    } catch (err) {
      console.error('Error marking alert as read:', err);
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Impossible de marquer l\'alerte comme lue',
        position: 'top',
      });
    }
  };

  const dismissAlert = async (alertId: string) => {
    try {
      await AlertsService.dismissAlert(alertId);
      setAlerts(alerts.filter(alert => alert.id !== alertId));
      Toast.show({
        type: 'success',
        text1: 'Succès',
        text2: 'Alerte ignorée',
        position: 'top',
      });
    } catch (err) {
      console.error('Error dismissing alert:', err);
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Impossible d\'ignorer l\'alerte',
        position: 'top',
      });
    }
  };

  const resolveAlert = async (alertId: string, actionTaken?: string) => {
    try {
      await AlertsService.resolveAlert(alertId, actionTaken);
      setAlerts(alerts.map(alert => 
        alert.id === alertId ? { ...alert, status: 'resolved' as const } : alert
      ));
      Toast.show({
        type: 'success',
        text1: 'Succès',
        text2: 'Alerte résolue',
        position: 'top',
      });
    } catch (err) {
      console.error('Error resolving alert:', err);
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Impossible de résoudre l\'alerte',
        position: 'top',
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-SN', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getAlertIcon = (alert: Alert) => {
    const color = getSeverityColor(alert.severity);
    
    // Vérifier que alert_type existe et a les propriétés nécessaires
    if (!alert.alert_type || !alert.alert_type.name) {
      return <AlertTriangle size={20} color={color} />;
    }
    
    // Utiliser le nom du type d'alerte ou la catégorie
    const alertType = alert.alert_type.name.toLowerCase();
    const category = alert.alert_type.category;
    
    if (alertType.includes('budget') || alertType.includes('dépense')) {
        return <TrendingDown size={20} color={color} />;
    } else if (alertType.includes('revenu') || alertType.includes('vente')) {
        return <DollarSign size={20} color={color} />;
    } else if (alertType.includes('paiement') || alertType.includes('facture')) {
        return <Calendar size={20} color={color} />;
    } else if (alertType.includes('objectif') || alertType.includes('progrès')) {
        return <Target size={20} color={color} />;
    } else if (category === 'financial') {
      return <DollarSign size={20} color={color} />;
    } else if (category === 'operational') {
      return <Calendar size={20} color={color} />;
    } else {
        return <AlertTriangle size={20} color={color} />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return '#EF4444';
      case 'medium':
        return '#EAB308';
      default:
        return '#22C55E';
    }
  };

  const getSeverityBackground = (severity: string) => {
    switch (severity) {
      case 'high':
        return '#EF444415';
      case 'medium':
        return '#EAB30815';
      default:
        return '#22C55E15';
    }
  };

  const unreadCount = alerts.filter(alert => alert.status === 'active').length;

  const AlertItem = ({ alert }: { alert: Alert }) => (
    <View style={[
      styles.alertCard,
      { 
        backgroundColor: alert.status === 'active' ? '#F8FAFC' : '#FFFFFF',
        borderLeftColor: getSeverityColor(alert.severity)
      }
    ]}>
      <View style={styles.alertHeader}>
        <View style={[styles.iconContainer, { backgroundColor: getSeverityBackground(alert.severity) }]}>
          {getAlertIcon(alert)}
        </View>
        <View style={styles.alertContent}>
          <View style={styles.alertTitleRow}>
            <Text style={styles.alertTitle}>{alert.title}</Text>
            {alert.status === 'active' && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.alertMessage}>{alert.description}</Text>
          
          {/* Afficher le type d'alerte si disponible */}
          {alert.alert_type && alert.alert_type.name && (
            <Text style={styles.alertTypeText}>
              Type: {alert.alert_type.name}
            </Text>
          )}
          
          {/* Informations supplémentaires selon le type d'alerte */}
          {alert.context_data && Object.keys(alert.context_data).length > 0 && (
            <View style={styles.alertDetails}>
              {alert.context_data.amount && (
                <Text style={styles.alertDetailText}>
                  Montant: {formatCurrency(alert.context_data.amount)}
                </Text>
              )}
              {alert.context_data.budget && (
                <Text style={styles.alertDetailText}>
                  Budget: {formatCurrency(alert.context_data.budget)}
                </Text>
              )}
              {alert.context_data.category && (
              <Text style={styles.alertDetailText}>
                  Catégorie: {alert.context_data.category}
              </Text>
          )}
              {alert.context_data.client && (
              <Text style={styles.alertDetailText}>
                  Client: {alert.context_data.client}
              </Text>
          )}
              {alert.context_data.daysOverdue && (
              <Text style={styles.alertDetailText}>
                  Retard: {alert.context_data.daysOverdue} jours
              </Text>
          )}
              {alert.context_data.current && alert.context_data.target && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                        { width: `${(alert.context_data.current / alert.context_data.target) * 100}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                    {formatCurrency(alert.context_data.current)} / {formatCurrency(alert.context_data.target)}
              </Text>
                </View>
              )}
            </View>
          )}
          
          <Text style={styles.alertDate}>
            {new Date(alert.triggered_at).toLocaleDateString('fr-FR', { 
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
          
          {/* Indicateur de confiance IA */}
          {alert.ai_confidence > 0 && (
            <Text style={styles.aiConfidence}>
              Confiance IA: {Math.round(alert.ai_confidence)}%
            </Text>
          )}
        </View>
        
        <View style={styles.alertActions}>
          <TouchableOpacity onPress={() => dismissAlert(alert.id)}>
            <X size={18} color="#64748B" />
          </TouchableOpacity>
        </View>
      </View>
      
      {alert.status === 'active' && (
        <View style={styles.alertActionButtons}>
        <TouchableOpacity 
          style={styles.markReadButton}
          onPress={() => markAsRead(alert.id)}
        >
          <CheckCircle size={16} color="#22C55E" />
          <Text style={styles.markReadText}>Marquer comme lu</Text>
        </TouchableOpacity>
          
          {alert.action_required && (
            <TouchableOpacity 
              style={styles.resolveButton}
              onPress={() => resolveAlert(alert.id)}
            >
              <Target size={16} color="#3B82F6" />
              <Text style={styles.resolveText}>Résoudre</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Header 
              title="Alertes"
              onNotificationPress={() => router.push('alerts' as never)}
                onProfilePress={() => router.push('profile' as never)}
            />
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Alertes</Text>
        <View style={styles.headerActions}>
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unreadCount} nouvelles</Text>
          </View>
        )}
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.markAllReadButton} onPress={markAllAsRead}>
              <Text style={styles.markAllReadText}>Tout marquer comme lu</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22C55E" />
          <Text style={styles.loadingText}>Chargement des alertes...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <AlertTriangle size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Erreur de chargement</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadAlertsData}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : alerts.length === 0 ? (
        <View style={styles.emptyState}>
          <CheckCircle size={64} color="#22C55E" />
          <Text style={styles.emptyTitle}>Aucune alerte</Text>
          <Text style={styles.emptyMessage}>
            Toutes vos alertes ont été traitées. Votre business est sur la bonne voie !
          </Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.alertsList} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {alerts.map((alert) => (
            <AlertItem key={alert.id} alert={alert} />
          ))}
          <View style={styles.listFooter} />
        </ScrollView>
      )}

      {/* <View style={styles.recommendationsCard}>
        <Text style={styles.recommendationsTitle}>💡 Recommandations IA</Text>
        <View style={styles.recommendationItem}>
          <Text style={styles.recommendationText}>
            Réduisez vos frais de transport en optimisant vos trajets de livraison
          </Text>
        </View>
        <View style={styles.recommendationItem}>
          <Text style={styles.recommendationText}>
            Vos ventes sont plus élevées le mercredi. Planifiez plus de stock ce jour-là
          </Text>
        </View>
      </View> */}

      {/* Toast container */}
      <Toast />
      <Footer showNavigation />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 20,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  markAllReadButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  markAllReadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  screenTitle: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
  },
  unreadBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  alertsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  alertTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginLeft: 8,
  },
  alertMessage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 8,
  },
  alertTypeText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#3B82F6',
    marginBottom: 8,
  },
  alertDetails: {
    backgroundColor: '#F1F5F9',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  alertDetailText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#475569',
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22C55E',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#475569',
  },
  alertDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#94A3B8',
  },
  alertActions: {
    alignItems: 'flex-end',
  },
  markReadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  markReadText: {
    marginLeft: 6,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#22C55E',
  },
  alertActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  resolveButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resolveText: {
    marginLeft: 6,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#3B82F6',
  },
  aiConfidence: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#94A3B8',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#EF4444',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
  },
  recommendationsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  recommendationsTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 12,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    lineHeight: 20,
  },
  listFooter: {
    height: 80,
  },
});