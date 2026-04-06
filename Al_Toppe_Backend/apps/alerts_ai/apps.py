from django.apps import AppConfig


class AlertsAiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.alerts_ai'
    verbose_name = 'Alertes & IA'
    
    def ready(self):
        try:
            import apps.alerts_ai.signals
        except ImportError:
            pass
