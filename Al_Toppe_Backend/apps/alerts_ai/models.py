#!/usr/bin/env python3
"""
📱 MODULE ALERTS & IA - MODÈLES
================================

Ce module gère :
- Alertes intelligentes basées sur l'IA
- Notifications push et SMS
- Intégrations avec services IA externes
- Analyse prédictive des données
- Recommandations automatisées
"""

import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator

User = get_user_model()


class AlertType(models.Model):
    """Types d'alertes disponibles dans le système"""
    
    ALERT_CATEGORIES = [
        ('financial', 'Financier'),
        ('operational', 'Opérationnel'),
        ('compliance', 'Conformité'),
        ('market', 'Marché'),
        ('risk', 'Risque'),
        ('opportunity', 'Opportunité'),
        ('performance', 'Performance'),
        ('system', 'Système'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, verbose_name="Nom")
    category = models.CharField(max_length=20, choices=ALERT_CATEGORIES, verbose_name="Catégorie")
    description = models.TextField(verbose_name="Description")
    severity_levels = models.JSONField(default=list, verbose_name="Niveaux de sévérité")
    is_active = models.BooleanField(default=True, verbose_name="Actif")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Créé le")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Modifié le")
    
    class Meta:
        verbose_name = "Type d'alerte"
        verbose_name_plural = "Types d'alertes"
        ordering = ['category', 'name']
    
    def __str__(self):
        return f"{self.get_category_display()} - {self.name}"


class AlertRule(models.Model):
    """Règles de déclenchement des alertes basées sur l'IA"""
    
    TRIGGER_TYPES = [
        ('threshold', 'Seuil'),
        ('trend', 'Tendance'),
        ('anomaly', 'Anomalie'),
        ('prediction', 'Prédiction'),
        ('pattern', 'Motif'),
        ('comparison', 'Comparaison'),
    ]
    
    CONDITION_OPERATORS = [
        ('gt', 'Supérieur à'),
        ('gte', 'Supérieur ou égal à'),
        ('lt', 'Inférieur à'),
        ('lte', 'Inférieur ou égal à'),
        ('eq', 'Égal à'),
        ('ne', 'Différent de'),
        ('contains', 'Contient'),
        ('in', 'Dans la liste'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, verbose_name="Nom de la règle")
    alert_type = models.ForeignKey(AlertType, on_delete=models.CASCADE, verbose_name="Type d'alerte")
    trigger_type = models.CharField(max_length=20, choices=TRIGGER_TYPES, verbose_name="Type de déclenchement")
    
    # Conditions de déclenchement
    condition_field = models.CharField(max_length=100, verbose_name="Champ à surveiller")
    condition_operator = models.CharField(max_length=10, choices=CONDITION_OPERATORS, verbose_name="Opérateur")
    condition_value = models.JSONField(verbose_name="Valeur de comparaison")
    
    # Paramètres IA
    ai_model = models.CharField(max_length=100, blank=True, verbose_name="Modèle IA utilisé")
    confidence_threshold = models.DecimalField(
        max_digits=5, decimal_places=2, 
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        default=80.00, verbose_name="Seuil de confiance (%)"
    )
    
    # Configuration des alertes
    is_active = models.BooleanField(default=True, verbose_name="Actif")
    cooldown_hours = models.PositiveIntegerField(default=24, verbose_name="Délai entre alertes (heures)")
    max_alerts_per_day = models.PositiveIntegerField(default=5, verbose_name="Max alertes par jour")
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Créé le")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Modifié le")
    
    class Meta:
        verbose_name = "Règle d'alerte"
        verbose_name_plural = "Règles d'alertes"
        ordering = ['alert_type', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.get_trigger_type_display()})"


