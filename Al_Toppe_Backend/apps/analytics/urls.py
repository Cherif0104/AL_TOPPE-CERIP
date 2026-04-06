from django.urls import path
from . import views

app_name = 'analytics'

urlpatterns = [
    # KPIs
    path('kpis/', views.KPIMetricViewSet.as_view({
        'get': 'list',
        'post': 'create'
    }), name='kpi-list'),
    path('kpis/<uuid:pk>/', views.KPIMetricViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='kpi-detail'),
    
    # Mesures KPI
    path('measurements/', views.KPIMeasurementViewSet.as_view({
        'get': 'list',
        'post': 'create'
    }), name='measurement-list'),
    path('measurements/<uuid:pk>/', views.KPIMeasurementViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='measurement-detail'),
    
    # Tableaux de bord
    path('dashboards/', views.DashboardViewSet.as_view({
        'get': 'list',
        'post': 'create'
    }), name='dashboard-list'),
    path('dashboards/<uuid:pk>/', views.DashboardViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='dashboard-detail'),
    
    # Rapports d'analyse
    path('reports/', views.AnalyticsReportViewSet.as_view({
        'get': 'list',
        'post': 'create'
    }), name='report-list'),
    path('reports/<uuid:pk>/', views.AnalyticsReportViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='report-detail'),
    
    # Analyses de tendances
    path('trends/', views.TrendAnalysisViewSet.as_view({
        'get': 'list',
        'post': 'create'
    }), name='trend-list'),
    path('trends/<uuid:pk>/', views.TrendAnalysisViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='trend-detail'),
    
    # Actions spécialisées
    path('kpis/<uuid:pk>/calculate/', views.calculate_kpi, name='calculate-kpi'),
    path('dashboards/<uuid:pk>/data/', views.dashboard_data, name='dashboard-data'),
    path('reports/<uuid:pk>/generate/', views.generate_report, name='generate-report'),
]
