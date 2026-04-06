from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.translation import gettext_lazy as _
from .models import KPIMetric, KPIMeasurement, Dashboard, AnalyticsReport, TrendAnalysis


@admin.register(KPIMetric)
class KPIMetricAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'metric_type', 'calculation_type', 'target_value', 'unit',
        'is_active', 'is_system', 'created_at',
    )
    list_filter = (
        'metric_type', 'calculation_type', 'is_active', 'is_system', 'created_at',
    )
    search_fields = ('name', 'description', 'formula')
    readonly_fields = ('created_at', 'updated_at')

    fieldsets = (
        (_('Informations'), {'fields': ('name', 'description')}),
        (_('Classification'), {'fields': ('metric_type', 'calculation_type')}),
        (_('Configuration'), {'fields': ('target_value', 'unit', 'formula')}),
        (_('Statut'), {'fields': ('is_active', 'is_system')}),
        (_('Timestamps'), {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )


@admin.register(KPIMeasurement)
class KPIMeasurementAdmin(admin.ModelAdmin):
    list_display = (
        'kpi', 'entrepreneur', 'activity', 'value',
        'period_start', 'period_end', 'measurement_date',
    )
    list_filter = (
        'kpi', 'measurement_date', 'period_start', 'period_end',
    )
    search_fields = (
        'kpi__name', 'entrepreneur__first_name', 'entrepreneur__last_name',
    )
    readonly_fields = ('created_at',)

    fieldsets = (
        (_('Cible'), {'fields': ('kpi', 'entrepreneur', 'activity')}),
        (_('Mesure'), {'fields': ('value', 'period_start', 'period_end', 'measurement_date', 'data_source', 'notes')}),
        (_('Timestamps'), {'fields': ('created_at',), 'classes': ('collapse',)}),
    )


@admin.register(Dashboard)
class DashboardAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'dashboard_type', 'owner', 'is_public', 'is_default', 'created_at',
    )
    list_filter = (
        'dashboard_type', 'is_public', 'is_default', 'created_at',
    )
    search_fields = ('name', 'owner__phone')
    readonly_fields = ('created_at', 'updated_at')

    fieldsets = (
        (_('Informations'), {'fields': ('name', 'description')}),
        (_('Configuration'), {'fields': ('dashboard_type', 'owner', 'layout_config', 'widgets')}),
        (_('Paramètres'), {'fields': ('refresh_interval', 'is_public', 'is_default')}),
        (_('Timestamps'), {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )


@admin.register(AnalyticsReport)
class AnalyticsReportAdmin(admin.ModelAdmin):
    list_display = (
        'title', 'report_type', 'target_audience', 'period_start', 'period_end', 'is_generated', 'generated_at',
    )
    list_filter = (
        'report_type', 'target_audience', 'is_generated', 'period_start', 'created_at',
    )
    search_fields = ('title',)
    readonly_fields = ('created_at', 'updated_at')

    fieldsets = (
        (_('Informations'), {'fields': ('title', 'description')}),
        (_('Configuration'), {'fields': ('report_type', 'target_audience', 'data_config', 'visualizations', 'insights')}),
        (_('Période'), {'fields': ('period_start', 'period_end')}),
        (_('Statut'), {'fields': ('is_generated', 'generated_at')}),
        (_('Timestamps'), {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )


@admin.register(TrendAnalysis)
class TrendAnalysisAdmin(admin.ModelAdmin):
    list_display = (
        'kpi', 'entrepreneur', 'trend_type', 'trend_strength', 'analysis_date', 'period_analyzed',
    )
    list_filter = (
        'trend_type', 'analysis_date', 'period_analyzed',
    )
    search_fields = (
        'kpi__name', 'entrepreneur__first_name', 'entrepreneur__last_name',
    )
    readonly_fields = ('created_at',)

    fieldsets = (
        (_('Cible'), {'fields': ('kpi', 'entrepreneur')}),
        (_('Analyse'), {'fields': ('trend_type', 'trend_strength', 'data_points', 'trend_line')}),
        (_('Prédictions'), {'fields': ('forecast_values', 'confidence_interval')}),
        (_('Métadonnées'), {'fields': ('analysis_date', 'period_analyzed')}),
        (_('Timestamps'), {'fields': ('created_at',), 'classes': ('collapse',)}),
    )