class Alert(models.Model):
    """Alertes générées par le système d'IA"""
    
    SEVERITY_LEVELS = [
        ('low', 'Faible'),
        ('medium', 'Moyen'),
        ('high', 'Élevé'),
        ('critical', 'Critique'),
    ]
    
    STATUS_CHOICES = [
        ('new', 'Nouvelle'),
        ('acknowledged', 'Reconnue'),
        ('resolved', 'Résolue'),
        ('dismissed', 'Ignorée'),
        ('escalated', 'Escaladée'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200, verbose_name="Titre")
    description = models.TextField(verbose_name="Description")
    
    # Classification
    alert_type = models.ForeignKey(AlertType, on_delete=models.CASCADE, verbose_name="Type d'alerte")
    alert_rule = models.ForeignKey(AlertRule, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Règle déclenchée")
    severity = models.CharField(max_length=20, choices=SEVERITY_LEVELS, verbose_name="Niveau de sévérité")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new', verbose_name="Statut")
    
    # Contexte et données
    target_user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Utilisateur cible")
    related_entity_type = models.CharField(max_length=50, blank=True, verbose_name="Type d'entité liée")
    related_entity_id = models.UUIDField(null=True, blank=True, verbose_name="ID de l'entité liée")
    context_data = models.JSONField(default=dict, verbose_name="Données de contexte")
    
    # Métriques IA
    ai_confidence = models.DecimalField(
        max_digits=5, decimal_places=2, 
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        null=True, blank=True, verbose_name="Confiance IA (%)"
    )
    ai_reasoning = models.TextField(blank=True, verbose_name="Raisonnement IA")
    
    # Gestion des alertes
    acknowledged_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, 
        related_name='acknowledged_alerts', verbose_name="Reconnue par"
    )
    acknowledged_at = models.DateTimeField(null=True, blank=True, verbose_name="Reconnue le")
    resolved_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='resolved_alerts', verbose_name="Résolue par"
    )
    resolved_at = models.DateTimeField(null=True, blank=True, verbose_name="Résolue le")
    resolution_notes = models.TextField(blank=True, verbose_name="Notes de résolution")
    
    # Timestamps
    triggered_at = models.DateTimeField(auto_now_add=True, verbose_name="Déclenchée le")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Modifiée le")
    
    class Meta:
        verbose_name = "Alerte"
        verbose_name_plural = "Alertes"
        ordering = ['-triggered_at']
        indexes = [
            models.Index(fields=['target_user', 'status']),
            models.Index(fields=['alert_type', 'severity']),
            models.Index(fields=['triggered_at']),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.get_severity_display()})"
    
    def acknowledge(self, user):
        """Marquer l'alerte comme reconnue"""
        self.status = 'acknowledged'
        self.acknowledged_by = user
        self.acknowledged_at = timezone.now()
        self.save()
    
    def resolve(self, user, notes=""):
        """Marquer l'alerte comme résolue"""
        self.status = 'resolved'
        self.resolved_by = user
        self.resolved_at = timezone.now()
        self.resolution_notes = notes
        self.save()
    
    def dismiss(self, user):
        """Ignorer l'alerte"""
        self.status = 'dismissed'
        self.acknowledged_by = user
        self.acknowledged_at = timezone.now()
        self.save()


