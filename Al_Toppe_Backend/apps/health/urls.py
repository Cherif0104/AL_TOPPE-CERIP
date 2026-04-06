
# Solution temporaire - créer une vue basique
from django.urls import path
from django.http import JsonResponse
from .views import HealthCheckView

urlpatterns = [
    path('', HealthCheckView.as_view(), name='health-check'),
]

