from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


class KPIMetric(models.Model):
    """Modèle pour les métriques KPI"""
    
    METRIC_TYPES = [
        ('financial', 'Financier'),
        ('operational', 'Opérationnel'),
        ('growth', 'Croissance'),
        ('efficiency', 'Efficacité'),
        ('sustainability', 'Durabilité'),
        ('impact', 'Impact social'),
    ]
    
    CALCULATION_TYPES = [
        ('sum', 'Somme'),
        ('average', 'Moyenne'),
        ('percentage', 'Pourcentage'),
        ('ratio', 'Ratio'),
        ('count', 'Comptage'),
        ('custom', 'Calcul personnalisé'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, verbose_name="Nom du KPI")
    description = models.TextField(verbose_name="Description")
    
    # Classification
    metric_type = models.CharField(max_length=20, choices=METRIC_TYPES, verbose_name="Type de métrique")
    calculation_type = models.CharField(max_length=20, choices=CALCULATION_TYPES, verbose_name="Type de calcul")
    
    # Configuration
    target_value = models.DecimalField(
        max_digits=15, decimal_places=2,
        null=True, blank=True, verbose_name="Valeur cible"
    )
    unit = models.CharField(max_length=50, blank=True, verbose_name="Unité de mesure")
    formula = models.TextField(blank=True, verbose_name="Formule de calcul")
    
    # Seuils d'alerte
    warning_threshold = models.DecimalField(
        max_digits=15, decimal_places=2,
        null=True, blank=True, verbose_name="Seuil d'avertissement"
    )
    critical_threshold = models.DecimalField(
        max_digits=15, decimal_places=2,
        null=True, blank=True, verbose_name="Seuil critique"
    )
    
    # Statut
    is_active = models.BooleanField(default=True, verbose_name="KPI actif")
    is_system = models.BooleanField(default=False, verbose_name="KPI système")
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière modification")
    
    class Meta:
        verbose_name = "Métrique KPI"
        verbose_name_plural = "Métriques KPI"
        db_table = 'kpi_metrics'
        ordering = ['metric_type', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.get_metric_type_display()})"
    
    @property
    def status(self):
        """Détermine le statut du KPI basé sur les seuils"""
        if not self.target_value:
            return 'normal'
        # Logique de détermination du statut
        return 'normal'


