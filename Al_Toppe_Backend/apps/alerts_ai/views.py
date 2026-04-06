#!/usr/bin/env python3
"""
📱 MODULE ALERTS & IA - VUES API
=================================

Vues Django REST Framework pour l'API
du module Alerts & IA
"""

from rest_framework import viewsets, generics, status, filters
from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Q, Avg, F
from django.utils import timezone
from datetime import timedelta
import time

from .models import (
    AlertType, AlertRule, Alert, Notification, 
    AIModel, AIAnalysis, Recommendation
)
from .serializers import (
    AlertTypeSerializer, AlertRuleSerializer, AlertSerializer, AlertCreateSerializer, AlertUpdateSerializer,
    AlertSummarySerializer, NotificationSerializer, NotificationCreateSerializer, AIModelSerializer,
    AIAnalysisSerializer, AIAnalysisCreateSerializer, AIAnalysisSummarySerializer,
    RecommendationSerializer, RecommendationCreateSerializer, RecommendationSummarySerializer,
    AlertDashboardSerializer, AIAnalysisDashboardSerializer, RecommendationDashboardSerializer,
    AlertStatisticsSerializer, AIStatisticsSerializer
)


# ============================================================================
# TYPES D'ALERTES
# ============================================================================

class AlertTypeListView(generics.ListCreateAPIView):
    """Liste et création des types d'alertes"""
    queryset = AlertType.objects.filter(is_active=True)
    serializer_class = AlertTypeSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'category', 'created_at']
    ordering = ['category', 'name']


class AlertTypeDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Détail, modification et suppression d'un type d'alerte"""
    queryset = AlertType.objects.all()
    serializer_class = AlertTypeSerializer
    permission_classes = [IsAuthenticated]


# ============================================================================
# RÈGLES D'ALERTES
# ============================================================================

class AlertRuleListView(generics.ListCreateAPIView):
    """Liste et création des règles d'alertes"""
    queryset = AlertRule.objects.filter(is_active=True)
    serializer_class = AlertRuleSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['alert_type', 'trigger_type', 'is_active']
    search_fields = ['name', 'condition_field']
    ordering_fields = ['name', 'trigger_type', 'created_at']
    ordering = ['alert_type', 'name']


class AlertRuleDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Détail, modification et suppression d'une règle d'alerte"""
    queryset = AlertRule.objects.all()
    serializer_class = AlertRuleSerializer
    permission_classes = [IsAuthenticated]


# ============================================================================
# ALERTES
# ============================================================================

class AlertListView(generics.ListCreateAPIView):
    """Liste et création des alertes"""
    queryset = Alert.objects.all()
    serializer_class = AlertSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['alert_type', 'severity', 'status', 'target_user']
    search_fields = ['title', 'description']
    ordering_fields = ['triggered_at', 'severity', 'status', 'ai_confidence']
    ordering = ['-triggered_at']
    
    def get_queryset(self):
        """Filtrer les alertes par utilisateur connecté sauf pour admin/coach"""
        queryset = Alert.objects.all()
        
        # Si l'utilisateur n'est pas admin ou coach, filtrer par son ID
        if self.request.user.role not in ['admin', 'coach']:
            queryset = queryset.filter(target_user=self.request.user)
        # Si un target_user est spécifié dans les query params, l'utiliser (pour admin/coach)
        elif 'target_user' in self.request.query_params:
            target_user_id = self.request.query_params.get('target_user')
            if target_user_id:
                queryset = queryset.filter(target_user_id=target_user_id)
        
        return queryset
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return AlertCreateSerializer
        return AlertSerializer


class AlertDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Détail, modification et suppression d'une alerte"""
    queryset = Alert.objects.all()
    serializer_class = AlertSerializer
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return AlertUpdateSerializer
        return AlertSerializer


class UserAlertListView(generics.ListAPIView):
    """Liste des alertes d'un utilisateur spécifique"""
    serializer_class = AlertSummarySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['alert_type', 'severity', 'status']
    ordering_fields = ['triggered_at', 'severity', 'status']
    ordering = ['-triggered_at']
    
    def get_queryset(self):
        user_id = self.kwargs.get('user_id')
        return Alert.objects.filter(target_user_id=user_id)


# ============================================================================
# NOTIFICATIONS
# ============================================================================

class NotificationListView(generics.ListCreateAPIView):
    """Liste et création des notifications"""
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['notification_type', 'delivery_status', 'recipient']
    search_fields = ['title', 'message']
    ordering_fields = ['created_at', 'delivery_status']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return NotificationCreateSerializer
        return NotificationSerializer

