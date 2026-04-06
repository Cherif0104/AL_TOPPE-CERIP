from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'admin_api'

router = DefaultRouter()
router.register(r'users', views.AdminUserViewSet, basename='admin-users')

urlpatterns = [
    path('stats/', views.AdminStatsView.as_view(), name='stats'),
    path('analytics/', views.AdminAnalyticsView.as_view(), name='analytics'),
    path('settings/', views.AdminSettingsView.as_view(), name='settings'),
    path('monitoring/', views.SystemMonitoringView.as_view(), name='system-monitoring'),
    path('health/', include('apps.health.urls')),
    path('', include(router.urls)),
]

