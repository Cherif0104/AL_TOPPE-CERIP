from django.apps import AppConfig


class AiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.ai'
    verbose_name = 'AI & Voice Interface'

    def ready(self):
        # Import signals to ensure they are registered
        from . import signals  # noqa: F401


