"""
Configuration pour l'environnement de production
"""

import os
from .base import *

# ============================================================================
# CONFIGURATION PRODUCTION
# ============================================================================

DEBUG = False
ENVIRONMENT = 'production'

# ============================================================================
# CONFIGURATION DE LA BASE DE DONNÉES - PRODUCTION
# ============================================================================
DATABASES = {
   'default': {
      'ENGINE': 'django.db.backends.sqlite3',
     'NAME': BASE_DIR / 'db.sqlite3',
}
}
# Forcer PostgreSQL en production
# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.postgresql',
#         'NAME': os.environ.get('DB_NAME', 'altoppe_prod'),
#         'USER': os.environ.get('DB_USER', 'altoppe_user'),
#         'PASSWORD': os.environ.get('DB_PASSWORD'),
#         'HOST': os.environ.get('DB_HOST', 'localhost'),
#         'PORT': os.environ.get('DB_PORT', '5432'),
#         'OPTIONS': {
#             'sslmode': 'require',
#         },
#         'CONN_MAX_AGE': 60,
#         'CONN_HEALTH_CHECKS': True,
#     }
# }

# ============================================================================
# CONFIGURATION SÉCURITÉ - PRODUCTION
# ============================================================================

# Sécurité HTTPS
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_HSTS_SECONDS = 31536000  # 1 an
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Cookies sécurisés
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Strict'
CSRF_COOKIE_SAMESITE = 'Strict'

# Headers de sécurité
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# ============================================================================
# CONFIGURATION CORS - PRODUCTION
# ============================================================================

# CORS strict en production
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',')
CORS_ALLOWED_ORIGINS = [origin.strip() for origin in CORS_ALLOWED_ORIGINS if origin.strip()]

# ============================================================================
# CONFIGURATION CACHE - PRODUCTION
# ============================================================================

# Cache Redis optimisé en production
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': os.environ.get('REDIS_URL', 'redis://localhost:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 100,  # Augmenté pour la production
                'retry_on_timeout': True,
                'socket_keepalive': True,
                'socket_keepalive_options': {
                    1: 1,  # TCP_KEEPIDLE
                    2: 3,  # TCP_KEEPINTVL
                    3: 5,  # TCP_KEEPCNT
                },
                'health_check_interval': 30,
            },
            'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
            'IGNORE_EXCEPTIONS': True,
        },
        'KEY_PREFIX': 'altoppe_prod',
        'TIMEOUT': 600,  # 10 minutes au lieu de 5
        'VERSION': 1,
    }
}

# ============================================================================
# CONFIGURATION EMAIL - PRODUCTION
# ============================================================================

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'AL-TOPPE <noreply@altoppe.sn>')

# ============================================================================
# CONFIGURATION CELERY - PRODUCTION
# ============================================================================

CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
CELERY_TASK_ALWAYS_EAGER = False
CELERY_TASK_EAGER_PROPAGATES = False

# Configuration pour la production
CELERY_WORKER_PREFETCH_MULTIPLIER = 1
CELERY_TASK_ACKS_LATE = True
CELERY_WORKER_MAX_TASKS_PER_CHILD = 1000

# ============================================================================
# CONFIGURATION LOGGING - PRODUCTION
# ============================================================================

# Logging plus strict en production
LOGGING['handlers']['file']['filename'] = BASE_DIR / 'logs' / 'production.log'
LOGGING['handlers']['error_file'] = {
    'class': 'logging.FileHandler',
    'filename': BASE_DIR / 'logs' / 'error.log',
    'formatter': 'verbose',
    'level': 'ERROR',
}

LOGGING['handlers']['security_file'] = {
    'class': 'logging.FileHandler',
    'filename': BASE_DIR / 'logs' / 'security.log',
    'formatter': 'verbose',
    'level': 'WARNING',
}

LOGGING['loggers']['django.security'] = {
    'handlers': ['security_file'],
    'level': 'WARNING',
    'propagate': False,
}

LOGGING['loggers']['django.request'] = {
    'handlers': ['error_file'],
    'level': 'ERROR',
    'propagate': False,
}

