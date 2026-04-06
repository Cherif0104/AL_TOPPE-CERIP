
from .base import *

DEBUG = False
ENVIRONMENT = 'development'

# Base de données : PostgreSQL par défaut ; SQLite si USE_SQLITE=1 (machine sans Postgres)
_USE_SQLITE = os.environ.get('USE_SQLITE', '').lower() in ('1', 'true', 'yes')
if _USE_SQLITE:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('DB_NAME'),
            'USER': os.environ.get('DB_USER'),
            'PASSWORD': os.environ.get('DB_PASSWORD'),
            'HOST': os.environ.get('DB_HOST', 'localhost'),
            'PORT': os.environ.get('DB_PORT', '5432'),
            'OPTIONS': {
                'sslmode': 'disable',
            },
            'CONN_MAX_AGE': 60,
            'CONN_HEALTH_CHECKS': True,
        }
    }

# Configuration CSRF corrigée
ALLOWED_HOSTS = ['*']

CSRF_TRUSTED_ORIGINS = [
    'http://altoppe.sn',
    'https://altoppe.sn',
    'http://www.altoppe.sn',
    'https://api.altoppe.sn',
    'https://www.altoppe.sn',
    'http://www.altoppe.sn',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8081',
    'http://localhost:8000',
    'http://127.0.0.1:8081',
    'http://127.0.0.1:8000',
    'https://test.altoppe.sn',
]

# 🔥 CONFIGURATION CORS CORRECTE - SUPPRIMEZ LE CONFLIT
CORS_ALLOW_ALL_ORIGINS = False

CORS_ALLOWED_ORIGINS = [
    "https://www.altoppe.sn",
    "https://altoppe.sn",
    "https://sign.altoppe.sn",  # ton front hébergé (si applicable)
    "http://localhost:3000",    # dev React
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:8081",    # Expo / React Native web
    "http://127.0.0.1:8081",
    "https://test.altoppe.sn",
]


CORS_ALLOW_CREDENTIALS = True

# Headers CORS autorisés
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# Méthodes autorisées
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

# Cache : LocMem sans Redis si USE_SQLITE (diagnostic local)
if _USE_SQLITE:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'altoppe-local',
        }
    }
else:
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

# Activer Redis pour Celery
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE

# Sécurité développement
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
SECURE_SSL_REDIRECT = False

print("[dev] Configuration developpement (CORS) chargee")