import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '@/constants/config';

const API_BASE_URL = Config.API_BASE_URL;

// ============================================================================
// INTERFACES TYPESCRIPT
// ============================================================================

export interface AlertType {
  id: string;
  name: string;
  category: 'financial' | 'operational' | 'compliance' | 'market' | 'risk' | 'opportunity' | 'performance' | 'system';
  description: string;
  severity_levels: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AlertRule {
  id: string;
  name: string;
  alert_type: string;
  trigger_type: 'threshold' | 'trend' | 'anomaly' | 'prediction' | 'pattern' | 'comparison';
  condition_field: string;
  condition_operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne' | 'contains' | 'in';
  condition_value: any;
  ai_model: string;
  confidence_threshold: number;
  is_active: boolean;
  cooldown_hours: number;
  max_alerts_per_day: number;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: string;
  alert_type: AlertType;
  alert_rule?: AlertRule;
  target_user: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  triggered_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
  dismissed_at?: string;
  ai_confidence: number;
  context_data: Record<string, any>;
  action_required: boolean;
  action_taken?: string;
  escalation_level: number;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  alert: string;
  user: string;
  notification_type: 'push' | 'sms' | 'email' | 'in_app';
  title: string;
  message: string;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  channel_data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Recommendation {
  id: string;
  alert?: string;
  target_user: string;
  recommendation_type: 'action' | 'optimization' | 'prevention' | 'opportunity';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  ai_confidence: number;
  expected_impact: Record<string, any>;
  implementation_steps: string[];
  is_applied: boolean;
  applied_at?: string;
  feedback?: string;
  created_at: string;
  updated_at: string;
}

export interface AIAnalysis {
  id: string;
  alert?: string;
  analysis_type: 'pattern' | 'anomaly' | 'prediction' | 'trend' | 'correlation';
  target_data: string;
  ai_model: string;
  confidence_score: number;
  findings: Record<string, any>;
  insights: string[];
  recommendations: string[];
  created_at: string;
  updated_at: string;
}

export interface AlertDashboard {
  total_alerts: number;
  new_alerts: number;
  acknowledged_alerts: number;
  resolved_alerts: number;
  critical_alerts: number;
  alerts_by_type: Record<string, number>;
  alerts_by_severity: Record<string, number>;
  recent_alerts: Array<{
    id: string;
    title: string;
    triggered_at: string;
    ai_confidence: string;
  }>;
}

export interface AlertStatistics {
  total_alerts: number;
  alerts_today: number;
  alerts_this_week: number;
  alerts_this_month: number;
  resolution_rate: number;
  average_resolution_time: number;
  false_positive_rate: number;
  ai_confidence_average: number;
}

// ============================================================================
// SERVICE PRINCIPAL
// ============================================================================

class AlertsService {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await AsyncStorage.getItem('authToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    return headers;
  }

  private async request(endpoint: string, config: any = {}) {
    const url = `${API_BASE_URL}/alerts_ai${endpoint}`;
    const headers = await this.getAuthHeaders();

    const requestConfig: RequestInit = {
      method: config.method || 'GET',
      headers: { ...headers, ...config.headers },
    };

    if (config.body) {
      requestConfig.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, requestConfig);
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Alerts API Request failed:', error);
      throw error;
    }
  }

  // ============================================================================
  // TYPES D'ALERTES
  // ============================================================================

  /**
   * Récupérer tous les types d'alertes disponibles
   */
  async getAlertTypes(params?: {
    category?: string;
    is_active?: boolean;
    search?: string;
  }): Promise<AlertType[]> {
    const queryString = params ? new URLSearchParams(params as any).toString() : '';
    return this.request(`/alert-types/${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Récupérer un type d'alerte spécifique
   */
  async getAlertType(typeId: string): Promise<AlertType> {
    return this.request(`/alert-types/${typeId}/`);
  }

  // ============================================================================
  // RÈGLES D'ALERTES
  // ============================================================================

  /**
   * Récupérer toutes les règles d'alertes
   */
  async getAlertRules(params?: {
    alert_type?: string;
    trigger_type?: string;
    is_active?: boolean;
    search?: string;
  }): Promise<AlertRule[]> {
    try {
      const queryString = params ? new URLSearchParams(params as any).toString() : '';
      const response = await this.request(`/alert-rules/${queryString ? `?${queryString}` : ''}`);
      
      // L'API Django REST Framework retourne un objet avec une propriété 'results'
      if (response && typeof response === 'object' && 'results' in response) {
        return Array.isArray(response.results) ? response.results : [];
      }
      
      // Fallback pour les réponses directes
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('Error getting alert rules:', error);
      return [];
    }
  }

  /**
   * Récupérer une règle d'alerte spécifique
   */
  async getAlertRule(ruleId: string): Promise<AlertRule> {
    return this.request(`/alert-rules/${ruleId}/`);
  }

  // ============================================================================
  // ALERTES
  // ============================================================================

  /**
   * Récupérer toutes les alertes de l'utilisateur
   */
  async getAlerts(params?: {
    alert_type?: string;
    severity?: string;
    status?: string;
    search?: string;
    ordering?: string;
  }): Promise<Alert[]> {
    try {
      const queryString = params ? new URLSearchParams(params as any).toString() : '';
      const response = await this.request(`/alerts/${queryString ? `?${queryString}` : ''}`);
      
      // L'API Django REST Framework retourne un objet avec une propriété 'results'
      if (response && typeof response === 'object' && 'results' in response) {
        return Array.isArray(response.results) ? response.results : [];
      }
      
      // Fallback pour les réponses directes
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('Error getting alerts:', error);
      return [];
    }
  }

  /**
   * Récupérer les alertes d'un utilisateur spécifique
   */
  async getUserAlerts(userId: string, params?: {
    status?: string;
    severity?: string;
    limit?: number;
  }): Promise<Alert[]> {
    try {
      const queryString = params ? new URLSearchParams(params as any).toString() : '';
      const response = await this.request(`/users/${userId}/alerts/${queryString ? `?${queryString}` : ''}`);
      
      // L'API Django REST Framework retourne un objet avec une propriété 'results'
      if (response && typeof response === 'object' && 'results' in response) {
        return Array.isArray(response.results) ? response.results : [];
      }
      
      // Fallback pour les réponses directes
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('Error getting user alerts:', error);
      return [];
    }
  }

  /**
   * Récupérer une alerte spécifique
   */
  async getAlert(alertId: string): Promise<Alert> {
    return this.request(`/alerts/${alertId}/`);
  }

  /**
   * Créer une nouvelle alerte
   */
  // async createAlert(alertData: {
  //   alert_type: string;
  //   title: string;
  //   description: string;
  //   severity: 'low' | 'medium' | 'high' | 'critical';
  //   context_data?: Record<string, any>;
  //   action_required?: boolean;
  // }): Promise<Alert> {
  //   return this.request('/alerts/', {
  //     method: 'POST',
  //     body: alertData
  //   });
  // }

  /**
   * Reconnaître une alerte (marquer comme vue)
   */
  async acknowledgeAlert(alertId: string): Promise<Alert> {
    return this.request(`/alerts/${alertId}/acknowledge/`, {
      method: 'POST'
    });
  }

  /**
   * Résoudre une alerte
   */
  async resolveAlert(alertId: string, actionTaken?: string): Promise<Alert> {
    return this.request(`/alerts/${alertId}/resolve/`, {
      method: 'POST',
      body: { action_taken: actionTaken }
    });
  }

  /**
   * Ignorer une alerte
   */
  async dismissAlert(alertId: string): Promise<Alert> {
    return this.request(`/alerts/${alertId}/dismiss/`, {
      method: 'POST'
    });
  }

  /**
   * Marquer plusieurs alertes comme lues
   */
  async markAlertsAsRead(alertIds: string[]): Promise<{ success: boolean; count: number }> {
    return this.request('/alerts/mark-read/', {
      method: 'POST',
      body: { alert_ids: alertIds }
    });
  }

  // ============================================================================
  // NOTIFICATIONS
  // ============================================================================

  /**
   * Récupérer les notifications de l'utilisateur
   */
  async getNotifications(params?: {
    notification_type?: string;
    status?: string;
    unread_only?: boolean;
  }): Promise<Notification[]> {
    const queryString = params ? new URLSearchParams(params as any).toString() : '';
    return this.request(`/notifications/${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Marquer une notification comme lue
   */
  async markNotificationAsRead(notificationId: string): Promise<Notification> {
    return this.request(`/notifications/${notificationId}/mark-read/`, {
      method: 'POST'
    });
  }

  // ============================================================================
  // RECOMMANDATIONS IA
  // ============================================================================

  /**
   * Récupérer les recommandations pour l'utilisateur
   */
  async getRecommendations(params?: {
    recommendation_type?: string;
    priority?: string;
    is_applied?: boolean;
  }): Promise<Recommendation[]> {
    const queryString = params ? new URLSearchParams(params as any).toString() : '';
    return this.request(`/recommendations/${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Appliquer une recommandation
   */
  async applyRecommendation(recommendationId: string, feedback?: string): Promise<Recommendation> {
    return this.request(`/recommendations/${recommendationId}/apply/`, {
      method: 'POST',
      body: { feedback }
    });
  }

  // ============================================================================
  // ANALYSES IA
  // ============================================================================

  /**
   * Récupérer les analyses IA
   */
  async getAIAnalyses(params?: {
    analysis_type?: string;
    alert?: string;
  }): Promise<AIAnalysis[]> {
    const queryString = params ? new URLSearchParams(params as any).toString() : '';
    return this.request(`/ai-analyses/${queryString ? `?${queryString}` : ''}`);
  }

  // ============================================================================
  // TABLEAU DE BORD ET STATISTIQUES
  // ============================================================================

  /**
   * Récupérer le tableau de bord des alertes
   */
  async getAlertDashboard(): Promise<AlertDashboard> {
    try {
      const response = await this.request('/dashboard/');
      
      // Vérifier que la réponse est un objet valide
      if (response && typeof response === 'object') {
        return response as AlertDashboard;
      }
      
      // Retourner un tableau de bord vide en cas d'erreur
      return {
        total_alerts: 0,
        new_alerts: 0,
        acknowledged_alerts: 0,
        resolved_alerts: 0,
        critical_alerts: 0,
        alerts_by_type: {},
        alerts_by_severity: {},
        recent_alerts: []
      };
    } catch (error) {
      console.error('Error getting alert dashboard:', error);
      return {
        total_alerts: 0,
        new_alerts: 0,
        acknowledged_alerts: 0,
        resolved_alerts: 0,
        critical_alerts: 0,
        alerts_by_type: {},
        alerts_by_severity: {},
        recent_alerts: []
      };
    }
  }

  /**
   * Récupérer les statistiques des alertes
   */
  async getAlertStatistics(): Promise<AlertStatistics> {
    return this.request('/statistics/');
  }

  /**
   * Récupérer les alertes non lues
   */
  async getUnreadAlerts(): Promise<Alert[]> {
    return this.request('/alerts/?status=active&ordering=-triggered_at');
  }

  /**
   * Récupérer le nombre d'alertes non lues
   */
  async getUnreadAlertsCount(): Promise<{ count: number }> {
    return this.request('/alerts/unread-count/');
  }

  // ============================================================================
  // UTILITAIRES
  // ============================================================================

  /**
   * Vérifier si le service Alerts est disponible
   */
  async checkAlertsService(): Promise<boolean> {
    try {
      await this.request('/dashboard/');
      return true;
    } catch (error) {
      console.error('Alerts service not available:', error);
      return false;
    }
  }

  /**
   * Obtenir les alertes par catégorie
   */
  async getAlertsByCategory(): Promise<Record<string, Alert[]>> {
    const alerts = await this.getAlerts();
    const grouped: Record<string, Alert[]> = {};
    
    alerts.forEach(alert => {
      const category = alert.alert_type.category;
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(alert);
    });
    
    return grouped;
  }

  /**
   * Obtenir les alertes par sévérité
   */
  async getAlertsBySeverity(): Promise<Record<string, Alert[]>> {
    const alerts = await this.getAlerts();
    const grouped: Record<string, Alert[]> = {};
    
    alerts.forEach(alert => {
      const severity = alert.severity;
      if (!grouped[severity]) {
        grouped[severity] = [];
      }
      grouped[severity].push(alert);
    });
    
    return grouped;
  }

  /**
   * Filtrer les alertes par période
   */
  async getAlertsByPeriod(period: 'today' | 'week' | 'month' | 'year'): Promise<Alert[]> {
    try {
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(0);
      }

      const response = await this.request(`/alerts/?triggered_at__gte=${startDate.toISOString()}`);
      
      // L'API Django REST Framework retourne un objet avec une propriété 'results'
      if (response && typeof response === 'object' && 'results' in response) {
        return Array.isArray(response.results) ? response.results : [];
      }
      
      // Fallback pour les réponses directes
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('Error getting alerts by period:', error);
      return [];
    }
  }

  // ============================================================================
  // GESTION AUTOMATIQUE DES ALERTES
  // ============================================================================

  /**
   * Déclencher une alerte automatique basée sur des données financières
   */
  // async triggerFinancialAlert(data: {
  //   type: 'budget_exceeded' | 'low_revenue' | 'payment_overdue' | 'goal_progress';
  //   amount?: number;
  //   budget?: number;
  //   category?: string;
  //   client?: string;
  //   daysOverdue?: number;
  //   current?: number;
  //   target?: number;
  //   userId: string;
  // }): Promise<Alert> {
  //   const alertData = {
  //     alert_type: await this.getAlertTypeByName(data.type),
  //     title: this.getAlertTitle(data.type),
  //     description: this.getAlertDescription(data.type, data),
  //     severity: this.getAlertSeverity(data.type, data),
  //     context_data: {
  //       amount: data.amount,
  //       budget: data.budget,
  //       category: data.category,
  //       client: data.client,
  //       daysOverdue: data.daysOverdue,
  //       current: data.current,
  //       target: data.target,
  //     },
  //     action_required: this.isActionRequired(data.type),
  //     target_user: data.userId,
  //   };

  //   return this.createAlert(alertData);
  // }

  /**
   * Vérifier et déclencher des alertes automatiques pour un utilisateur
   */
  async checkAndTriggerAutomaticAlerts(userId: string): Promise<Alert[]> {
    const triggeredAlerts: Alert[] = [];

    try {
      // Récupérer les données financières récentes
      const recentAlertsResponse = await this.getAlertsByPeriod('week');
      
      // Vérifier que la réponse est un tableau
      const recentAlerts = Array.isArray(recentAlertsResponse) ? recentAlertsResponse : [];
      const userAlerts = recentAlerts.filter(alert => alert.target_user === userId);

      // Vérifier les règles d'alertes automatiques
      const alertRulesResponse = await this.getAlertRules({ is_active: true });
      const alertRules = Array.isArray(alertRulesResponse) ? alertRulesResponse : [];

      // for (const rule of alertRules) {
      //   // Vérifier si la règle s'applique à cet utilisateur
      //   if (await this.shouldTriggerRule(rule, userId, userAlerts)) {
      //     const alert = await this.createAlertFromRule(rule, userId);
      //     triggeredAlerts.push(alert);
      //   }
      // }

      return triggeredAlerts;
    } catch (error) {
      console.error('Error checking automatic alerts:', error);
      return [];
    }
  }

  /**
   * Obtenir le type d'alerte par nom
   */
  private async getAlertTypeByName(typeName: string): Promise<string> {
    const alertTypes = await this.getAlertTypes();
    const alertType = alertTypes.find(type => 
      type.name.toLowerCase().includes(typeName.toLowerCase())
    );
    return alertType?.id || '';
  }

  /**
   * Obtenir le titre de l'alerte selon le type
   */
  private getAlertTitle(type: string): string {
    const titles: Record<string, string> = {
      'budget_exceeded': 'Budget dépassé',
      'low_revenue': 'Revenus faibles',
      'payment_overdue': 'Paiement en attente',
      'goal_progress': 'Progrès objectif',
    };
    return titles[type] || 'Alerte système';
  }

  /**
   * Obtenir la description de l'alerte selon le type et les données
   */
  private getAlertDescription(type: string, data: any): string {
    switch (type) {
      case 'budget_exceeded':
        return `Vos dépenses ${data.category || 'ce mois'} dépassent le budget de ${Math.round(((data.amount - data.budget) / data.budget) * 100)}%`;
      case 'low_revenue':
        return `Vos revenus cette semaine sont ${Math.round(((data.average - data.amount) / data.average) * 100)}% inférieurs à la moyenne`;
      case 'payment_overdue':
        return `Une facture de ${this.formatCurrency(data.amount)} est en attente de paiement depuis ${data.daysOverdue} jours`;
      case 'goal_progress':
        return `Vous avez atteint ${Math.round((data.current / data.target) * 100)}% de votre objectif mensuel`;
      default:
        return 'Alerte système détectée';
    }
  }

  /**
   * Obtenir la sévérité de l'alerte selon le type et les données
   */
  private getAlertSeverity(type: string, data: any): 'low' | 'medium' | 'high' | 'critical' {
    switch (type) {
      case 'budget_exceeded':
        const budgetExcess = ((data.amount - data.budget) / data.budget) * 100;
        if (budgetExcess > 50) return 'critical';
        if (budgetExcess > 25) return 'high';
        if (budgetExcess > 10) return 'medium';
        return 'low';
      case 'low_revenue':
        const revenueDrop = ((data.average - data.amount) / data.average) * 100;
        if (revenueDrop > 50) return 'critical';
        if (revenueDrop > 30) return 'high';
        if (revenueDrop > 15) return 'medium';
        return 'low';
      case 'payment_overdue':
        if (data.daysOverdue > 30) return 'critical';
        if (data.daysOverdue > 14) return 'high';
        if (data.daysOverdue > 7) return 'medium';
        return 'low';
      case 'goal_progress':
        const progress = (data.current / data.target) * 100;
        if (progress < 25) return 'high';
        if (progress < 50) return 'medium';
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * Déterminer si une action est requise selon le type d'alerte
   */
  private isActionRequired(type: string): boolean {
    const actionRequiredTypes = ['budget_exceeded', 'payment_overdue'];
    return actionRequiredTypes.includes(type);
  }

  /**
   * Vérifier si une règle doit être déclenchée
   */
  private async shouldTriggerRule(rule: AlertRule, userId: string, recentAlerts: Alert[]): Promise<boolean> {
    // Vérifier le délai entre alertes (cooldown)
    const lastAlert = recentAlerts.find(alert => 
      alert.alert_rule?.id === rule.id && 
      alert.target_user === userId
    );
    
    if (lastAlert) {
      const lastAlertTime = new Date(lastAlert.triggered_at);
      const cooldownTime = new Date(lastAlertTime.getTime() + rule.cooldown_hours * 60 * 60 * 1000);
      if (new Date() < cooldownTime) {
        return false;
      }
    }

    // Vérifier le nombre maximum d'alertes par jour
    const todayAlerts = recentAlerts.filter(alert => {
      const alertDate = new Date(alert.triggered_at);
      const today = new Date();
      return alertDate.toDateString() === today.toDateString() && 
             alert.alert_rule?.id === rule.id;
    });
    
    if (todayAlerts.length >= rule.max_alerts_per_day) {
      return false;
    }

    // Ici, vous pouvez ajouter la logique spécifique pour chaque type de règle
    // Par exemple, vérifier les données financières, les seuils, etc.
    return true;
  }

  /**
   * Créer une alerte à partir d'une règle
   */
  // private async createAlertFromRule(rule: AlertRule, userId: string): Promise<Alert> {
  //   const alertData = {
  //     alert_type: rule.alert_type,
  //     title: rule.name,
  //     description: `Alerte automatique déclenchée par la règle: ${rule.name}`,
  //     severity: 'medium' as const,
  //     context_data: {
  //       rule_id: rule.id,
  //       trigger_type: rule.trigger_type,
  //       condition_field: rule.condition_field,
  //       condition_value: rule.condition_value,
  //     },
  //     action_required: false,
  //     target_user: userId,
  //   };

  //   return this.createAlert(alertData);
  // }

  /**
   * Formater une devise
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-SN', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  }
}

export default new AlertsService();
