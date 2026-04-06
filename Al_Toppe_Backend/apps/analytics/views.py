from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Avg, Count, Sum
from datetime import timedelta

from .models import KPIMetric, KPIMeasurement, Dashboard, AnalyticsReport, TrendAnalysis
from .serializers import (
    KPIMetricSerializer, KPIMetricCreateSerializer,
    KPIMeasurementSerializer, KPIMeasurementCreateSerializer,
    DashboardSerializer, DashboardCreateSerializer,
    AnalyticsReportSerializer, AnalyticsReportCreateSerializer,
    TrendAnalysisSerializer, TrendAnalysisCreateSerializer,
    KPICalculationSerializer, DashboardDataSerializer, ReportGenerationSerializer
)


class KPIMetricViewSet(viewsets.ModelViewSet):
    """ViewSet pour les métriques KPI"""
    
    queryset = KPIMetric.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return KPIMetricCreateSerializer
        return KPIMetricSerializer
    
    def get_queryset(self):
        """Filtre les métriques par type et statut"""
        queryset = KPIMetric.objects.all()
        
        # Filtre par type de métrique
        metric_type = self.request.query_params.get('metric_type')
        if metric_type:
            queryset = queryset.filter(metric_type=metric_type)
        
        # Filtre par statut actif
        is_active = self.request.query_params.get('is_active')
        if is_active == 'true':
            queryset = queryset.filter(is_active=True)
        elif is_active == 'false':
            queryset = queryset.filter(is_active=False)
        
        # Filtre par système
        is_system = self.request.query_params.get('is_system')
        if is_system == 'true':
            queryset = queryset.filter(is_system=True)
        elif is_system == 'false':
            queryset = queryset.filter(is_system=False)
        
        return queryset.order_by('metric_type', 'name')
    
    @action(detail=True, methods=['post'])
    def calculate(self, request, pk=None):
        """Calcule une métrique KPI"""
        kpi = self.get_object()
        
        # Récupérer les paramètres
        entrepreneur_id = request.data.get('entrepreneur_id')
        activity_id = request.data.get('activity_id')
        period_start = request.data.get('period_start')
        period_end = request.data.get('period_end')
        
        # Logique de calcul (exemple simplifié)
        calculated_value = 0
        target_value = kpi.target_value
        
        # Calculer la valeur selon le type de métrique
        if kpi.calculation_type == 'sum':
            # Logique de somme
            measurements = KPIMeasurement.objects.filter(kpi=kpi)
            if entrepreneur_id:
                measurements = measurements.filter(entrepreneur_id=entrepreneur_id)
            if activity_id:
                measurements = measurements.filter(activity_id=activity_id)
            if period_start and period_end:
                measurements = measurements.filter(
                    period_start__gte=period_start,
                    period_end__lte=period_end
                )
            calculated_value = measurements.aggregate(total=Sum('value'))['total'] or 0
        
        elif kpi.calculation_type == 'average':
            # Logique de moyenne
            measurements = KPIMeasurement.objects.filter(kpi=kpi)
            if entrepreneur_id:
                measurements = measurements.filter(entrepreneur_id=entrepreneur_id)
            if activity_id:
                measurements = measurements.filter(activity_id=activity_id)
            if period_start and period_end:
                measurements = measurements.filter(
                    period_start__gte=period_start,
                    period_end__lte=period_end
                )
            calculated_value = measurements.aggregate(avg=Avg('value'))['avg'] or 0
        
        # Déterminer le statut
        status_value = 'normal'
        if target_value:
            if calculated_value >= target_value:
                status_value = 'excellent'
            elif calculated_value >= (target_value * 0.8):
                status_value = 'good'
            elif calculated_value >= (target_value * 0.6):
                status_value = 'warning'
            else:
                status_value = 'critical'
        
        data = {
            'kpi_id': kpi.id,
            'entrepreneur_id': entrepreneur_id,
            'activity_id': activity_id,
            'period_start': period_start,
            'period_end': period_end,
            'calculated_value': calculated_value,
            'target_value': target_value,
            'status': status_value
        }
        
        serializer = KPICalculationSerializer(data)
        return Response(serializer.data)


