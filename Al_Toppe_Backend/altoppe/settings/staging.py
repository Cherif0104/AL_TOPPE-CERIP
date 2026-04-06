"""
Configuration pour l'environnement de staging
"""

import os
from .production import *

# ============================================================================
# CONFIGURATION STAGING
# ============================================================================

ENVIRONMENT = 'staging'
DEBUG = False  # Garder False même en staging

# ============================================================================
# CONFIGURATION DE LA BASE DE DONNÉES - STAGING
# ============================================================================

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'altoppe_staging'),
        'USER': os.environ.get('DB_USER', 'altoppe_staging_user'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
        'OPTIONS': {
            'sslmode': 'prefer',  # Moins strict que la production
        },
        'CONN_MAX_AGE': 30,
        'CONN_HEALTH_CHECKS': True,
    }
}

# ============================================================================
# CONFIGURATION SÉCURITÉ - STAGING
# ============================================================================

# Sécurité moins stricte que la production
SECURE_SSL_REDIRECT = False  # Peut être False selon l'infrastructure
SECURE_HSTS_SECONDS = 0  # Désactiver HSTS en staging

# Cookies moins stricts
SESSION_COOKIE_SECURE = False  # Peut être False selon l'infrastructure
CSRF_COOKIE_SECURE = False

# ============================================================================
# CONFIGURATION CORS - STAGING
# ============================================================================

# CORS plus permissif en staging
CORS_ALLOWED_ORIGINS = os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',')
CORS_ALLOWED_ORIGINS = [origin.strip() for origin in CORS_ALLOWED_ORIGINS if origin.strip()]

# Ajouter des origines de test
CORS_ALLOWED_ORIGINS.extend([
    'http://localhost:3000',
    'http://localhost:8081',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8081',
])

# ============================================================================
# CONFIGURATION CACHE - STAGING
# ============================================================================

# Cache Redis en staging
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': os.environ.get('REDIS_URL', 'redis://localhost:6379/2'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 20,
                'retry_on_timeout': True,
            },
        },
        'KEY_PREFIX': 'altoppe_staging',
        'TIMEOUT': 300,
    }
}

# ============================================================================
# CONFIGURATION EMAIL - STAGING
# ============================================================================

# Email backend pour staging (peut être console ou SMTP de test)
EMAIL_BACKEND = os.environ.get('EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend')

# ============================================================================
# CONFIGURATION LOGGING - STAGING
# ============================================================================

# Logging pour staging
LOGGING['handlers']['file']['filename'] = BASE_DIR / 'logs' / 'staging.log'
LOGGING['handlers']['error_file']['filename'] = BASE_DIR / 'logs' / 'staging_error.log'

# ============================================================================
# CONFIGURATION SENTRY - STAGING
# ============================================================================

# Sentry pour staging (peut être le même DSN ou un différent)
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[
            DjangoIntegration(),
            CeleryIntegration(),
        ],
        traces_sample_rate=0.5,  # Plus de traces en staging
        send_default_pii=False,
        environment=ENVIRONMENT,
    )

# ============================================================================
# CONFIGURATION THROTTLING - STAGING
# ============================================================================

# Throttling plus permissif en staging
REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {
    'anon': '100/hour',
    'user': '1000/hour',
    'burst': '200/hour',
}

# ============================================================================
# CONFIGURATION IA VOICE - STAGING
# ============================================================================

# Configuration IA pour staging
AI_DEBUG_MODE = True  # Activer le debug en staging
AI_VOICE_TEST_MODE = True

# ============================================================================
# CONFIGURATION BACKUP - STAGING
# ============================================================================

# Backups moins fréquents en staging
BACKUP_SCHEDULE = '0 4 * * 0'  # Une fois par semaine
BACKUP_RETENTION_DAYS = 7

# ============================================================================
# CONFIGURATION SPÉCIFIQUE STAGING
# ============================================================================

# Ajouter des outils de debug en staging
INSTALLED_APPS += [
    'django_extensions',
]

# ============================================================================
# CONFIGURATION FINALE
# ============================================================================

print(f"🧪 Configuration de staging chargée pour AL-TOPPE")
print(f"🔒 Sécurité: HTTPS optionnel")
print(f"📊 Base de données: PostgreSQL (staging)")
print(f"🌐 CORS: Origines étendues")
print(f"📧 Email: Backend configurable")
print(f"📊 Cache: Redis (staging)")
print(f"🔍 Debug IA: Activé")
print(f"🔍 Debug: Désactivé")

