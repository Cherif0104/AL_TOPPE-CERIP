"""
URLs principales du projet AL-TOPPE
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from rest_framework.permissions import AllowAny
from apps.health.views import HealthCheckView


urlpatterns = [
    # Interface d'administration Django
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('admin/', admin.site.urls),
 
 
     # API Schema & Docs (public accès)
    path("api/schema/", SpectacularAPIView.as_view(permission_classes=[AllowAny]), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema", permission_classes=[AllowAny]), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema", permission_classes=[AllowAny]), name="redoc"),

    # API REST
    path('api/', include([
        # Module d'authentification
        path('health/', include('apps.health.urls')),
        path('auth/', include('apps.accounts.urls')),
        
        # Module entrepreneurs
        path('entrepreneurs/', include('apps.entrepreneurs.urls')),
        
        # Module finances
        path('finances/', include('apps.finances.urls')),
        
        # Module business plans
        path('business-plans/', include('apps.business_plans.urls')),
        
        # Module alerts & IA
        path('alerts_ai/', include('apps.alerts_ai.urls')),
        
        # Module coaching
        path('coaching/', include('apps.coaches.urls')),
        
        # Module bailleurs
        path('bailleurs/', include('apps.bailleurs.urls')),
        
        # Module production
        path('production/', include('apps.production.urls')),
        
        # Module analytics
        path('analytics/', include('apps.analytics.urls')),
        
        # Module reports
        path('reports/', include('apps.reports.urls')),
        
        # Module ai
        path('ai/', include('apps.ai.urls')),
        
        # Admin API (REST)
        path('admin/', include('apps.admin_api.urls')),
        
    ])),
    
    # URLs de l'application principale
]

# Configuration des fichiers statiques et médias en développement
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Configuration de l'interface d'administration
admin.site.site_header = "AL-TOPPE Administration"
admin.site.site_title = "AL-TOPPE Admin"
admin.site.index_title = "Bienvenue dans l'administration d'AL-TOPPE"



from apps.health.views import HealthCheckView

urlpatterns += [
    path('health/', HealthCheckView.as_view(), name='health-check'),
]

from apps.health.views import HealthCheckView

urlpatterns += [
    path('health/', HealthCheckView.as_view(), name='health-check'),
]

from apps.health.views import HealthCheckView

urlpatterns += [
    path('health/', HealthCheckView.as_view(), name='health-check'),
]

from apps.health.views import HealthCheckView

urlpatterns += [
    path('health/', HealthCheckView.as_view(), name='health-check'),
]

from apps.health.views import HealthCheckView

urlpatterns += [
    path('health/', HealthCheckView.as_view(), name='health-check'),
]

from apps.health.views import HealthCheckView

urlpatterns += [
    path('health/', HealthCheckView.as_view(), name='health-check'),
]