class KPIMeasurement(models.Model):
    """Modèle pour les mesures de KPI"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    kpi = models.ForeignKey(KPIMetric, on_delete=models.CASCADE, 
                          related_name='measurements', verbose_name="KPI")
    entrepreneur = models.ForeignKey('entrepreneurs.Entrepreneur', on_delete=models.CASCADE, 
                                   related_name='kpi_measurements', verbose_name="Entrepreneur")
    activity = models.ForeignKey('entrepreneurs.Activity', on_delete=models.CASCADE, 
                                related_name='kpi_measurements', verbose_name="Activité")
    
    # Mesure
    value = models.DecimalField(max_digits=15, decimal_places=2, verbose_name="Valeur mesurée")
    period_start = models.DateField(verbose_name="Début de période")
    period_end = models.DateField(verbose_name="Fin de période")
    
    # Métadonnées
    measurement_date = models.DateTimeField(default=timezone.now, verbose_name="Date de mesure")
    data_source = models.CharField(max_length=100, verbose_name="Source de données")
    notes = models.TextField(blank=True, verbose_name="Notes")
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now, verbose_name="Date de création")
    
    class Meta:
        verbose_name = "Mesure KPI"
        verbose_name_plural = "Mesures KPI"
        db_table = 'kpi_measurements'
        ordering = ['-measurement_date']
        unique_together = ['kpi', 'entrepreneur', 'activity', 'period_start', 'period_end']
    
    def __str__(self):
        return f"{self.kpi.name}: {self.value} ({self.period_start} - {self.period_end})"


class Dashboard(models.Model):
    """Modèle pour les tableaux de bord personnalisés"""
    
    DASHBOARD_TYPES = [
        ('entrepreneur', 'Entrepreneur'),
        ('coach', 'Coach'),
        ('bailleur', 'Bailleur'),
        ('admin', 'Administrateur'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, verbose_name="Nom du tableau de bord")
    description = models.TextField(blank=True, verbose_name="Description")
    
    # Configuration
    dashboard_type = models.CharField(max_length=20, choices=DASHBOARD_TYPES, verbose_name="Type de tableau de bord")
    owner = models.ForeignKey('accounts.User', on_delete=models.CASCADE, 
                            related_name='dashboards', verbose_name="Propriétaire")
    
    # Layout et widgets
    layout_config = models.JSONField(default=dict, verbose_name="Configuration du layout")
    widgets = models.JSONField(default=list, verbose_name="Widgets configurés")
    
    # Paramètres
    refresh_interval = models.PositiveIntegerField(
        default=300, verbose_name="Intervalle de rafraîchissement (secondes)"
    )
    is_public = models.BooleanField(default=False, verbose_name="Tableau de bord public")
    is_default = models.BooleanField(default=False, verbose_name="Tableau de bord par défaut")
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière modification")
    
    class Meta:
        verbose_name = "Tableau de bord"
        verbose_name_plural = "Tableaux de bord"
        db_table = 'dashboards'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.get_dashboard_type_display()})"


class AnalyticsReport(models.Model):
    """Modèle pour les rapports d'analyse"""
    
    REPORT_TYPES = [
        ('performance', 'Performance'),
        ('trends', 'Tendances'),
        ('comparison', 'Comparaison'),
        ('forecast', 'Prévisions'),
        ('impact', 'Impact'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255, verbose_name="Titre du rapport")
    description = models.TextField(blank=True, verbose_name="Description")
    
    # Configuration
    report_type = models.CharField(max_length=20, choices=REPORT_TYPES, verbose_name="Type de rapport")
    target_audience = models.CharField(max_length=20, choices=Dashboard.DASHBOARD_TYPES, verbose_name="Public cible")
    
    # Contenu
    data_config = models.JSONField(default=dict, verbose_name="Configuration des données")
    visualizations = models.JSONField(default=list, verbose_name="Visualisations")
    insights = models.JSONField(default=list, verbose_name="Insights générés")
    
    # Période
    period_start = models.DateField(verbose_name="Début de période")
    period_end = models.DateField(verbose_name="Fin de période")
    
    # Statut
    is_generated = models.BooleanField(default=False, verbose_name="Rapport généré")
    generated_at = models.DateTimeField(null=True, blank=True, verbose_name="Date de génération")
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière modification")
    
    class Meta:
        verbose_name = "Rapport d'analyse"
        verbose_name_plural = "Rapports d'analyse"
        db_table = 'analytics_reports'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} ({self.period_start} - {self.period_end})"


class TrendAnalysis(models.Model):
    """Modèle pour l'analyse des tendances"""
    
    TREND_TYPES = [
        ('growth', 'Croissance'),
        ('decline', 'Déclin'),
        ('stable', 'Stable'),
        ('volatile', 'Volatile'),
        ('seasonal', 'Saisonnier'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    kpi = models.ForeignKey(KPIMetric, on_delete=models.CASCADE, 
                          related_name='trend_analyses', verbose_name="KPI")
    entrepreneur = models.ForeignKey('entrepreneurs.Entrepreneur', on_delete=models.CASCADE, 
                                   related_name='trend_analyses', verbose_name="Entrepreneur")
    
    # Analyse
    trend_type = models.CharField(max_length=20, choices=TREND_TYPES, verbose_name="Type de tendance")
    trend_strength = models.DecimalField(
        max_digits=5, decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        verbose_name="Force de la tendance (%)"
    )
    
    # Données
    data_points = models.JSONField(default=list, verbose_name="Points de données")
    trend_line = models.JSONField(default=dict, verbose_name="Ligne de tendance")
    
    # Prédictions
    forecast_values = models.JSONField(default=list, verbose_name="Valeurs prédites")
    confidence_interval = models.JSONField(default=dict, verbose_name="Intervalle de confiance")
    
    # Métadonnées
    analysis_date = models.DateTimeField(default=timezone.now, verbose_name="Date d'analyse")
    period_analyzed = models.CharField(max_length=50, verbose_name="Période analysée")
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now, verbose_name="Date de création")
    
    class Meta:
        verbose_name = "Analyse de tendance"
        verbose_name_plural = "Analyses de tendances"
        db_table = 'trend_analyses'
        ordering = ['-analysis_date']
    
    def __str__(self):
        return f"Tendance {self.kpi.name} - {self.get_trend_type_display()}"
