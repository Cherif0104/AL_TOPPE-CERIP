#!/usr/bin/env python3
"""
📱 MODULE ALERTS & IA - ADMINISTRATION
======================================

Configuration de l'interface d'administration Django
pour tous les modèles du module Alerts & IA
"""

from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import (
    AlertType, AlertRule, Alert, Notification, 
    AIModel, AIAnalysis, Recommendation
)
from django.utils import timezone


@admin.register(AlertType)
class AlertTypeAdmin(admin.ModelAdmin):
    """Administration des types d'alertes"""
    list_display = ['name', 'category', 'is_active', 'created_at']
    list_filter = ['category', 'is_active', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Informations générales', {
            'fields': ('name', 'category', 'description', 'is_active')
        }),
        ('Configuration', {
            'fields': ('severity_levels',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(AlertRule)
class AlertRuleAdmin(admin.ModelAdmin):
    """Administration des règles d'alertes"""
    list_display = ['name', 'alert_type', 'trigger_type', 'is_active', 'created_at']
    list_filter = ['alert_type', 'trigger_type', 'is_active', 'created_at']
    search_fields = ['name', 'condition_field']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Informations générales', {
            'fields': ('name', 'alert_type', 'trigger_type', 'is_active')
        }),
        ('Conditions de déclenchement', {
            'fields': ('condition_field', 'condition_operator', 'condition_value')
        }),
        ('Paramètres IA', {
            'fields': ('ai_model', 'confidence_threshold')
        }),
        ('Configuration des alertes', {
            'fields': ('cooldown_hours', 'max_alerts_per_day')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    """Administration des alertes"""
    list_display = [
        'title', 'alert_type', 'severity', 'status', 'target_user', 
        'triggered_at', 'ai_confidence_display'
    ]
    list_filter = [
        'alert_type', 'severity', 'status', 'triggered_at', 
        'acknowledged_at', 'resolved_at'
    ]
    search_fields = ['title', 'description', 'target_user__phone']
    readonly_fields = [
        'triggered_at', 'updated_at', 'ai_confidence_display', 
        'related_entity_link'
    ]
    date_hierarchy = 'triggered_at'
    
    fieldsets = (
        ('Informations générales', {
            'fields': ('title', 'description', 'alert_type', 'alert_rule', 'severity', 'status')
        }),
        ('Contexte', {
            'fields': ('target_user', 'related_entity_type', 'related_entity_id', 'context_data')
        }),
        ('Intelligence artificielle', {
            'fields': ('ai_confidence', 'ai_reasoning')
        }),
        ('Gestion', {
            'fields': ('acknowledged_by', 'acknowledged_at', 'resolved_by', 'resolved_at', 'resolution_notes')
        }),
        ('Timestamps', {
            'fields': ('triggered_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def ai_confidence_display(self, obj):
        """Affichage du score de confiance IA"""
        if obj.ai_confidence:
            color = 'green' if obj.ai_confidence >= 80 else 'orange' if obj.ai_confidence >= 60 else 'red'
            return format_html(
                '<span style="color: {};">{}%</span>',
                color, obj.ai_confidence
            )
        return '-'
    ai_confidence_display.short_description = 'Confiance IA'
    
    def related_entity_link(self, obj):
        """Lien vers l'entité liée"""
        if obj.related_entity_type and obj.related_entity_id:
            try:
                # Construire le lien vers l'entité liée
                app_label = obj.related_entity_type.lower()
                url = reverse(f'admin:{app_label}_{obj.related_entity_type.lower()}_change', args=[obj.related_entity_id])
                return format_html('<a href="{}">{}</a>', url, obj.related_entity_id)
            except:
                return obj.related_entity_id
        return '-'
    related_entity_link.short_description = 'Entité liée'
    
    actions = ['acknowledge_alerts', 'resolve_alerts', 'dismiss_alerts']
    
    def acknowledge_alerts(self, request, queryset):
        """Action pour reconnaître les alertes sélectionnées"""
        count = queryset.update(
            status='acknowledged',
            acknowledged_by=request.user,
            acknowledged_at=timezone.now()
        )
        self.message_user(request, f'{count} alerte(s) marquée(s) comme reconnue(s).')
    acknowledge_alerts.short_description = "Marquer comme reconnues"
    
    def resolve_alerts(self, request, queryset):
        """Action pour résoudre les alertes sélectionnées"""
        count = queryset.update(
            status='resolved',
            resolved_by=request.user,
            resolved_at=timezone.now()
        )
        self.message_user(request, f'{count} alerte(s) marquée(s) comme résolue(s).')
    resolve_alerts.short_description = "Marquer comme résolues"
    
    def dismiss_alerts(self, request, queryset):
        """Action pour ignorer les alertes sélectionnées"""
        count = queryset.update(
            status='dismissed',
            acknowledged_by=request.user,
            acknowledged_at=timezone.now()
        )
        self.message_user(request, f'{count} alerte(s) marquée(s) comme ignorée(s).')
    dismiss_alerts.short_description = "Marquer comme ignorées"


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """Administration des notifications"""
    list_display = [
        'title', 'notification_type', 'recipient', 'delivery_status', 
        'created_at', 'delivery_metrics'
    ]
    list_filter = [
        'notification_type', 'delivery_status', 'created_at', 
        'sent_at', 'delivered_at'
    ]
    search_fields = ['title', 'message', 'recipient__phone']
    readonly_fields = ['created_at', 'updated_at', 'delivery_metrics']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Informations générales', {
            'fields': ('alert', 'notification_type', 'title', 'message')
        }),
        ('Actions', {
            'fields': ('action_url', 'action_text')
        }),
        ('Destinataire', {
            'fields': ('recipient',)
        }),
        ('Statut de livraison', {
            'fields': ('delivery_status', 'sent_at', 'delivered_at', 'delivery_error')
        }),
        ('Métriques', {
            'fields': ('open_count', 'click_count')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def delivery_metrics(self, obj):
        """Affichage des métriques de livraison"""
        return format_html(
            '📱 {} | 🖱️ {}',
            obj.open_count, obj.click_count
        )
    delivery_metrics.short_description = 'Métriques'


@admin.register(AIModel)
class AIModelAdmin(admin.ModelAdmin):
    """Administration des modèles IA"""
    list_display = [
        'name', 'model_type', 'provider', 'model_version', 
        'is_active', 'accuracy_display', 'last_training'
    ]
    list_filter = ['model_type', 'provider', 'is_active', 'last_training']
    search_fields = ['name', 'model_version']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Informations générales', {
            'fields': ('name', 'model_type', 'provider', 'model_version', 'is_active')
        }),
        ('Configuration', {
            'fields': ('api_endpoint', 'api_key_name', 'parameters')
        }),
        ('Performance', {
            'fields': ('accuracy', 'last_training')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def accuracy_display(self, obj):
        """Affichage de la précision"""
        if obj.accuracy:
            color = 'green' if obj.accuracy >= 90 else 'orange' if obj.accuracy >= 70 else 'red'
            return format_html(
                '<span style="color: {};">{}%</span>',
                color, obj.accuracy
            )
        return '-'
    accuracy_display.short_description = 'Précision'


@admin.register(AIAnalysis)
class AIAnalysisAdmin(admin.ModelAdmin):
    """Administration des analyses IA"""
    list_display = [
        'analysis_type', 'ai_model', 'target_user', 'confidence_score_display',
        'is_successful', 'processing_time_display', 'created_at'
    ]
    list_filter = [
        'analysis_type', 'ai_model', 'is_successful', 'created_at', 'completed_at'
    ]
    search_fields = ['target_user__phone', 'analysis_type']
    readonly_fields = [
        'created_at', 'completed_at', 'confidence_score_display', 
        'processing_time_display', 'related_entity_link'
    ]
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Informations générales', {
            'fields': ('analysis_type', 'ai_model', 'target_user')
        }),
        ('Contexte', {
            'fields': ('related_entity_type', 'related_entity_id')
        }),
        ('Données', {
            'fields': ('input_data', 'analysis_result')
        }),
        ('Métriques', {
            'fields': ('confidence_score', 'processing_time_ms')
        }),
        ('Statut', {
            'fields': ('is_successful', 'error_message', 'completed_at')
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    def confidence_score_display(self, obj):
        """Affichage du score de confiance"""
        if obj.confidence_score:
            color = 'green' if obj.confidence_score >= 80 else 'orange' if obj.confidence_score >= 60 else 'red'
            return format_html(
                '<span style="color: {};">{}%</span>',
                color, obj.confidence_score
            )
        return '-'
    confidence_score_display.short_description = 'Confiance'
    
    def processing_time_display(self, obj):
        """Affichage du temps de traitement"""
        if obj.processing_time_ms:
            if obj.processing_time_ms < 1000:
                return f"{obj.processing_time_ms}ms"
            else:
                return f"{obj.processing_time_ms/1000:.1f}s"
        return '-'
    processing_time_display.short_description = 'Temps de traitement'
    
    def related_entity_link(self, obj):
        """Lien vers l'entité liée"""
        if obj.related_entity_type and obj.related_entity_id:
            try:
                app_label = obj.related_entity_type.lower()
                url = reverse(f'admin:{app_label}_{obj.related_entity_type.lower()}_change', args=[obj.related_entity_id])
                return format_html('<a href="{}">{}</a>', url, obj.related_entity_id)
            except:
                return obj.related_entity_id
        return '-'
    related_entity_link.short_description = 'Entité liée'


@admin.register(Recommendation)
class RecommendationAdmin(admin.ModelAdmin):
    """Administration des recommandations"""
    list_display = [
        'title', 'recommendation_type', 'priority', 'target_user',
        'confidence_score_display', 'is_implemented', 'user_rating_display', 'created_at'
    ]
    list_filter = [
        'recommendation_type', 'priority', 'is_implemented', 'created_at'
    ]
    search_fields = ['title', 'description', 'target_user__phone']
    readonly_fields = [
        'created_at', 'updated_at', 'confidence_score_display', 
        'user_rating_display', 'ai_analysis_link'
    ]
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Informations générales', {
            'fields': ('title', 'description', 'recommendation_type', 'priority')
        }),
        ('Contexte', {
            'fields': ('target_user', 'ai_analysis')
        }),
        ('Contenu détaillé', {
            'fields': ('action_items', 'expected_impact', 'implementation_steps')
        }),
        ('Métriques', {
            'fields': ('confidence_score',)
        }),
        ('Statut', {
            'fields': ('is_implemented', 'implemented_at', 'implementation_notes')
        }),
        ('Feedback utilisateur', {
            'fields': ('user_rating', 'user_feedback')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def confidence_score_display(self, obj):
        """Affichage du score de confiance"""
        if obj.confidence_score:
            color = 'green' if obj.confidence_score >= 80 else 'orange' if obj.confidence_score >= 60 else 'red'
            return format_html(
                '<span style="color: {};">{}%</span>',
                color, obj.confidence_score
            )
        return '-'
    confidence_score_display.short_description = 'Confiance'
    
    def user_rating_display(self, obj):
        """Affichage de la note utilisateur"""
        if obj.user_rating:
            stars = '⭐' * obj.user_rating
            return format_html('<span style="color: gold;">{}</span>', stars)
        return '-'
    user_rating_display.short_description = 'Note utilisateur'
    
    def ai_analysis_link(self, obj):
        """Lien vers l'analyse IA"""
        if obj.ai_analysis:
            url = reverse('admin:alerts_ai_aianalysis_change', args=[obj.ai_analysis.id])
            return format_html('<a href="{}">{}</a>', url, obj.ai_analysis)
        return '-'
    ai_analysis_link.short_description = 'Analyse IA source'
    
    actions = ['mark_as_implemented']
    
    def mark_as_implemented(self, request, queryset):
        """Action pour marquer comme implémenté"""
        count = queryset.update(
            is_implemented=True,
            implemented_at=timezone.now()
        )
        self.message_user(request, f'{count} recommandation(s) marquée(s) comme implémentée(s).')
    mark_as_implemented.short_description = "Marquer comme implémentées"


# Configuration du site d'administration
admin.site.site_header = "AL-TOPPE - Alertes & IA"
admin.site.site_title = "AL-TOPPE Admin"
admin.site.index_title = "Gestion des Alertes & IA"
