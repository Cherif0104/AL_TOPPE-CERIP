from django.apps import AppConfig


class BusinessPlansConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.business_plans'
    verbose_name = 'Plans d\'affaires'
    
    def ready(self):
        try:
            import apps.business_plans.signals
        except ImportError:
            pass
