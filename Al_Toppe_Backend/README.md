Al'Toppé - Plateforme de Gestion pour Entrepreneurs Sénégalais
Description
Al'Toppé est une application web et mobile conçue pour accompagner les entrepreneurs du secteur informel au Sénégal. La plateforme offre des outils de gestion financière, de planification d'affaires, et de suivi personnalisé avec un accent particulier sur l'accessibilité et l'adaptation au contexte local.

Fonctionnalités Principales
Pour les Entrepreneurs
📊 Gestion de trésorerie et suivi des revenus/dépenses

📝 Création de plans d'affaires guidés

🔔 Système d'alertes et recommandations intelligentes

📱 Interface adaptée aux faibles niveaux d'alphabétisation

🌐 Fonctionnement offline avec synchronisation

Pour les Coaches
👥 Gestion de portefeuilles d'entrepreneurs
📊 Gestion de trésorerie et suivi des revenus/dépenses

📝 Création de plans d'affaires guidés

📈 Tableaux de bord de performance

⚠️ Détection des cas à risque

📅 Organisation de sessions de coaching

📋 Validation de plans d'affaires

Pour les Bailleurs
💰 Gestion de programmes de financement

📊 Analyse d'impact et de performance

🎯 Identification des entrepreneurs à fort potentiel

📑 Génération de rapports d'impact

🌍 Suivi géographique des bénéficiaires

Installation et Démarrage
Prérequis
Python 3.9+

PostgreSQL 12+

Redis (pour les tâches asynchrones)

Installation
Cloner le repository

bash
git clone https://github.com/Souley97/Al_Toppe_Backend.git
cd altoppe
Créer un environnement virtuel

bash
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate     # Windows
Installer les dépendances

bash
pip install -r requirements_prod.txt
Configuration de la base de données

bash
# Créer la base PostgreSQL
createdb altoppe_db

# Appliquer les migrations
python manage.py migrate
Créer un superutilisateur

bash
python manage.py createsuperuser
Lancer le serveur de développement

bash
python manage.py runserver
Configuration
Variables d'environnement
Créez un fichier .env à la racine du projet :

Déploiement
Production avec Docker
bash
docker-compose -f docker-compose.prod.yml up -d
Déploiement manuel
bash
# Collecter les fichiers statiques
python manage.py collectstatic

# Configurer Gunicorn
gunicorn config.wsgi:application --bind 0.0.0.0:8000

# Configurer Celery pour les tâches asynchrones
celery -A config worker --loglevel=info
Tests
bash
# Lancer tous les tests
python manage.py test

# Tests avec couverture de code
coverage run manage.py test
coverage report
Contribuer
Fork le projet

Créer une branche feature (git checkout -b feature/ma-fonctionnalite)

Commit les changements (git commit -am 'Ajouter une fonctionnalité')

Push sur la branche (git push origin feature/ma-fonctionnalite)

Créer une Pull Request

Licence
Ce projet est sous licence MIT. Voir le fichier LICENSE pour plus de détails.

Support
Pour toute question ou problème :

📧 Email : support@altoppe.sn

📱 WhatsApp : +221 XX XXX XX XX

🌐 Site web : https://www.altoppe.sn

Roadmap
Phase 1 : MVP avec gestion de trésorerie

Phase 2 : Plans d'affaires et alertes

Phase 3 : Module coaching

Phase 4 : Interface bailleurs

Phase 5 : Intégrations paiements mobiles

Al'Toppé - Votre partenaire pour entreprendre au Sénégal 🇸🇳

## Administration

### Accès Django Admin

- URL: `/admin/` (ex: `http://localhost:8000/admin/`)
- Créer un superutilisateur: `python manage.py createsuperuser`
- En-têtes personnalisés: AL-TOPPE Administration déjà configuré dans `altoppe/urls.py`

### Rôles et permissions

- Modèle utilisateur personnalisé: `accounts.User` (`AUTH_USER_MODEL` défini)
- Rôles: `entrepreneur`, `coach`, `bailleur`, `admin`
- L’accès complet au site d’administration nécessite `is_staff=True` (et éventuellement `is_superuser=True`)

### Environnement (développement)

- CORS autorise `http://localhost:3000` pour l’interface React
- Documentation API: `/api/docs/` et `/api/redoc/`