class Notification(models.Model):
    """Notifications envoyées aux utilisateurs"""
    
    NOTIFICATION_TYPES = [
        ('push', 'Push'),
        ('sms', 'SMS'),
        ('email', 'Email'),
        ('in_app', 'Dans l\'application'),
        ('webhook', 'Webhook'),
    ]
    
    DELIVERY_STATUS = [
        ('pending', 'En attente'),
        ('sent', 'Envoyé'),
        ('delivered', 'Livré'),
        ('failed', 'Échec'),
        ('cancelled', 'Annulé'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    alert = models.ForeignKey(Alert, on_delete=models.CASCADE, verbose_name="Alerte associée")
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES, verbose_name="Type de notification")
    
    # Contenu
    title = models.CharField(max_length=200, verbose_name="Titre")
    message = models.TextField(verbose_name="Message")
    action_url = models.URLField(blank=True, verbose_name="URL d'action")
    action_text = models.CharField(max_length=50, blank=True, verbose_name="Texte de l'action")
    
    # Destinataire
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Destinataire")
    
    # Statut de livraison
    delivery_status = models.CharField(max_length=20, choices=DELIVERY_STATUS, default='pending', verbose_name="Statut de livraison")
    sent_at = models.DateTimeField(null=True, blank=True, verbose_name="Envoyé le")
    delivered_at = models.DateTimeField(null=True, blank=True, verbose_name="Livré le")
    delivery_error = models.TextField(blank=True, verbose_name="Erreur de livraison")
    
    # Métriques
    open_count = models.PositiveIntegerField(default=0, verbose_name="Nombre d'ouvertures")
    click_count = models.PositiveIntegerField(default=0, verbose_name="Nombre de clics")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Créé le")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Modifié le")
    
    class Meta:
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'delivery_status']),
            models.Index(fields=['notification_type', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.title} → {self.recipient.phone}"
    
    def mark_as_sent(self):
        """Marquer comme envoyé"""
        self.delivery_status = 'sent'
        self.sent_at = timezone.now()
        self.save()
    
    def mark_as_delivered(self):
        """Marquer comme livré"""
        self.delivery_status = 'delivered'
        self.delivered_at = timezone.now()
        self.save()
    
    def mark_as_failed(self, error_message):
        """Marquer comme échec"""
        self.delivery_status = 'failed'
        self.delivery_error = error_message
        self.save()


class AIModel(models.Model):
    """Modèles d'intelligence artificielle utilisés"""
    
    MODEL_TYPES = [
        ('anomaly_detection', 'Détection d\'anomalies'),
        ('prediction', 'Prédiction'),
        ('classification', 'Classification'),
        ('recommendation', 'Recommandation'),
        ('optimization', 'Optimisation'),
        ('nlp', 'Traitement du langage naturel'),
    ]
    
    PROVIDERS = [
        ('openai', 'OpenAI'),
        ('anthropic', 'Anthropic'),
        ('google', 'Google AI'),
        ('azure', 'Azure AI'),
        ('aws', 'AWS AI'),
        ('custom', 'Modèle personnalisé'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, verbose_name="Nom du modèle")
    model_type = models.CharField(max_length=30, choices=MODEL_TYPES, verbose_name="Type de modèle")
    provider = models.CharField(max_length=20, choices=PROVIDERS, verbose_name="Fournisseur")
    
    # Configuration
    model_version = models.CharField(max_length=50, verbose_name="Version")
    api_endpoint = models.URLField(blank=True, verbose_name="Endpoint API")
    api_key_name = models.CharField(max_length=100, blank=True, verbose_name="Nom de la clé API")
    
    # Paramètres
    parameters = models.JSONField(default=dict, verbose_name="Paramètres du modèle")
    is_active = models.BooleanField(default=True, verbose_name="Actif")
    
    # Métriques de performance
    accuracy = models.DecimalField(
        max_digits=5, decimal_places=2, 
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        null=True, blank=True, verbose_name="Précision (%)"
    )
    last_training = models.DateTimeField(null=True, blank=True, verbose_name="Dernier entraînement")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Créé le")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Modifié le")
    
    class Meta:
        verbose_name = "Modèle IA"
        verbose_name_plural = "Modèles IA"
        ordering = ['model_type', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.get_model_type_display()})"