# ============================================================================
# VÉRIFICATION DU RATIO DÉPENSES/REVENUS
# ============================================================================


class NotificationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Détail, modification et suppression d'une notification"""
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]


class UserNotificationListView(generics.ListAPIView):
    """Liste des notifications d'un utilisateur spécifique"""
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['notification_type', 'delivery_status']
    ordering_fields = ['created_at', 'delivery_status']
    ordering = ['-created_at']
    
    def get_queryset(self):
        user_id = self.kwargs.get('user_id')
        return Notification.objects.filter(recipient_id=user_id)


# ============================================================================
# MODÈLES IA
# ============================================================================

class AIModelListView(generics.ListCreateAPIView):
    """Liste et création des modèles IA"""
    queryset = AIModel.objects.filter(is_active=True)
    serializer_class = AIModelSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['model_type', 'provider', 'is_active']
    search_fields = ['name', 'model_version']
    ordering_fields = ['name', 'model_type', 'accuracy']
    ordering = ['model_type', 'name']


class AIModelDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Détail, modification et suppression d'un modèle IA"""
    queryset = AIModel.objects.all()
    serializer_class = AIModelSerializer
    permission_classes = [IsAuthenticated]


# ============================================================================
# ANALYSES IA
# ============================================================================

class AIAnalysisListView(generics.ListCreateAPIView):
    """Liste et création des analyses IA"""
    queryset = AIAnalysis.objects.all()
    serializer_class = AIAnalysisSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['analysis_type', 'ai_model', 'is_successful', 'target_user']
    search_fields = ['target_user__phone']
    ordering_fields = ['created_at', 'confidence_score', 'processing_time_ms']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return AIAnalysisCreateSerializer
        return AIAnalysisSerializer


class AIAnalysisDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Détail, modification et suppression d'une analyse IA"""
    queryset = AIAnalysis.objects.all()
    serializer_class = AIAnalysisSerializer
    permission_classes = [IsAuthenticated]


class UserAIAnalysisListView(generics.ListAPIView):
    """Liste des analyses IA d'un utilisateur spécifique"""
    serializer_class = AIAnalysisSummarySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['analysis_type', 'is_successful']
    ordering_fields = ['created_at', 'confidence_score']
    ordering = ['-created_at']
    
    def get_queryset(self):
        user_id = self.kwargs.get('user_id')
        return AIAnalysis.objects.filter(target_user_id=user_id)


# ============================================================================
# RECOMMANDATIONS
# ============================================================================

class RecommendationListView(generics.ListCreateAPIView):
    """Liste et création des recommandations"""
    queryset = Recommendation.objects.all()
    serializer_class = RecommendationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['recommendation_type', 'priority', 'is_implemented', 'target_user']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'priority', 'confidence_score']
    ordering = ['-priority', '-created_at']
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return RecommendationCreateSerializer
        return RecommendationSerializer


class RecommendationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Détail, modification et suppression d'une recommandation"""
    queryset = Recommendation.objects.all()
    serializer_class = RecommendationSerializer
    permission_classes = [IsAuthenticated]


class UserRecommendationListView(generics.ListAPIView):
    """Liste des recommandations d'un utilisateur spécifique"""
    serializer_class = RecommendationSummarySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['recommendation_type', 'priority', 'is_implemented']
    ordering_fields = ['created_at', 'priority', 'confidence_score']
    ordering = ['-priority', '-created_at']
    
    def get_queryset(self):
        user_id = self.kwargs.get('user_id')
        return Recommendation.objects.filter(target_user_id=user_id)


# ============================================================================
# TABLEAUX DE BORD
# ============================================================================

