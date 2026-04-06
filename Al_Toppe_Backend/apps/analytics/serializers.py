from rest_framework import serializers
from .models import KPIMetric, KPIMeasurement, Dashboard, AnalyticsReport, TrendAnalysis


class KPIMetricSerializer(serializers.ModelSerializer):
    """Serializer pour les métriques KPI"""
    
    status = serializers.ReadOnlyField()
    
    class Meta:
        model = KPIMetric
        fields = [
            'id', 'name', 'description', 'metric_type', 'calculation_type',
            'target_value', 'unit', 'formula', 'warning_threshold', 'critical_threshold',
            'is_active', 'is_system', 'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_target_value(self, value):
        """Valide la valeur cible"""
        if value and value < 0:
            raise serializers.ValidationError("La valeur cible ne peut pas être négative")
        return value
    
    def validate_warning_threshold(self, value):
        """Valide le seuil d'avertissement"""
        if value and value < 0:
            raise serializers.ValidationError("Le seuil d'avertissement ne peut pas être négatif")
        return value
    
    def validate_critical_threshold(self, value):
        """Valide le seuil critique"""
        if value and value < 0:
            raise serializers.ValidationError("Le seuil critique ne peut pas être négatif")
        return value


class KPIMeasurementSerializer(serializers.ModelSerializer):
    """Serializer pour les mesures KPI"""
    
    kpi_name = serializers.ReadOnlyField(source='kpi.name')
    entrepreneur_name = serializers.ReadOnlyField(source='entrepreneur.full_name')
    activity_name = serializers.ReadOnlyField(source='activity.title')
    
    class Meta:
        model = KPIMeasurement
        fields = [
            'id', 'kpi', 'kpi_name', 'entrepreneur', 'entrepreneur_name', 'activity',
            'activity_name', 'value', 'period_start', 'period_end', 'measurement_date',
            'data_source', 'notes', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def validate_value(self, value):
        """Valide la valeur mesurée"""
        if value < 0:
            raise serializers.ValidationError("La valeur mesurée ne peut pas être négative")
        return value
    
    def validate_period_end(self, value):
        """Valide la fin de période"""
        period_start = self.initial_data.get('period_start')
        if period_start and value and value <= period_start:
            raise serializers.ValidationError(
                "La fin de période doit être postérieure au début de période"
            )
        return value


class DashboardSerializer(serializers.ModelSerializer):
    """Serializer pour les tableaux de bord"""
    
    owner_name = serializers.ReadOnlyField(source='owner.get_full_name')
    
    class Meta:
        model = Dashboard
        fields = [
            'id', 'name', 'description', 'dashboard_type', 'owner', 'owner_name',
            'layout_config', 'widgets', 'refresh_interval', 'is_public', 'is_default',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_refresh_interval(self, value):
        """Valide l'intervalle de rafraîchissement"""
        if value < 30:
            raise serializers.ValidationError(
                "L'intervalle de rafraîchissement doit être d'au moins 30 secondes"
            )
        if value > 3600:
            raise serializers.ValidationError(
                "L'intervalle de rafraîchissement ne peut pas dépasser 1 heure"
            )
        return value


class AnalyticsReportSerializer(serializers.ModelSerializer):
    """Serializer pour les rapports d'analyse"""
    
    is_generated = serializers.ReadOnlyField()
    generated_at = serializers.ReadOnlyField()
    
    class Meta:
        model = AnalyticsReport
        fields = [
            'id', 'title', 'description', 'report_type', 'target_audience',
            'data_config', 'visualizations', 'insights', 'period_start', 'period_end',
            'is_generated', 'generated_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'is_generated', 'generated_at', 'created_at', 'updated_at']
    
    def validate_period_end(self, value):
        """Valide la fin de période"""
        period_start = self.initial_data.get('period_start')
        if period_start and value and value <= period_start:
            raise serializers.ValidationError(
                "La fin de période doit être postérieure au début de période"
            )
        return value


class TrendAnalysisSerializer(serializers.ModelSerializer):
    """Serializer pour les analyses de tendances"""
    
    kpi_name = serializers.ReadOnlyField(source='kpi.name')
    entrepreneur_name = serializers.ReadOnlyField(source='entrepreneur.full_name')
    
    class Meta:
        model = TrendAnalysis
        fields = [
            'id', 'kpi', 'kpi_name', 'entrepreneur', 'entrepreneur_name', 'trend_type',
            'trend_strength', 'data_points', 'trend_line', 'forecast_values',
            'confidence_interval', 'analysis_date', 'period_analyzed', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def validate_trend_strength(self, value):
        """Valide la force de la tendance"""
        if value < 0 or value > 100:
            raise serializers.ValidationError(
                "La force de la tendance doit être entre 0 et 100"
            )
        return value


class KPIMetricCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création de métriques KPI"""
    
    class Meta:
        model = KPIMetric
        fields = [
            'name', 'description', 'metric_type', 'calculation_type', 'target_value',
            'unit', 'formula', 'warning_threshold', 'critical_threshold', 'is_active'
        ]


class KPIMeasurementCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création de mesures KPI"""
    
    class Meta:
        model = KPIMeasurement
        fields = [
            'kpi', 'entrepreneur', 'activity', 'value', 'period_start', 'period_end',
            'data_source', 'notes'
        ]


class DashboardCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création de tableaux de bord"""
    
    class Meta:
        model = Dashboard
        fields = [
            'name', 'description', 'dashboard_type', 'owner', 'layout_config',
            'widgets', 'refresh_interval', 'is_public', 'is_default'
        ]


class AnalyticsReportCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création de rapports d'analyse"""
    
    class Meta:
        model = AnalyticsReport
        fields = [
            'title', 'description', 'report_type', 'target_audience', 'data_config',
            'visualizations', 'insights', 'period_start', 'period_end'
        ]


class TrendAnalysisCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création d'analyses de tendances"""
    
    class Meta:
        model = TrendAnalysis
        fields = [
            'kpi', 'entrepreneur', 'trend_type', 'trend_strength', 'data_points',
            'trend_line', 'forecast_values', 'confidence_interval', 'period_analyzed'
        ]


class KPICalculationSerializer(serializers.Serializer):
    """Serializer pour les calculs de KPI"""
    
    kpi_id = serializers.UUIDField()
    entrepreneur_id = serializers.UUIDField(required=False)
    activity_id = serializers.UUIDField(required=False)
    period_start = serializers.DateField()
    period_end = serializers.DateField()
    calculated_value = serializers.FloatField()
    target_value = serializers.FloatField(required=False)
    status = serializers.CharField()
    trend = serializers.CharField(required=False)


class DashboardDataSerializer(serializers.Serializer):
    """Serializer pour les données de tableau de bord"""
    
    dashboard_id = serializers.UUIDField()
    widgets_data = serializers.JSONField()
    last_updated = serializers.DateTimeField()
    refresh_interval = serializers.IntegerField()


class ReportGenerationSerializer(serializers.Serializer):
    """Serializer pour la génération de rapports"""
    
    report_id = serializers.UUIDField()
    generation_status = serializers.CharField()
    file_path = serializers.CharField(required=False)
    file_size = serializers.IntegerField(required=False)
    generation_duration = serializers.IntegerField(required=False)
    error_message = serializers.CharField(required=False)