class AIAnalysis(models.Model):
    """Analyses effectuées par l'IA"""
    
    ANALYSIS_TYPES = [
        ('financial_health', 'Santé financière'),
        ('market_trends', 'Tendances du marché'),
        ('risk_assessment', 'Évaluation des risques'),
        ('performance_prediction', 'Prédiction de performance'),
        ('anomaly_detection', 'Détection d\'anomalies'),
        ('optimization_suggestion', 'Suggestion d\'optimisation'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    analysis_type = models.CharField(max_length=30, choices=ANALYSIS_TYPES, verbose_name="Type d'analyse")
    ai_model = models.ForeignKey(AIModel, on_delete=models.CASCADE, verbose_name="Modèle IA")
    
    # Contexte
    target_user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Utilisateur cible")
    related_entity_type = models.CharField(max_length=50, blank=True, verbose_name="Type d'entité liée")
    related_entity_id = models.UUIDField(null=True, blank=True, verbose_name="ID de l'entité liée")
    
    # Données d'entrée et résultats
    input_data = models.JSONField(default=dict, verbose_name="Données d'entrée")
    analysis_result = models.JSONField(default=dict, verbose_name="Résultats de l'analyse")
    
    # Métriques
    confidence_score = models.DecimalField(
        max_digits=5, decimal_places=2, 
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        verbose_name="Score de confiance (%)"
    )
    processing_time_ms = models.PositiveIntegerField(verbose_name="Temps de traitement (ms)")
    
    # Statut
    is_successful = models.BooleanField(default=True, verbose_name="Réussi")
    error_message = models.TextField(blank=True, verbose_name="Message d'erreur")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Créé le")
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name="Terminé le")
    
    class Meta:
        verbose_name = "Analyse IA"
        verbose_name_plural = "Analyses IA"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['target_user', 'analysis_type']),
            models.Index(fields=['ai_model', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.get_analysis_type_display()} - {self.target_user.phone}"
    
    def mark_as_completed(self, result, confidence, processing_time, success=True, error=""):
        """Marquer l'analyse comme terminée"""
        self.analysis_result = result
        self.confidence_score = confidence
        self.processing_time_ms = processing_time
        self.is_successful = success
        self.error_message = error
        self.completed_at = timezone.now()
        self.save()


class Recommendation(models.Model):
    """Recommandations générées par l'IA"""
    
    RECOMMENDATION_TYPES = [
        ('financial', 'Financier'),
        ('operational', 'Opérationnel'),
        ('strategic', 'Stratégique'),
        ('risk_mitigation', 'Atténuation des risques'),
        ('growth', 'Croissance'),
        ('efficiency', 'Efficacité'),
    ]
    
    PRIORITY_LEVELS = [
        ('low', 'Faible'),
        ('medium', 'Moyen'),
        ('high', 'Élevé'),
        ('urgent', 'Urgent'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200, verbose_name="Titre")
    description = models.TextField(verbose_name="Description")
    
    # Classification
    recommendation_type = models.CharField(max_length=30, choices=RECOMMENDATION_TYPES, verbose_name="Type")
    priority = models.CharField(max_length=20, choices=PRIORITY_LEVELS, verbose_name="Priorité")
    
    # Contexte
    target_user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Utilisateur cible")
    ai_analysis = models.ForeignKey(AIAnalysis, on_delete=models.CASCADE, verbose_name="Analyse IA source")
    
    # Contenu détaillé
    action_items = models.JSONField(default=list, verbose_name="Actions à entreprendre")
    expected_impact = models.TextField(verbose_name="Impact attendu")
    implementation_steps = models.JSONField(default=list, verbose_name="Étapes d'implémentation")
    
    # Métriques
    confidence_score = models.DecimalField(
        max_digits=5, decimal_places=2, 
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        verbose_name="Score de confiance (%)"
    )
    
    # Statut
    is_implemented = models.BooleanField(default=False, verbose_name="Implémenté")
    implemented_at = models.DateTimeField(null=True, blank=True, verbose_name="Implémenté le")
    implementation_notes = models.TextField(blank=True, verbose_name="Notes d'implémentation")
    
    # Feedback utilisateur
    user_rating = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True, blank=True, verbose_name="Note utilisateur (1-5)"
    )
    user_feedback = models.TextField(blank=True, verbose_name="Feedback utilisateur")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Créé le")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Modifié le")
    
    class Meta:
        verbose_name = "Recommandation"
        verbose_name_plural = "Recommandations"
        ordering = ['-priority', '-created_at']
        indexes = [
            models.Index(fields=['target_user', 'recommendation_type']),
            models.Index(fields=['priority', 'is_implemented']),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.get_priority_display()})"
    
    def mark_as_implemented(self, notes=""):
        """Marquer comme implémenté"""
        self.is_implemented = True
        self.implemented_at = timezone.now()
        self.implementation_notes = notes
        self.save()