class AlertDashboardView(generics.ListAPIView):
    """Tableau de bord des alertes"""
    serializer_class = AlertDashboardSerializer
    permission_classes = [IsAuthenticated]
    
    def get(self, request, *args, **kwargs):
        # Filtrer par utilisateur connecté sauf pour admin/coach
        if request.user.role not in ['admin', 'coach']:
            alerts_queryset = Alert.objects.filter(target_user=request.user)
        else:
            # Pour admin/coach, permettre de voir toutes les alertes ou filtrer par target_user si fourni
            target_user_id = request.query_params.get('target_user')
            if target_user_id:
                alerts_queryset = Alert.objects.filter(target_user_id=target_user_id)
            else:
                alerts_queryset = Alert.objects.all()
        
        # Calculer les statistiques
        total_alerts = alerts_queryset.count()
        new_alerts = alerts_queryset.filter(status='new').count()
        acknowledged_alerts = alerts_queryset.filter(status='acknowledged').count()
        resolved_alerts = alerts_queryset.filter(status='resolved').count()
        critical_alerts = alerts_queryset.filter(severity='critical').count()
        
        # Alertes par type
        alerts_by_type = alerts_queryset.values('alert_type__name').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Alertes par sévérité
        alerts_by_severity = alerts_queryset.values('severity').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Alertes récentes
        recent_alerts = alerts_queryset.order_by('-triggered_at')[:10]
        
        dashboard_data = {
            'total_alerts': total_alerts,
            'new_alerts': new_alerts,
            'acknowledged_alerts': acknowledged_alerts,
            'resolved_alerts': resolved_alerts,
            'critical_alerts': critical_alerts,
            'alerts_by_type': {item['alert_type__name']: item['count'] for item in alerts_by_type},
            'alerts_by_severity': {item['severity']: item['count'] for item in alerts_by_severity},
            'recent_alerts': AlertSummarySerializer(recent_alerts, many=True).data
        }
        
        serializer = AlertDashboardSerializer(dashboard_data)
        return Response(serializer.data)


class AIAnalysisDashboardView(generics.ListAPIView):
    """Tableau de bord des analyses IA"""
    serializer_class = AIAnalysisDashboardSerializer
    permission_classes = [IsAuthenticated]
    
    def get(self, request, *args, **kwargs):
        # Calculer les statistiques
        total_analyses = AIAnalysis.objects.count()
        successful_analyses = AIAnalysis.objects.filter(is_successful=True).count()
        failed_analyses = AIAnalysis.objects.filter(is_successful=False).count()
        average_confidence = AIAnalysis.objects.filter(is_successful=True).aggregate(
            avg_confidence=Avg('confidence_score')
        )['avg_confidence'] or 0
        
        # Analyses par type
        analyses_by_type = AIAnalysis.objects.values('analysis_type').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Analyses récentes
        recent_analyses = AIAnalysis.objects.order_by('-created_at')[:10]
        
        dashboard_data = {
            'total_analyses': total_analyses,
            'successful_analyses': successful_analyses,
            'failed_analyses': failed_analyses,
            'average_confidence': average_confidence,
            'analyses_by_type': {item['analysis_type']: item['count'] for item in analyses_by_type},
            'recent_analyses': AIAnalysisSummarySerializer(recent_analyses, many=True).data
        }
        
        serializer = AIAnalysisDashboardSerializer(dashboard_data)
        return Response(serializer.data)


class RecommendationDashboardView(generics.ListAPIView):
    """Tableau de bord des recommandations"""
    serializer_class = RecommendationDashboardSerializer
    permission_classes = [IsAuthenticated]
    
    def get(self, request, *args, **kwargs):
        # Calculer les statistiques
        total_recommendations = Recommendation.objects.count()
        implemented_recommendations = Recommendation.objects.filter(is_implemented=True).count()
        pending_recommendations = Recommendation.objects.filter(is_implemented=False).count()
        urgent_recommendations = Recommendation.objects.filter(priority='urgent').count()
        
        # Recommandations par type
        recommendations_by_type = Recommendation.objects.values('recommendation_type').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Recommandations par priorité
        recommendations_by_priority = Recommendation.objects.values('priority').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Recommandations récentes
        recent_recommendations = Recommendation.objects.order_by('-created_at')[:10]
        
        dashboard_data = {
            'total_recommendations': total_recommendations,
            'implemented_recommendations': implemented_recommendations,
            'pending_recommendations': pending_recommendations,
            'urgent_recommendations': urgent_recommendations,
            'recommendations_by_type': {item['recommendation_type']: item['count'] for item in recommendations_by_type},
            'recommendations_by_priority': {item['priority']: item['count'] for item in recommendations_by_priority},
            'recent_recommendations': RecommendationSummarySerializer(recent_recommendations, many=True).data
        }
        
        serializer = RecommendationDashboardSerializer(dashboard_data)
        return Response(serializer.data)


# ============================================================================
# STATISTIQUES
# ============================================================================

