from django.urls import path
from . import views

app_name = 'reports'

urlpatterns = [
    # Rapports
    path('', views.ReportViewSet.as_view({
        'get': 'list',
        'post': 'create'
    }), name='report-list'),
    path('<uuid:pk>/', views.ReportViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='report-detail'),
    
    # Templates de rapports
    path('templates/', views.ReportTemplateViewSet.as_view({
        'get': 'list',
        'post': 'create'
    }), name='template-list'),
    path('templates/<uuid:pk>/', views.ReportTemplateViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='template-detail'),
    
    # Planifications de rapports
    path('schedules/', views.ReportScheduleViewSet.as_view({
        'get': 'list',
        'post': 'create'
    }), name='schedule-list'),
    path('schedules/<uuid:pk>/', views.ReportScheduleViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='schedule-detail'),
    
    # Distributions de rapports
    path('distributions/', views.ReportDistributionViewSet.as_view({
        'get': 'list',
        'post': 'create'
    }), name='distribution-list'),
    path('distributions/<uuid:pk>/', views.ReportDistributionViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='distribution-detail'),
    
    # Actions spécialisées
    path('<uuid:pk>/generate/', views.generate_report, name='generate-report'),
    path('<uuid:pk>/download/', views.download_report, name='download-report'),
    path('schedules/<uuid:pk>/activate/', views.activate_schedule, name='activate-schedule'),
    path('schedules/<uuid:pk>/deactivate/', views.deactivate_schedule, name='deactivate-schedule'),
]