class KPIMeasurementViewSet(viewsets.ModelViewSet):
    """ViewSet pour les mesures KPI"""
    
    queryset = KPIMeasurement.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return KPIMeasurementCreateSerializer
        return KPIMeasurementSerializer
    
    def get_queryset(self):
        """Filtre les mesures par KPI et entrepreneur"""
        queryset = KPIMeasurement.objects.select_related('kpi', 'entrepreneur', 'activity')
        
        # Filtre par KPI
        kpi_id = self.request.query_params.get('kpi_id')
        if kpi_id:
            queryset = queryset.filter(kpi_id=kpi_id)
        
        # Filtre par entrepreneur
        entrepreneur_id = self.request.query_params.get('entrepreneur_id')
        if entrepreneur_id:
            queryset = queryset.filter(entrepreneur_id=entrepreneur_id)
        
        # Filtre par activité
        activity_id = self.request.query_params.get('activity_id')
        if activity_id:
            queryset = queryset.filter(activity_id=activity_id)
        
        # Filtre par période
        period_start = self.request.query_params.get('period_start')
        if period_start:
            queryset = queryset.filter(period_start__gte=period_start)
        
        period_end = self.request.query_params.get('period_end')
        if period_end:
            queryset = queryset.filter(period_end__lte=period_end)
        
        return queryset.order_by('-measurement_date')


class DashboardViewSet(viewsets.ModelViewSet):
    """ViewSet pour les tableaux de bord"""
    
    queryset = Dashboard.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return DashboardCreateSerializer
        return DashboardSerializer
    
    def get_queryset(self):
        """Filtre les tableaux de bord par propriétaire et type"""
        queryset = Dashboard.objects.select_related('owner')
        
        # Filtre par propriétaire
        owner_id = self.request.query_params.get('owner_id')
        if owner_id:
            queryset = queryset.filter(owner_id=owner_id)
        
        # Filtre par type
        dashboard_type = self.request.query_params.get('dashboard_type')
        if dashboard_type:
            queryset = queryset.filter(dashboard_type=dashboard_type)
        
        # Filtre par statut public
        is_public = self.request.query_params.get('is_public')
        if is_public == 'true':
            queryset = queryset.filter(is_public=True)
        
        # Filtre par défaut
        is_default = self.request.query_params.get('is_default')
        if is_default == 'true':
            queryset = queryset.filter(is_default=True)
        
        return queryset.order_by('-created_at')
    
    @action(detail=True, methods=['get'])
    def data(self, request, pk=None):
        """Récupère les données d'un tableau de bord"""
        dashboard = self.get_object()
        
        # Simuler des données de widgets (à adapter selon les besoins)
        widgets_data = {
            'widgets': [
                {
                    'id': 'kpi_summary',
                    'type': 'kpi_summary',
                    'data': {
                        'total_kpis': KPIMetric.objects.count(),
                        'active_kpis': KPIMetric.objects.filter(is_active=True).count(),
                        'measurements_today': KPIMeasurement.objects.filter(
                            measurement_date__date=timezone.now().date()
                        ).count()
                    }
                },
                {
                    'id': 'recent_measurements',
                    'type': 'recent_measurements',
                    'data': {
                        'measurements': list(
                            KPIMeasurement.objects.select_related('kpi', 'entrepreneur')
                            .order_by('-measurement_date')[:10]
                            .values('kpi__name', 'value', 'measurement_date')
                        )
                    }
                }
            ]
        }
        
        data = {
            'dashboard_id': dashboard.id,
            'widgets_data': widgets_data,
            'last_updated': timezone.now(),
            'refresh_interval': dashboard.refresh_interval
        }
        
        serializer = DashboardDataSerializer(data)
        return Response(serializer.data)