@api_view(['GET'])
def alert_statistics(request):
    """Statistiques détaillées des alertes"""
    period = request.GET.get('period', '30d')
    
    # Calculer la période
    if period == '7d':
        start_date = timezone.now() - timedelta(days=7)
    elif period == '30d':
        start_date = timezone.now() - timedelta(days=30)
    elif period == '90d':
        start_date = timezone.now() - timedelta(days=90)
    else:
        start_date = timezone.now() - timedelta(days=30)
    
    # Filtrer les alertes de la période
    alerts = Alert.objects.filter(triggered_at__gte=start_date)
    
    # Calculer les statistiques
    total_alerts = alerts.count()
    alerts_by_status = alerts.values('status').annotate(count=Count('id'))
    alerts_by_severity = alerts.values('severity').annotate(count=Count('id'))
    alerts_by_type = alerts.values('alert_type__name').annotate(count=Count('id'))
    
    # Temps de réponse moyen (pour les alertes résolues)
    resolved_alerts = alerts.filter(status='resolved')
    if resolved_alerts.exists():
        response_times = []
        for alert in resolved_alerts:
            if alert.acknowledged_at and alert.triggered_at:
                response_time = (alert.acknowledged_at - alert.triggered_at).total_seconds() / 3600
                response_times.append(response_time)
        
        if response_times:
            average_response_time = sum(response_times) / len(response_times)
        else:
            average_response_time = 0
    else:
        average_response_time = 0
    
    # Taux d'escalade
    escalated_alerts = alerts.filter(status='escalated').count()
    escalation_rate = (escalated_alerts / total_alerts * 100) if total_alerts > 0 else 0
    
    statistics_data = {
        'period': period,
        'total_alerts': total_alerts,
        'alerts_by_status': {item['status']: item['count'] for item in alerts_by_status},
        'alerts_by_severity': {item['severity']: item['count'] for item in alerts_by_severity},
        'alerts_by_type': {item['alert_type__name']: item['count'] for item in alerts_by_type},
        'average_response_time_hours': round(average_response_time, 2),
        'escalation_rate': round(escalation_rate, 2)
    }
    
    serializer = AlertStatisticsSerializer(statistics_data)
    return Response(serializer.data)


@api_view(['GET'])
def ai_statistics(request):
    """Statistiques détaillées de l'IA"""
    period = request.GET.get('period', '30d')
    
    # Calculer la période
    if period == '7d':
        start_date = timezone.now() - timedelta(days=7)
    elif period == '30d':
        start_date = timezone.now() - timedelta(days=30)
    elif period == '90d':
        start_date = timezone.now() - timedelta(days=90)
    else:
        start_date = timezone.now() - timedelta(days=30)
    
    # Filtrer les analyses de la période
    analyses = AIAnalysis.objects.filter(created_at__gte=start_date)
    
    # Calculer les statistiques
    total_analyses = analyses.count()
    successful_analyses = analyses.filter(is_successful=True).count()
    success_rate = (successful_analyses / total_analyses * 100) if total_analyses > 0 else 0
    
    # Score de confiance moyen
    if successful_analyses > 0:
        average_confidence = analyses.filter(is_successful=True).aggregate(
            avg_confidence=Avg('confidence_score')
        )['avg_confidence'] or 0
    else:
        average_confidence = 0
    
    # Temps de traitement moyen
    if successful_analyses > 0:
        average_processing_time = analyses.filter(is_successful=True).aggregate(
            avg_time=Avg('processing_time_ms')
        )['avg_time'] or 0
    else:
        average_processing_time = 0
    
    # Analyses par modèle
    analyses_by_model = analyses.values('ai_model__name').annotate(count=Count('id'))
    
    # Analyses par type
    analyses_by_type = analyses.values('analysis_type').annotate(count=Count('id'))
    
    statistics_data = {
        'period': period,
        'total_analyses': total_analyses,
        'success_rate': round(success_rate, 2),
        'average_confidence': round(average_confidence, 2),
        'average_processing_time_ms': int(average_processing_time),
        'analyses_by_model': {item['ai_model__name']: item['count'] for item in analyses_by_model},
        'analyses_by_type': {item['analysis_type']: item['count'] for item in analyses_by_type}
    }
    
    serializer = AIStatisticsSerializer(statistics_data)
    return Response(serializer.data)


# ============================================================================
# ACTIONS SPÉCIALISÉES
# ============================================================================

