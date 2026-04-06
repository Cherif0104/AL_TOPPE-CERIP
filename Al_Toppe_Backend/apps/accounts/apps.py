from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.accounts'
    verbose_name = 'Gestion des comptes utilisateurs'
    
    def ready(self):
        """Configuration à l'initialisation de l'app"""
        import apps.accounts.signals