class AnalyticsReportViewSet(viewsets.ModelViewSet):
    """ViewSet pour les rapports d'analyse"""
    
    queryset = AnalyticsReport.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return AnalyticsReportCreateSerializer
        return AnalyticsReportSerializer
    
    def get_queryset(self):
        """Filtre les rapports par type et audience"""
        queryset = AnalyticsReport.objects.all()
        
        # Filtre par type de rapport
        report_type = self.request.query_params.get('report_type')
        if report_type:
            queryset = queryset.filter(report_type=report_type)
        
        # Filtre par audience cible
        target_audience = self.request.query_params.get('target_audience')
        if target_audience:
            queryset = queryset.filter(target_audience=target_audience)
        
        # Filtre par statut de génération
        is_generated = self.request.query_params.get('is_generated')
        if is_generated == 'true':
            queryset = queryset.filter(is_generated=True)
        elif is_generated == 'false':
            queryset = queryset.filter(is_generated=False)
        
        return queryset.order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def generate(self, request, pk=None):
        """Génère un rapport d'analyse"""
        report = self.get_object()
        
        # Simuler la génération de rapport
        start_time = timezone.now()
        
        try:
            # Logique de génération (à implémenter selon les besoins)
            report.is_generated = True
            report.generated_at = timezone.now()
            report.save()
            
            generation_duration = int((timezone.now() - start_time).total_seconds())
            
            data = {
                'report_id': report.id,
                'generation_status': 'completed',
                'file_path': f'/reports/{report.id}.pdf',
                'file_size': 1024000,  # 1MB simulé
                'generation_duration': generation_duration
            }
            
            serializer = ReportGenerationSerializer(data)
            return Response(serializer.data)
            
        except Exception as e:
            data = {
                'report_id': report.id,
                'generation_status': 'failed',
                'error_message': str(e)
            }
            
            serializer = ReportGenerationSerializer(data)
            return Response(serializer.data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TrendAnalysisViewSet(viewsets.ModelViewSet):
    """ViewSet pour les analyses de tendances"""
    
    queryset = TrendAnalysis.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return TrendAnalysisCreateSerializer
        return TrendAnalysisSerializer
    
    def get_queryset(self):
        """Filtre les analyses par KPI et entrepreneur"""
        queryset = TrendAnalysis.objects.select_related('kpi', 'entrepreneur')
        
        # Filtre par KPI
        kpi_id = self.request.query_params.get('kpi_id')
        if kpi_id:
            queryset = queryset.filter(kpi_id=kpi_id)
        
        # Filtre par entrepreneur
        entrepreneur_id = self.request.query_params.get('entrepreneur_id')
        if entrepreneur_id:
            queryset = queryset.filter(entrepreneur_id=entrepreneur_id)
        
        # Filtre par type de tendance
        trend_type = self.request.query_params.get('trend_type')
        if trend_type:
            queryset = queryset.filter(trend_type=trend_type)
        
        return queryset.order_by('-analysis_date')


# Vues fonctionnelles pour les actions spécifiques
def calculate_kpi(request, pk):
    """Vue pour calculer un KPI"""
    kpi = get_object_or_404(KPIMetric, pk=pk)
    
    # Logique de calcul simplifiée
    calculated_value = KPIMeasurement.objects.filter(kpi=kpi).aggregate(
        total=Sum('value')
    )['total'] or 0
    
    data = {
        'kpi_id': kpi.id,
        'calculated_value': calculated_value,
        'target_value': kpi.target_value,
        'status': 'normal'
    }
    
    return Response(data)


def dashboard_data(request, pk):
    """Vue pour les données d'un tableau de bord"""
    dashboard = get_object_or_404(Dashboard, pk=pk)
    
    # Données simulées
    widgets_data = {
        'widgets': [
            {
                'id': 'summary',
                'type': 'summary',
                'data': {'total_items': 100, 'active_items': 75}
            }
        ]
    }
    
    data = {
        'dashboard_id': dashboard.id,
        'widgets_data': widgets_data,
        'last_updated': timezone.now(),
        'refresh_interval': dashboard.refresh_interval
    }
    
    return Response(data)


def generate_report(request, pk):
    """Vue pour générer un rapport"""
    report = get_object_or_404(AnalyticsReport, pk=pk)
    
    # Simulation de génération
    report.is_generated = True
    report.generated_at = timezone.now()
    report.save()
    
    data = {
        'report_id': report.id,
        'generation_status': 'completed',
        'file_path': f'/reports/{report.id}.pdf'
    }
    
    return Response(data)