@api_view(['POST'])
def acknowledge_alert(request, alert_id):
    """Reconnaître une alerte"""
    try:
        alert = Alert.objects.get(id=alert_id)
        alert.acknowledge(request.user)
        return Response({'message': 'Alerte reconnue avec succès'}, status=status.HTTP_200_OK)
    except Alert.DoesNotExist:
        return Response({'error': 'Alerte non trouvée'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
def resolve_alert(request, alert_id):
    """Résoudre une alerte"""
    try:
        alert = Alert.objects.get(id=alert_id)
        notes = request.data.get('notes', '')
        alert.resolve(request.user, notes)
        return Response({'message': 'Alerte résolue avec succès'}, status=status.HTTP_200_OK)
    except Alert.DoesNotExist:
        return Response({'error': 'Alerte non trouvée'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
def dismiss_alert(request, alert_id):
    """Ignorer une alerte"""
    try:
        alert = Alert.objects.get(id=alert_id)
        alert.dismiss(request.user)
        return Response({'message': 'Alerte ignorée avec succès'}, status=status.HTTP_200_OK)
    except Alert.DoesNotExist:
        return Response({'error': 'Alerte non trouvée'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
def run_ai_analysis(request):
    """Lancer une analyse IA"""
    serializer = AIAnalysisCreateSerializer(data=request.data)
    if serializer.is_valid():
        # Simuler le traitement IA
        start_time = time.time()
        
        # Créer l'analyse
        analysis = serializer.save()
        
        # Simuler le traitement
        import random
        processing_time = random.randint(100, 2000)  # 100ms à 2s
        confidence = random.randint(60, 95)  # 60% à 95%
        
        # Marquer comme terminée
        analysis.mark_as_completed(
            result={'simulation': True, 'confidence': confidence},
            confidence=confidence,
            processing_time=processing_time,
            success=True
        )
        
        return Response({
            'message': 'Analyse IA lancée avec succès',
            'analysis_id': analysis.id,
            'processing_time_ms': processing_time,
            'confidence_score': confidence
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def mark_recommendation_implemented(request, recommendation_id):
    """Marquer une recommandation comme implémentée"""
    try:
        recommendation = Recommendation.objects.get(id=recommendation_id)
        notes = request.data.get('notes', '')
        recommendation.mark_as_implemented(notes)
        return Response({'message': 'Recommandation marquée comme implémentée'}, status=status.HTTP_200_OK)
    except Recommendation.DoesNotExist:
        return Response({'error': 'Recommandation non trouvée'}, status=status.HTTP_404_NOT_FOUND)


# ============================================================================
# TABLEAU DE BORD UTILISATEUR
# ============================================================================

class UserDashboardView(generics.ListAPIView):
    """Tableau de bord combiné pour un utilisateur"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, user_id):
        """Récupérer le tableau de bord complet d'un utilisateur"""
        try:
            # Récupérer les données de l'utilisateur
            from apps.accounts.models import User
            user = User.objects.get(id=user_id)
            
            # Alertes de l'utilisateur
            user_alerts = Alert.objects.filter(target_user=user).order_by('-triggered_at')[:5]
            
            # Analyses IA de l'utilisateur
            user_analyses = AIAnalysis.objects.filter(target_user=user).order_by('-created_at')[:5]
            
            # Recommandations de l'utilisateur
            user_recommendations = Recommendation.objects.filter(target_user=user).order_by('-created_at')[:5]
            
            # Statistiques résumées
            dashboard_data = {
                'user': {
                    'id': str(user.id),
                    'phone': user.phone,
                    'full_name': user.get_full_name()
                },
                'alerts': {
                    'total': Alert.objects.filter(target_user=user).count(),
                    'new': Alert.objects.filter(target_user=user, status='new').count(),
                    'recent': AlertSummarySerializer(user_alerts, many=True).data
                },
                'ai_analyses': {
                    'total': AIAnalysis.objects.filter(target_user=user).count(),
                    'successful': AIAnalysis.objects.filter(target_user=user, is_successful=True).count(),
                    'recent': AIAnalysisSummarySerializer(user_analyses, many=True).data
                },
                'recommendations': {
                    'total': Recommendation.objects.filter(target_user=user).count(),
                    'implemented': Recommendation.objects.filter(target_user=user, is_implemented=True).count(),
                    'urgent': Recommendation.objects.filter(target_user=user, priority='urgent').count(),
                    'recent': RecommendationSummarySerializer(user_recommendations, many=True).data
                }
            }
            
            return Response(dashboard_data)
            
        except User.DoesNotExist:
            return Response({'error': 'Utilisateur non trouvé'}, status=status.HTTP_404_NOT_FOUND)
