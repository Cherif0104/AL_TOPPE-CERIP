# 🚀 Guide de Déploiement AL-TOPPE

Ce guide explique comment déployer AL-TOPPE en utilisant Docker et les configurations de production.

## 📋 Prérequis

### **Système**
- Docker 20.10+
- Docker Compose 2.0+
- Git
- 4GB RAM minimum
- 20GB espace disque

### **Services Externes**
- PostgreSQL (ou utiliser le conteneur fourni)
- Redis (ou utiliser le conteneur fourni)
- Domaine et certificats SSL (production)
- Services de paiement (Orange Money, Wave)
- Services SMS (Twilio)

## 🔧 Configuration Initiale

### **1. Cloner le Repository**
```bash
git clone https://github.com/your-org/altoppe.git
cd altoppe/Django
```

### **2. Configuration des Variables d'Environnement**
```bash
# Copier le fichier d'exemple
cp env.example .env

# Éditer les variables selon votre environnement
nano .env
```

### **3. Variables d'Environnement Critiques**

#### **Production**
```env
# Sécurité
SECRET_KEY=your-super-secret-key-here
DEBUG=False
ENVIRONMENT=production

# Base de données
DB_ENGINE=django.db.backends.postgresql
DB_NAME=altoppe_prod
DB_USER=altoppe_user
DB_PASSWORD=your-secure-password
DB_HOST=db
DB_PORT=5432

# Redis
REDIS_URL=redis://:your-redis-password@redis:6379/0
CELERY_BROKER_URL=redis://:your-redis-password@redis:6379/0

# CORS
CORS_ALLOWED_ORIGINS=https://your-domain.com,https://app.your-domain.com
ALLOWED_HOSTS=your-domain.com,app.your-domain.com

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# Services externes
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
OPENAI_API_KEY=your-openai-key

# Monitoring
SENTRY_DSN=your-sentry-dsn
```

## 🐳 Déploiement avec Docker

### **Développement**
```bash
# Démarrer l'environnement de développement
docker-compose up -d

# Vérifier les logs
docker-compose logs -f

# Accéder à l'application
# http://localhost:8000
```

### **Production**
```bash
# Utiliser le script de déploiement
chmod +x scripts/deploy.sh
./scripts/deploy.sh production deploy

# Ou manuellement
docker-compose -f docker-compose.prod.yml up -d
```

## 📊 Services Inclus

### **Base de Données PostgreSQL**
- **Port**: 5432
- **Utilisateur**: postgres
- **Base**: altoppe_db
- **Sauvegarde**: Automatique quotidienne

### **Cache Redis**
- **Port**: 6379
- **Mot de passe**: Configuré via REDIS_URL
- **Utilisation**: Cache et sessions

### **Application Django**
- **Port**: 8000
- **Workers**: 3 (production)
- **Timeout**: 120s

### **Celery Worker**
- **Tâches**: Emails, SMS, IA
- **Concurrence**: 2 workers

### **Nginx**
- **Ports**: 80, 443
- **SSL**: Certificats requis
- **Load Balancing**: Multiple workers Django

## 🔒 Configuration SSL

### **1. Générer les Certificats**
```bash
# Let's Encrypt (recommandé)
certbot certonly --standalone -d your-domain.com

# Copier les certificats
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./ssl/cert.pem
cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./ssl/key.pem
```

### **2. Configuration Nginx SSL**
Le fichier `nginx.prod.conf` est déjà configuré pour SSL.

## 📈 Monitoring et Logs

### **Logs**
```bash
# Logs de l'application
docker-compose logs -f web

# Logs de la base de données
docker-compose logs -f db

# Logs Nginx
docker-compose logs -f nginx
```

### **Monitoring**
- **Health Check**: `https://your-domain.com/health/`
- **Metrics**: `https://your-domain.com/metrics/` (restreint)
- **Sentry**: Configuration automatique si DSN fourni

## 🔄 Sauvegarde et Restauration

### **Sauvegarde Automatique**
```bash
# Sauvegarde quotidienne automatique
# Fichiers dans ./backups/
```

### **Sauvegarde Manuelle**
```bash
# Base de données
docker-compose exec db pg_dump -U postgres altoppe_db > backup.sql

# Fichiers media
tar -czf media_backup.tar.gz ./media/
```

### **Restauration**
```bash
# Restaurer la base de données
docker-compose exec -T db psql -U postgres altoppe_db < backup.sql

# Restaurer les fichiers media
tar -xzf media_backup.tar.gz
```

## 🛠️ Maintenance

### **Mises à Jour**
```bash
# Mise à jour du code
git pull origin main

# Reconstruction des images
docker-compose build --no-cache

# Redémarrage des services
docker-compose restart
```

### **Migrations**
```bash
# Exécuter les migrations
docker-compose exec web python manage.py migrate

# Collecter les fichiers statiques
docker-compose exec web python manage.py collectstatic --noinput
```

### **Nettoyage**
```bash
# Nettoyer les images inutilisées
docker system prune -f

# Nettoyer les volumes
docker volume prune -f
```

## 🚨 Dépannage

### **Problèmes Courants**

#### **1. Base de Données Non Accessible**
```bash
# Vérifier la connexion
docker-compose exec web python manage.py dbshell

# Vérifier les logs
docker-compose logs db
```

#### **2. Redis Non Accessible**
```bash
# Tester Redis
docker-compose exec redis redis-cli ping

# Vérifier la configuration
docker-compose exec web python manage.py shell
>>> from django.core.cache import cache
>>> cache.set('test', 'value')
>>> cache.get('test')
```

#### **3. Fichiers Statiques Non Servis**
```bash
# Collecter les fichiers statiques
docker-compose exec web python manage.py collectstatic --noinput

# Vérifier les permissions
docker-compose exec web ls -la staticfiles/
```

#### **4. SSL Non Fonctionnel**
```bash
# Vérifier les certificats
openssl x509 -in ./ssl/cert.pem -text -noout

# Tester la connexion SSL
openssl s_client -connect your-domain.com:443
```

### **Logs de Debug**
```bash
# Activer le debug temporairement
echo "DEBUG=True" >> .env
docker-compose restart web

# Vérifier les logs détaillés
docker-compose logs -f web
```

## 📞 Support

### **Commandes Utiles**
```bash
# Statut des services
./scripts/deploy.sh production status

# Accès au shell Django
./scripts/deploy.sh production shell

# Exécution des tests
./scripts/deploy.sh production test

# Logs en temps réel
./scripts/deploy.sh production logs
```

### **Contact**
- **Email**: support@altoppe.sn
- **Documentation**: https://docs.altoppe.sn
- **Issues**: https://github.com/your-org/altoppe/issues

## 🔄 Mise à Jour

### **Procédure de Mise à Jour**
1. **Sauvegarde** de la base de données
2. **Test** en environnement de staging
3. **Déploiement** en production
4. **Vérification** de la santé de l'application
5. **Monitoring** des erreurs

### **Rollback**
```bash
# En cas de problème, revenir à la version précédente
git checkout previous-commit
./scripts/deploy.sh production deploy
```

---

**AL-TOPPE** - Votre partenaire pour entreprendre au Sénégal 🇸🇳



