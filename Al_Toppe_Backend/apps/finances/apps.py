from django.apps import AppConfig


class FinancesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.finances'
    verbose_name = 'Gestion Financière'
    
    def ready(self):
        """Configuration à l'initialisation de l'app"""
        import apps.finances.signals
