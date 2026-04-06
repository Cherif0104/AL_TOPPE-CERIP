"""
Configuration pour l'environnement de test (CI/CD)
"""

from .base import *
import os

# ============================================================================
# CONFIGURATION TEST
# ============================================================================

DEBUG = False
ENVIRONMENT = 'test'

# ============================================================================
# CONFIGURATION DE LA BASE DE DONNÉES - TEST
# ============================================================================

# Configuration PostgreSQL pour les tests CI/CD
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'altoppe'),
        'USER': os.environ.get('DB_USER', 'postgres'),
        'PASSWORD': os.environ.get('DB_PASSWORD', 'postgres'),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
        'TEST': {
            'NAME': 'altoppe_ci',
        },
    }
}

# ============================================================================
# CONFIGURATION CACHE - TEST
# ============================================================================

# Utiliser un cache mémoire pour les tests
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    }
}

# ============================================================================
# CONFIGURATION EMAIL - TEST
# ============================================================================

EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

# ============================================================================
# CONFIGURATION CELERY - TEST
# ============================================================================

# Exécuter les tâches de manière synchrone pour les tests
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# ============================================================================
# CONFIGURATION LOGGING - TEST
# ============================================================================

# Logging minimal pour les tests
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING',
    },
}

# ============================================================================
# CONFIGURATION SÉCURITÉ - TEST
# ============================================================================

# Sécurité allégée pour les tests
SECRET_KEY = 'test-secret-key-for-ci-cd-only'
ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'testserver']

# ============================================================================
# CONFIGURATION CORS - TEST
# ============================================================================

CORS_ALLOW_ALL_ORIGINS = True

# ============================================================================
# CONFIGURATION SPÉCIFIQUE TEST
# ============================================================================

# Désactiver les migrations pour les tests (plus rapide)
class DisableMigrations:
    def __contains__(self, item):
        return True
    
    def __getitem__(self, item):
        return None

# Utiliser seulement en mode test rapide (optionnel)
# MIGRATION_MODULES = DisableMigrations()

# Configuration pour les tests
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',  # Plus rapide pour les tests
]

# Désactiver les tâches asynchrones
AI_VOICE_ENABLED = False
SMS_VERIFICATION_ENABLED = False

print(f"🧪 Configuration de test chargée pour AL-TOPPE")
print(f"📊 Base de données: PostgreSQL (test)")
print(f"🔍 Debug: {'Activé' if DEBUG else 'Désactivé'}")
print(f"✅ Configuration test chargée")