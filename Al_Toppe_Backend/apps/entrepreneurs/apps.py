from django.apps import AppConfig


class EntrepreneursConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.entrepreneurs'
    verbose_name = 'Gestion des entrepreneurs'
    
    def ready(self):
        """Configuration à l'initialisation de l'app"""
        import apps.entrepreneurs.signals
