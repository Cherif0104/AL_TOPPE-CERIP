#!/usr/bin/env python3
"""
📱 MODULE ALERTS & IA - SÉRIALISEURS
=====================================

Sérialiseurs Django REST Framework pour l'API
du module Alerts & IA
"""

from rest_framework import serializers
from .models import (
    AlertType, AlertRule, Alert, Notification, 
    AIModel, AIAnalysis, Recommendation
)


class AlertTypeSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les types d'alertes"""
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    
    class Meta:
        model = AlertType
        fields = [
            'id', 'name', 'category', 'category_display', 'description',
            'severity_levels', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AlertRuleSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les règles d'alertes"""
    alert_type_name = serializers.CharField(source='alert_type.name', read_only=True)
    trigger_type_display = serializers.CharField(source='get_trigger_type_display', read_only=True)
    condition_operator_display = serializers.CharField(source='get_condition_operator_display', read_only=True)
    
    class Meta:
        model = AlertRule
        fields = [
            'id', 'name', 'alert_type', 'alert_type_name', 'trigger_type', 'trigger_type_display',
            'condition_field', 'condition_operator', 'condition_operator_display', 'condition_value',
            'ai_model', 'confidence_threshold', 'is_active', 'cooldown_hours', 'max_alerts_per_day',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AlertSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les alertes"""
    alert_type_name = serializers.CharField(source='alert_type.name', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    target_user_phone = serializers.CharField(source='target_user.phone', read_only=True)
    target_user_name = serializers.CharField(source='target_user.get_full_name', read_only=True)
    alert_rule_name = serializers.CharField(source='alert_rule.name', read_only=True)
    acknowledged_by_phone = serializers.CharField(source='acknowledged_by.phone', read_only=True)
    resolved_by_phone = serializers.CharField(source='resolved_by.phone', read_only=True)
    
    class Meta:
        model = Alert
        fields = [
            'id', 'title', 'description', 'alert_type', 'alert_type_name', 'alert_rule', 'alert_rule_name',
            'severity', 'severity_display', 'status', 'status_display', 'target_user', 'target_user_phone',
            'target_user_name', 'related_entity_type', 'related_entity_id', 'context_data',
            'ai_confidence', 'ai_reasoning', 'acknowledged_by', 'acknowledged_by_phone', 'acknowledged_at',
            'resolved_by', 'resolved_by_phone', 'resolved_at', 'resolution_notes',
            'triggered_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'triggered_at', 'updated_at', 'acknowledged_at', 'resolved_at'
        ]


class AlertCreateSerializer(serializers.ModelSerializer):
    """Sérialiseur pour la création d'alertes"""
    
    class Meta:
        model = Alert
        fields = [
            'title', 'description', 'alert_type', 'alert_rule', 'severity', 'target_user',
            'related_entity_type', 'related_entity_id', 'context_data', 'ai_confidence', 'ai_reasoning'
        ]


class AlertUpdateSerializer(serializers.ModelSerializer):
    """Sérialiseur pour la mise à jour d'alertes"""
    
    class Meta:
        model = Alert
        fields = [
            'title', 'description', 'severity', 'status', 'ai_confidence', 'ai_reasoning',
            'resolution_notes'
        ]


class AlertSummarySerializer(serializers.ModelSerializer):
    """Sérialiseur pour le résumé des alertes"""
    alert_type_name = serializers.CharField(source='alert_type.name', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    target_user_name = serializers.CharField(source='target_user.get_full_name', read_only=True)
    
    class Meta:
        model = Alert
        fields = [
            'id', 'title', 'alert_type_name', 'severity_display', 'status_display',
            'target_user_name', 'triggered_at', 'ai_confidence'
        ]


class NotificationSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les notifications"""
    notification_type_display = serializers.CharField(source='get_notification_type_display', read_only=True)
    delivery_status_display = serializers.CharField(source='get_delivery_status_display', read_only=True)
    recipient_phone = serializers.CharField(source='recipient.phone', read_only=True)
    recipient_name = serializers.CharField(source='recipient.get_full_name', read_only=True)
    alert_title = serializers.CharField(source='alert.title', read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id', 'alert', 'alert_title', 'notification_type', 'notification_type_display',
            'title', 'message', 'action_url', 'action_text', 'recipient', 'recipient_phone',
            'recipient_name', 'delivery_status', 'delivery_status_display', 'sent_at',
            'delivered_at', 'delivery_error', 'open_count', 'click_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'sent_at', 'delivered_at',
            'open_count', 'click_count'
        ]


class NotificationCreateSerializer(serializers.ModelSerializer):
    """Sérialiseur pour la création de notifications"""
    
    class Meta:
        model = Notification
        fields = [
            'alert', 'notification_type', 'title', 'message', 'action_url', 'action_text', 'recipient'
        ]


class AIModelSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les modèles IA"""
    model_type_display = serializers.CharField(source='get_model_type_display', read_only=True)
    provider_display = serializers.CharField(source='get_provider_display', read_only=True)
    
    class Meta:
        model = AIModel
        fields = [
            'id', 'name', 'model_type', 'model_type_display', 'provider', 'provider_display',
            'model_version', 'api_endpoint', 'api_key_name', 'parameters', 'is_active',
            'accuracy', 'last_training', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_training']


class AIAnalysisSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les analyses IA"""
    analysis_type_display = serializers.CharField(source='get_analysis_type_display', read_only=True)
    ai_model_name = serializers.CharField(source='ai_model.name', read_only=True)
    target_user_phone = serializers.CharField(source='target_user.phone', read_only=True)
    target_user_name = serializers.CharField(source='target_user.get_full_name', read_only=True)
    
    class Meta:
        model = AIAnalysis
        fields = [
            'id', 'analysis_type', 'analysis_type_display', 'ai_model', 'ai_model_name',
            'target_user', 'target_user_phone', 'target_user_name', 'related_entity_type',
            'related_entity_id', 'input_data', 'analysis_result', 'confidence_score',
            'processing_time_ms', 'is_successful', 'error_message', 'created_at', 'completed_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'completed_at', 'processing_time_ms'
        ]


class AIAnalysisCreateSerializer(serializers.ModelSerializer):
    """Sérialiseur pour la création d'analyses IA"""
    
    class Meta:
        model = AIAnalysis
        fields = [
            'analysis_type', 'ai_model', 'target_user', 'related_entity_type',
            'related_entity_id', 'input_data'
        ]


class AIAnalysisSummarySerializer(serializers.ModelSerializer):
    """Sérialiseur pour le résumé des analyses IA"""
    analysis_type_display = serializers.CharField(source='get_analysis_type_display', read_only=True)
    ai_model_name = serializers.CharField(source='ai_model.name', read_only=True)
    target_user_name = serializers.CharField(source='target_user.get_full_name', read_only=True)
    
    class Meta:
        model = AIAnalysis
        fields = [
            'id', 'analysis_type_display', 'ai_model_name', 'target_user_name',
            'confidence_score', 'is_successful', 'created_at', 'completed_at'
        ]


class RecommendationSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les recommandations"""
    recommendation_type_display = serializers.CharField(source='get_recommendation_type_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    target_user_phone = serializers.CharField(source='target_user.phone', read_only=True)
    target_user_name = serializers.CharField(source='target_user.get_full_name', read_only=True)
    ai_analysis_type = serializers.CharField(source='ai_analysis.analysis_type', read_only=True)
    
    class Meta:
        model = Recommendation
        fields = [
            'id', 'title', 'description', 'recommendation_type', 'recommendation_type_display',
            'priority', 'priority_display', 'target_user', 'target_user_phone', 'target_user_name',
            'ai_analysis', 'ai_analysis_type', 'action_items', 'expected_impact',
            'implementation_steps', 'confidence_score', 'is_implemented', 'implemented_at',
            'implementation_notes', 'user_rating', 'user_feedback', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'implemented_at'
        ]


class RecommendationCreateSerializer(serializers.ModelSerializer):
    """Sérialiseur pour la création de recommandations"""
    
    class Meta:
        model = Recommendation
        fields = [
            'title', 'description', 'recommendation_type', 'priority', 'target_user',
            'ai_analysis', 'action_items', 'expected_impact', 'implementation_steps', 'confidence_score'
        ]


class RecommendationSummarySerializer(serializers.ModelSerializer):
    """Sérialiseur pour le résumé des recommandations"""
    recommendation_type_display = serializers.CharField(source='get_recommendation_type_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    target_user_name = serializers.CharField(source='target_user.get_full_name', read_only=True)
    
    class Meta:
        model = Recommendation
        fields = [
            'id', 'title', 'recommendation_type_display', 'priority_display',
            'target_user_name', 'confidence_score', 'is_implemented', 'created_at'
        ]


# Sérialiseurs spécialisés pour les tableaux de bord
class AlertDashboardSerializer(serializers.Serializer):
    """Sérialiseur pour le tableau de bord des alertes"""
    total_alerts = serializers.IntegerField()
    new_alerts = serializers.IntegerField()
    acknowledged_alerts = serializers.IntegerField()
    resolved_alerts = serializers.IntegerField()
    critical_alerts = serializers.IntegerField()
    alerts_by_type = serializers.DictField()
    alerts_by_severity = serializers.DictField()
    recent_alerts = AlertSummarySerializer(many=True)


class AIAnalysisDashboardSerializer(serializers.Serializer):
    """Sérialiseur pour le tableau de bord des analyses IA"""
    total_analyses = serializers.IntegerField()
    successful_analyses = serializers.IntegerField()
    failed_analyses = serializers.IntegerField()
    average_confidence = serializers.DecimalField(max_digits=5, decimal_places=2)
    analyses_by_type = serializers.DictField()
    recent_analyses = AIAnalysisSummarySerializer(many=True)


class RecommendationDashboardSerializer(serializers.Serializer):
    """Sérialiseur pour le tableau de bord des recommandations"""
    total_recommendations = serializers.IntegerField()
    implemented_recommendations = serializers.IntegerField()
    pending_recommendations = serializers.IntegerField()
    urgent_recommendations = serializers.IntegerField()
    recommendations_by_type = serializers.DictField()
    recommendations_by_priority = serializers.DictField()
    recent_recommendations = RecommendationSummarySerializer(many=True)


# Sérialiseurs pour les statistiques
class AlertStatisticsSerializer(serializers.Serializer):
    """Sérialiseur pour les statistiques des alertes"""
    period = serializers.CharField()
    total_alerts = serializers.IntegerField()
    alerts_by_status = serializers.DictField()
    alerts_by_severity = serializers.DictField()
    alerts_by_type = serializers.DictField()
    average_response_time_hours = serializers.DecimalField(max_digits=5, decimal_places=2)
    escalation_rate = serializers.DecimalField(max_digits=5, decimal_places=2)


class AIStatisticsSerializer(serializers.Serializer):
    """Sérialiseur pour les statistiques IA"""
    period = serializers.CharField()
    total_analyses = serializers.IntegerField()
    success_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    average_confidence = serializers.DecimalField(max_digits=5, decimal_places=2)
    average_processing_time_ms = serializers.IntegerField()
    analyses_by_model = serializers.DictField()
    analyses_by_type = serializers.DictField()
