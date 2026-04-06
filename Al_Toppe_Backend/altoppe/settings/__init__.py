"""
Settings package for AL-TOPPE
"""

import os

# Déterminer l'environnement
environment = os.environ.get('DJANGO_ENV', 'development')

if environment == 'production':
    from .production import *
elif environment == 'staging':
    from .staging import *
elif environment == 'test':
    from .test import *
    print("✅ Configuration test chargée")
else:
    from .development import *
