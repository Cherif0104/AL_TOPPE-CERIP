from django.urls import path
from . import views

app_name = 'coaches'

urlpatterns = [
    # Coaches
    path('', views.CoachViewSet.as_view({
        'get': 'list',
        'post': 'create'
    }), name='coach-list'),
    path('<uuid:pk>/', views.CoachViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='coach-detail'),
    
    # Assignations
    path('assignments/', views.CoachAssignmentViewSet.as_view({
        'get': 'list',
        'post': 'create'
    }), name='assignment-list'),
    path('assignments/bulk-assign/', views.CoachAssignmentViewSet.as_view({
        'post': 'bulk_assign'
    }), name='assignment-bulk-assign'),
    path('assignments/<uuid:pk>/', views.CoachAssignmentViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='assignment-detail'),
    
    # Sessions de coaching
    path('sessions/', views.CoachingSessionViewSet.as_view({
        'get': 'list',
        'post': 'create'
    }), name='session-list'),
    path('sessions/<uuid:pk>/', views.CoachingSessionViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='session-detail'),
    
      # Actions sur les tâches

    path('sessions/<uuid:pk>/start/', views.CoachingSessionViewSet.as_view({
        'post': 'start'
    }), name='start-session'),
    path('sessions/<uuid:pk>/complete/', views.CoachingSessionViewSet.as_view({
        'post': 'complete'
    }), name='complete-session'),
    path('sessions/<uuid:pk>/cancel/', views.CoachingSessionViewSet.as_view({
        'post': 'cancel'
    }), name='cancel-session'),
    path('sessions/<uuid:pk>/evaluation-completed-by-entrepreneur/', views.CoachingSessionViewSet.as_view({
        'post': 'evaluation_completed_by_entrepreneur'
    }), name='evaluation-completed-session'),
    # Actions sur les sessions


    # path('sessions/<uuid:pk>/start/', views.CoachingSessionViewSet.start_session, {'action': 'start'}, name='start-session'),
    # path('sessions/<uuid:pk>/complete/', views.CoachingSessionViewSet.complete_session, name='complete-session'),
    
    # Rapports coaching

    path('<uuid:pk>/performance/', views.CoachViewSet.as_view({
        'get': 'performance'
    }), name='coach-performance'),
    path('<uuid:pk>/entrepreneurs/', views.CoachViewSet.as_view({
        'get': 'entrepreneurs'
    }), name='coach-entrepreneurs'),
   
]
