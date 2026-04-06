"""
Configuration de base pour AL-TOPPE
Partagée entre tous les environnements
"""

import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent
SITE_ID = 1


# ============================================================================
# CONFIGURATION DE BASE
# ============================================================================

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-m9@s2r+%+x=wrzp^(g$-9(--l^8q&o611tnse&f9w@n#k^g@kz')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'

# Environnement
ENVIRONMENT = os.environ.get('ENVIRONMENT', 'development').lower()

# Allowed hosts
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1,192.168.54.96').split(',')

# ============================================================================
# CONFIGURATION DE LA BASE DE DONNÉES
# ============================================================================

# Configuration par défaut (SQLite pour développement)
# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.sqlite3',
#         'NAME': BASE_DIR / 'db.sqlite3',
#     }
# }

# Configuration PostgreSQL si spécifiée
if os.environ.get('DB_ENGINE') == 'django.db.backends.postgresql':
    DATABASES = {
        'default': {
            'ENGINE': os.environ.get('DB_ENGINE', 'django.db.backends.postgresql'),
            'NAME': os.environ.get('DB_NAME'),
            'USER': os.environ.get('DB_USER'),
            'PASSWORD': os.environ.get('DB_PASSWORD'),
            'HOST': os.environ.get('DB_HOST'),
            'PORT': os.environ.get('DB_PORT'),
            'OPTIONS': {
                'sslmode': 'prefer',
            },
        }
    }

# ============================================================================
# CONFIGURATION DES APPLICATIONS
# ============================================================================

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',
    'django.contrib.humanize',
    'django.contrib.admindocs',

    # Third party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    'drf_spectacular',
    'drf_spectacular_sidecar',

    # Local apps
    'apps.accounts',
    'apps.entrepreneurs',
    'apps.finances',
    'apps.business_plans',
    'apps.alerts_ai',
    'apps.coaches',
    'apps.bailleurs',
    'apps.production',
    'apps.analytics',
    'apps.reports',
    'apps.ai',
    'apps.admin_api',
    'apps.health',
]

# ============================================================================
# CONFIGURATION MIDDLEWARE
# ============================================================================

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# ============================================================================
# CONFIGURATION DES URLS
# ============================================================================

ROOT_URLCONF = 'altoppe.urls'

# ============================================================================
# CONFIGURATION DES TEMPLATES
# ============================================================================

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# ============================================================================
# CONFIGURATION WSGI
# ============================================================================

WSGI_APPLICATION = 'altoppe.wsgi.application'

# ============================================================================
# CONFIGURATION D'AUTHENTIFICATION
# ============================================================================

AUTH_USER_MODEL = 'accounts.User'

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# ============================================================================
# CONFIGURATION INTERNATIONALISATION
# ============================================================================

LANGUAGE_CODE = os.environ.get('DEFAULT_LANGUAGE', 'fr')
LANGUAGES = [
    ('fr', 'Français'),
    ('wo', 'Wolof'),
]
TIME_ZONE = 'Africa/Dakar'
USE_I18N = True
USE_TZ = True

# ============================================================================
# CONFIGURATION DES FICHIERS STATIQUES
# ============================================================================

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / os.environ.get('STATIC_ROOT', 'staticfiles')
STATICFILES_DIRS = [
    BASE_DIR / 'static',
]
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / os.environ.get('MEDIA_ROOT', 'media')
# AJOUTEZ cette configuration pour les fichiers statiques
STATICFILES_FINDERS = [
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
]
# ============================================================================
# CONFIGURATION REST FRAMEWORK
# ============================================================================

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.BasicAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 800,
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'EXCEPTION_HANDLER': 'rest_framework.views.exception_handler',
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour',
    },
}

# ============================================================================
# CONFIGURATION JWT
# ============================================================================