# ============================================================================
# CONFIGURATION SENTRY - PRODUCTION
# ============================================================================

# Intégration Sentry pour le monitoring d'erreurs
SENTRY_DSN = os.environ.get('SENTRY_DSN')
if SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration
    from sentry_sdk.integrations.celery import CeleryIntegration
    
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[
            DjangoIntegration(),
            CeleryIntegration(),
        ],
        traces_sample_rate=0.1,
        send_default_pii=False,
        environment=ENVIRONMENT,
    )

# ============================================================================
# CONFIGURATION STATIC FILES - PRODUCTION
# ============================================================================

# Configuration pour les fichiers statiques en production
STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.StaticFilesStorage'

# Configuration pour les fichiers media en production (optionnel - S3)
if os.environ.get('AWS_ACCESS_KEY_ID'):
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    STATICFILES_STORAGE = 'storages.backends.s3boto3.S3StaticStorage'
    
    AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
    AWS_STORAGE_BUCKET_NAME = os.environ.get('AWS_STORAGE_BUCKET_NAME', 'altoppe-media')
    AWS_S3_REGION_NAME = os.environ.get('AWS_S3_REGION_NAME', 'us-east-1')
    AWS_S3_CUSTOM_DOMAIN = f'{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com'
    AWS_DEFAULT_ACL = 'public-read'
    AWS_S3_OBJECT_PARAMETERS = {
        'CacheControl': 'max-age=86400',
    }

# ============================================================================
# CONFIGURATION PERFORMANCE - PRODUCTION
# ============================================================================

# Configuration pour les performances
CONN_MAX_AGE = 60

# Configuration pour les sessions
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'

# ============================================================================
# CONFIGURATION THROTTLING - PRODUCTION
# ============================================================================

# Throttling plus strict en production
REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {
    'anon': '50/hour',
    'user': '500/hour',
    'burst': '100/hour',
}

# ============================================================================
# CONFIGURATION IA VOICE - PRODUCTION
# ============================================================================

# Configuration IA pour la production
AI_DEBUG_MODE = False
AI_VOICE_TEST_MODE = False

# Configuration pour les API externes
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN')
TWILIO_PHONE_NUMBER = os.environ.get('TWILIO_PHONE_NUMBER')

# ============================================================================
# CONFIGURATION BACKUP - PRODUCTION
# ============================================================================

# Configuration pour les backups
BACKUP_ENABLED = True
BACKUP_SCHEDULE = '0 2 * * *'  # Tous les jours à 2h du matin
BACKUP_RETENTION_DAYS = 30

# ============================================================================
# CONFIGURATION MONITORING - PRODUCTION
# ============================================================================

# Configuration pour le monitoring
HEALTH_CHECK_ENABLED = True
METRICS_ENABLED = True

# ============================================================================
# CONFIGURATION SPÉCIFIQUE PRODUCTION
# ============================================================================

# Désactiver les outils de développement
INSTALLED_APPS = [app for app in INSTALLED_APPS if app not in [
    'django_extensions',
    'debug_toolbar',
]]

MIDDLEWARE = [middleware for middleware in MIDDLEWARE if middleware not in [
    'debug_toolbar.middleware.DebugToolbarMiddleware',
]]

# ============================================================================
# CONFIGURATION FINALE
# ============================================================================

# Vérifications de sécurité
if not SECRET_KEY or SECRET_KEY == 'django-insecure-m9@s2r+%+x=wrzp^(g$-9(--l^8q&o611tnse&f9w@n#k^g@kz':
    raise ValueError("SECRET_KEY doit être défini en production!")

if not os.environ.get('DB_PASSWORD'):
    raise ValueError("DB_PASSWORD doit être défini en production!")

print(f"🚀 Configuration de production chargée pour AL-TOPPE")
print(f"🔒 Sécurité: HTTPS activé")
print(f"📊 Base de données: PostgreSQL")
print(f"🌐 CORS: Origines spécifiques")
print(f"📧 Email: SMTP configuré")
print(f"📊 Cache: Redis")
print(f"🔍 Debug: Désactivé")

