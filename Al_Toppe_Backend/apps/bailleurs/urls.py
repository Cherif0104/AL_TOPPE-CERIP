from django.urls import path
from . import views

app_name = 'bailleurs'

urlpatterns = [
    # Bailleurs
    path('', views.BailleurViewSet.as_view({
        'get': 'list',
        'post': 'create'
    }), name='bailleur-list'),
    path('<uuid:pk>/', views.BailleurViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='bailleur-detail'),
    
    # Programmes de financement
    path('programs/', views.FundingProgramViewSet.as_view({
        'get': 'list',
        'post': 'create'
    }), name='program-list'),
    path('programs/<uuid:pk>/', views.FundingProgramViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='program-detail'),
    
    # Candidatures
    path('applications/', views.FundingApplicationViewSet.as_view({
        'get': 'list',
        'post': 'create'
    }), name='application-list'),
    path('applications/<uuid:pk>/', views.FundingApplicationViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='application-detail'),
    
    # Actions sur les candidatures
    path('applications/<uuid:pk>/submit/', views.submit_application, name='submit-application'),
    path('applications/<uuid:pk>/approve/', views.approve_application, name='approve-application'),
    path('applications/<uuid:pk>/reject/', views.reject_application, name='reject-application'),
    
    # Rapports bailleurs
    path('bailleurs/<uuid:pk>/programs/', views.bailleur_programs, name='bailleur-programs'),
    path('bailleurs/<uuid:pk>/impact/', views.bailleur_impact, name='bailleur-impact'),
]