SIMPLE_JWT = {
   'ACCESS_TOKEN_LIFETIME': timedelta(days=90),   # 3 mois
    'REFRESH_TOKEN_LIFETIME': timedelta(days=90),  # 3 mois aussi
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,
    'JWK_URL': None,
    'LEEWAY': 0,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'USER_AUTHENTICATION_RULE': 'rest_framework_simplejwt.authentication.default_user_authentication_rule',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
    'TOKEN_USER_CLASS': 'rest_framework_simplejwt.models.TokenUser',
    'JTI_CLAIM': 'jti',
    'SLIDING_TOKEN_REFRESH_EXP_CLAIM': 'refresh_exp',
    'SLIDING_TOKEN_LIFETIME': timedelta(minutes=5),
    'SLIDING_TOKEN_REFRESH_LIFETIME': timedelta(days=7),
}

# ============================================================================
# CONFIGURATION CORS
# ============================================================================

CORS_ALLOWED_ORIGINS = os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',')
CORS_ALLOWED_ORIGINS = [origin.strip() for origin in CORS_ALLOWED_ORIGINS if origin.strip()]

if not CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGINS = [
        'http://localhost:8081',
        'http://192.168.54.96:8081',
        'http://127.0.0.1:8081',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3001',
        'https://www.altoppe.sn',
        'https://altoppe.sn',
        'https://test.altoppe.sn',
    ]

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = DEBUG  # Allow all origins in development

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

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

CORS_PREFLIGHT_MAX_AGE = 86400  # 24 hours

# ============================================================================
# CONFIGURATION SPECTACULAR (API Documentation)
# ============================================================================

SPECTACULAR_SETTINGS = {
    'TITLE': 'AL-TOPPE API',
    'DESCRIPTION': 'API pour la plateforme de gestion d\'entreprise AL-TOPPE',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'SWAGGER_UI_DIST': 'SIDECAR',
    'SWAGGER_UI_FAVICON_HREF': 'SIDECAR',
    'REDOC_DIST': 'SIDECAR',
    'COMPONENT_SPLIT_REQUEST': True,
    'SORT_OPERATIONS': False,
}

# ============================================================================
# CONFIGURATION DES LOGS
# ============================================================================

LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'file': {
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'django.log',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': LOG_LEVEL,
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': LOG_LEVEL,
            'propagate': False,
        },
        'altoppe': {
            'handlers': ['console', 'file'],
            'level': LOG_LEVEL,
            'propagate': False,
        },
    },
}

# ============================================================================
# CONFIGURATION CELERY (Tâches asynchrones)
# ============================================================================

CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE

# ============================================================================
# CONFIGURATION CACHE
# ============================================================================

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': os.environ.get('REDIS_URL', 'redis://localhost:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'KEY_PREFIX': 'altoppe',
        'TIMEOUT': 300,  # 5 minutes
    }
}

# ============================================================================
# CONFIGURATION EMAIL
# ============================================================================

EMAIL_BACKEND = os.environ.get('EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True').lower() == 'true'
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'AL-TOPPE <noreply@altoppe.sn>')

# ============================================================================
# CONFIGURATION SPÉCIFIQUE AL-TOPPE
# ============================================================================

# Limites métier
MIN_TRANSACTION_AMOUNT = int(os.environ.get('MIN_TRANSACTION_AMOUNT', '100'))
MAX_TRANSACTION_AMOUNT = int(os.environ.get('MAX_TRANSACTION_AMOUNT', '10000000'))

# Configuration SMS
SMS_VERIFICATION_ENABLED = os.environ.get('SMS_VERIFICATION_ENABLED', 'True').lower() == 'true'
SMS_OTP_EXPIRY_MINUTES = int(os.environ.get('SMS_OTP_EXPIRY_MINUTES', '5'))

# Configuration IA
AI_VOICE_ENABLED = os.environ.get('AI_VOICE_ENABLED', 'True').lower() == 'true'
AI_CONFIDENCE_THRESHOLD = float(os.environ.get('AI_CONFIDENCE_THRESHOLD', '0.7'))

# Configuration multilingue
DEFAULT_LANGUAGE = os.environ.get('DEFAULT_LANGUAGE', 'fr')
SUPPORTED_LANGUAGES = os.environ.get('SUPPORTED_LANGUAGES', 'fr,wo').split(',')

# ============================================================================
# CONFIGURATION PAR DÉFAUT
# ============================================================================

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Créer le dossier logs s'il n'existe pas
(BASE_DIR / 'logs').mkdir(exist_ok=True)