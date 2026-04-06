from django.urls import path
from . import views

app_name = 'production'

urlpatterns = [
    # Cycles de production
    path('cycles/', views.ProductionCycleViewSet.as_view({
        'get': 'list',
        'post': 'create'
    }), name='cycle-list'),
    path('cycles/<uuid:pk>/', views.ProductionCycleViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='cycle-detail'),
    
    # Tâches de production
    path('tasks/', views.ProductionTaskViewSet.as_view({
        'get': 'list',
        'post': 'create'
    }), name='task-list'),
    path('tasks/<uuid:pk>/', views.ProductionTaskViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='task-detail'),
    
    # Actions sur les tâches
    path('tasks/<uuid:pk>/action/', views.ProductionTaskViewSet.as_view({
        'post': 'action'
    }), name='task-action'),
    path('tasks/<uuid:pk>/start/', views.ProductionTaskViewSet.as_view({
        'post': 'start'
    }), name='start-task'),
    path('tasks/<uuid:pk>/complete/', views.ProductionTaskViewSet.as_view({
        'post': 'complete'
    }), name='complete-task'),
    
    # Rapports de production
    path('cycles/<uuid:pk>/progress/', views.ProductionCycleViewSet.as_view({
        'get': 'progress'
    }), name='cycle-progress'),
    path('cycles/<uuid:pk>/tasks/', views.ProductionCycleViewSet.as_view({
        'get': 'tasks'
    }), name='cycle-tasks'),
]
