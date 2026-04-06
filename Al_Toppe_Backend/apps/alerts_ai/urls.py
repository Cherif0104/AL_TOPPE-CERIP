#!/usr/bin/env python3
"""
📱 MODULE ALERTS & IA - ROUTES API
===================================

Configuration des URLs pour l'API du module Alerts & IA
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'alerts_ai'


# Router pour les vues basées sur les ViewSets (si nécessaire)
router = DefaultRouter()

# URLs du module Alerts & IA
urlpatterns = [
    # ============================================================================
    # TYPES D'ALERTES
    # ============================================================================
    path('alert-types/', views.AlertTypeListView.as_view(), name='alert-types'),
    path('alert-types/<uuid:pk>/', views.AlertTypeDetailView.as_view(), name='alert-type-detail'),
    
    # ============================================================================
    # RÈGLES D'ALERTES
    # ============================================================================
    path('alert-rules/', views.AlertRuleListView.as_view(), name='alert-rules'),
    path('alert-rules/<uuid:pk>/', views.AlertRuleDetailView.as_view(), name='alert-rule-detail'),
    
    # ============================================================================
    # ALERTES
    # ============================================================================
    path('alerts/', views.AlertListView.as_view(), name='alerts'),
    path('alerts/<uuid:pk>/', views.AlertDetailView.as_view(), name='alert-detail'),
    
    # Alertes par utilisateur
    path('users/<uuid:user_id>/alerts/', views.UserAlertListView.as_view(), name='user-alerts'),
    
    # Actions sur les alertes
    path('alerts/<uuid:alert_id>/acknowledge/', views.acknowledge_alert, name='acknowledge-alert'),
    path('alerts/<uuid:alert_id>/resolve/', views.resolve_alert, name='resolve-alert'),
    path('alerts/<uuid:alert_id>/dismiss/', views.dismiss_alert, name='dismiss-alert'),
    
    # ============================================================================
    # NOTIFICATIONS
    # ============================================================================
    path('notifications/', views.NotificationListView.as_view(), name='notifications'),
    path('notifications/<uuid:pk>/', views.NotificationDetailView.as_view(), name='notification-detail'),
    
    # Notifications par utilisateur
    path('users/<uuid:user_id>/notifications/', views.UserNotificationListView.as_view(), name='user-notifications'),
    
    # ============================================================================
    # MODÈLES IA
    # ============================================================================
    path('ai-models/', views.AIModelListView.as_view(), name='ai-models'),
    path('ai-models/<uuid:pk>/', views.AIModelDetailView.as_view(), name='ai-model-detail'),
    
    # ============================================================================
    # ANALYSES IA
    # ============================================================================
    path('ai-analyses/', views.AIAnalysisListView.as_view(), name='ai-analyses'),
    path('ai-analyses/<uuid:pk>/', views.AIAnalysisDetailView.as_view(), name='ai-analysis-detail'),
    
    # Analyses par utilisateur
    path('users/<uuid:user_id>/ai-analyses/', views.UserAIAnalysisListView.as_view(), name='user-ai-analyses'),
    
    # Lancer une analyse IA
    path('ai-analyses/run/', views.run_ai_analysis, name='run-ai-analysis'),
    
    # ============================================================================
    # RECOMMANDATIONS
    # ============================================================================
    path('recommendations/', views.RecommendationListView.as_view(), name='recommendations'),
    path('recommendations/<uuid:pk>/', views.RecommendationDetailView.as_view(), name='recommendation-detail'),
    
    # Recommandations par utilisateur
    path('users/<uuid:user_id>/recommendations/', views.UserRecommendationListView.as_view(), name='user-recommendations'),
    
    # Marquer comme implémentée
    path('recommendations/<uuid:recommendation_id>/implement/', views.mark_recommendation_implemented, name='implement-recommendation'),
    
    # ============================================================================
    # TABLEAUX DE BORD
    # ============================================================================
    path('dashboard/', views.AlertDashboardView.as_view(), name='alerts-dashboard'),
    path('dashboard/ai-analyses/', views.AIAnalysisDashboardView.as_view(), name='ai-analyses-dashboard'),
    path('dashboard/recommendations/', views.RecommendationDashboardView.as_view(), name='recommendations-dashboard'),
    
    # ============================================================================
    # STATISTIQUES
    # ============================================================================
    path('statistics/alerts/', views.alert_statistics, name='alert-statistics'),
    path('statistics/ai/', views.ai_statistics, name='ai-statistics'),
    
    # ============================================================================
    # ROUTES UTILISATEUR
    # ============================================================================
    # Tableau de bord utilisateur (combine toutes les données)
    path('users/<uuid:user_id>/dashboard/', views.UserDashboardView.as_view(), name='user-dashboard'),
    
    # Inclure les routes du router si nécessaire
    path('api/', include(router.urls)),
]
