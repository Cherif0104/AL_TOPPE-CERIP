📚 DOCUMENTATION COMPLÈTE DE DÉPLOIEMENT AL-TOPPE
📋 SOMMAIRE
Prérequis Système

Configuration du Serveur

Déploiement de l'Application

Configuration Production

Sécurité et Optimisation

Maintenance

Dépannage

🖥️ PRÉREQUIS SYSTÈME
Serveur VPS/Cloud hostinger
RAM : 8 GB (×4 plus que prévu !)

Stockage : 100 GB (×5 plus que prévu !)

CPU : 2 cœurs

OS : Ubuntu 22.04

Accès : Root/SSH

Coûts Estimés
VPS Hostinger KVM 2 : ~117.000 F CFA/2an

Domaine .sn : ~15.000 F CFA/an

Total annuel : ~132.000 F CFA

Ports à Ouvrir
bash
# Ports essentiels
80 (HTTP), 443 (HTTPS), 22 (SSH)
🛠️ CONFIGURATION DU SERVEUR
1. Connexion et Mise à Jour
bash
# Connexion SSH
ssh root@votre-ip-serveur

# Mise à jour système
apt update && apt upgrade -y
apt install -y curl wget git htop
2. Installation des Dépendances Système
bash
# Python et outils
apt install -y python3 python3-pip python3-venv python3-dev

# Base de données
apt install -y postgresql postgresql-contrib libpq-dev

# Serveur web
apt install -y nginx redis-server

# Dépendances multimédias
apt install -y ffmpeg libjpeg-dev libpng-dev libffi-dev

# Sécurité
apt install -y fail2ban ufw
3. Configuration PostgreSQL
bash
# Créer la base de données
sudo -u postgres psql -c "CREATE DATABASE altoppe;"
sudo -u postgres psql -c "CREATE USER altoppe_user WITH PASSWORD 'votre_mot_de_passe_secure';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE altoppe TO altoppe_user;"
sudo -u postgres psql -c "ALTER USER altoppe_user CREATEDB;"
4. Configuration du Firewall
bash
# Configuration UFW
ufw allow ssh
ufw allow http
ufw allow https
ufw enable
🚀 DÉPLOIEMENT DE L'APPLICATION
1. Structure des Dossiers
bash
# Créer la structure
mkdir -p /var/www/al-toppe
cd /var/www/al-toppe
2. Récupération du Code
bash
# Option A - Clone Git (recommandé)
git clone https://github.com/Souley97/Al_Toppe_Backend.git .
# OU avec token
git clone https://TOKEN@github.com/Souley97/Al_Toppe_Backend.git .

# Option B - Téléchargement direct
wget https://github.com/Souley97/Al_Toppe_Backend/archive/refs/heads/main.zip
unzip main.zip
mv Al_Toppe_Backend-main/* .
3. Environnement Python
bash
# Créer l'environnement virtuel
python3 -m venv venv
source venv/bin/activate

# Mettre à jour pip
pip install --upgrade pip

# Installer les dépendances
pip install -r requirements_server.txt
4. Configuration Environnement
bash
# Créer le fichier .env
cat > .env << EOF
DEBUG=False
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(50))")
DATABASE_URL=postgresql://altoppe_user:votre_mot_de_passe@localhost/altoppe
ALLOWED_HOSTS=localhost,127.0.0.1,votre-ip,votre-domaine.sn
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Email
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
DEFAULT_FROM_EMAIL=contact@altoppe.sn

# Fichiers
MEDIA_URL=/media/
MEDIA_ROOT=/var/www/al-toppe/media
STATIC_ROOT=/var/www/al-toppe/staticfiles
EOF
5. Configuration Django
bash
# Appliquer les migrations
python manage.py migrate

# Collecter les fichiers statiques
python manage.py collectstatic --noinput

# Vérifier la configuration
python manage.py check

# Créer le superutilisateur
python manage.py createsuperuser --username admin --email admin@altoppe.sn
⚙️ CONFIGURATION PRODUCTION
1. Service Systemd (Gunicorn)
bash
sudo tee /etc/systemd/system/al-toppe.service > /dev/null << EOF
[Unit]
Description=AL-TOPPE Gunicorn Service
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/al-toppe
Environment=DJANGO_ENV=production
Environment=DJANGO_SETTINGS_MODULE=altoppe.settings
Environment=PATH=/var/www/al-toppe/venv/bin
ExecStart=/var/www/al-toppe/venv/bin/gunicorn \\
    --workers 3 \\
    --bind 127.0.0.1:8000 \\
    --access-logfile /var/log/gunicorn/access.log \\
    --error-logfile /var/log/gunicorn/error.log \\
    --timeout 120 \\
    altoppe.wsgi:application

[Install]
WantedBy=multi-user.target
EOF
2. Configuration Nginx
bash
sudo tee /etc/nginx/sites-available/al-toppe > /dev/null << EOF
server {
    listen 80;
    server_name votre-domaine.sn www.votre-domaine.sn;
    client_max_body_size 100M;

    # Fichiers statiques
    location /static/ {
        alias /var/www/al-toppe/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Fichiers médias
    location /media/ {
        alias /var/www/al-toppe/media/;
        expires 1y;
        add_header Cache-Control "public";
    }

    # Application Django
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Host \$http_host;
        proxy_redirect off;
        proxy_connect_timeout 75s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    # Health check
    location /health/ {
        access_log off;
        return 200 "healthy\\n";
        add_header Content-Type text/plain;
    }
}
EOF
3. Activation des Services
bash
# Créer les dossiers de logs
sudo mkdir -p /var/log/gunicorn
sudo chown -R www-data:www-data /var/log/gunicorn

# Activer le site Nginx
sudo ln -s /etc/nginx/sites-available/al-toppe /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Tester Nginx
sudo nginx -t

# Démarrer les services
sudo systemctl daemon-reload
sudo systemctl enable al-toppe
sudo systemctl start al-toppe
sudo systemctl restart nginx
🔒 SÉCURITÉ ET OPTIMISATION
1. Configuration SSL avec Let's Encrypt
bash
# Installation Certbot
apt install -y certbot python3-certbot-nginx

# Obtenir le certificat SSL
certbot --nginx -d votre-domaine.sn -d www.votre-domaine.sn

# Renouvellement automatique
echo "0 12 * * * root /usr/bin/certbot renew --quiet" >> /etc/crontab
2. Sécurité Django Production
bash
# Vérifier la sécurité
python manage.py check --deploy

# Variables de sécurité critiques
SECRET_KEY=clé_secrète_complexe
DEBUG=False
ALLOWED_HOSTS=votre-domaine.sn,www.votre-domaine.sn,votre-ip
3. Optimisations Performance
bash
# Configuration Nginx optimisée
sudo tee /etc/nginx/nginx.conf > /dev/null << EOF
user www-data;
worker_processes auto;
pid /run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    # Optimisations de base
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;
    
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
EOF
4. Sauvegardes Automatiques
bash
# Script de sauvegarde
cat > /usr/local/bin/backup-altoppe.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/al-toppe"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Sauvegarde base de données
sudo -u postgres pg_dump altoppe > $BACKUP_DIR/altoppe_db_$DATE.sql

# Sauvegarde fichiers médias
tar -czf $BACKUP_DIR/altoppe_media_$DATE.tar.gz /var/www/al-toppe/media/

# Sauvegarde code (optionnel)
tar -czf $BACKUP_DIR/altoppe_code_$DATE.tar.gz /var/www/al-toppe/ --exclude=venv --exclude=*.log

# Nettoyage vieilles sauvegardes (garder 30 jours)
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Sauvegarde AL-TOPPE du $DATE terminée"
EOF

chmod +x /usr/local/bin/backup-altoppe.sh

# Ajouter au crontab
echo "0 2 * * * /usr/local/bin/backup-altoppe.sh" | crontab -
🔄 MAINTENANCE
1. Mises à Jour de Sécurité
bash
# Mises à jour système automatiques
apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades

# Mises à jour application
cd /var/www/al-toppe
git pull origin main
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
sudo systemctl restart al-toppe
2. Monitoring
bash
# Installation monitoring basique
apt install -y htop nmon nethogs

# Script de santé
cat > /usr/local/bin/health-check.sh << 'EOF'
#!/bin/bash
echo "=== SANTÉ AL-TOPPE ==="
echo "Date: $(date)"
echo "Uptime: $(uptime)"
echo "CPU: $(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1"%"}')"
echo "RAM: $(free -m | awk 'NR==2{printf "%.2f%%", $3*100/$2}')"
echo "Disque: $(df -h / | awk 'NR==2{print $5}')"

# Vérification services
services=("al-toppe" "nginx" "postgresql" "redis")
for service in "${services[@]}"; do
    if systemctl is-active --quiet $service; then
        echo "✅ $service: ACTIF"
    else
        echo "❌ $service: INACTIF"
    fi
done

# Test application
if curl -s -f http://localhost/health/ > /dev/null; then
    echo "✅ Application: ACCESSIBLE"
else
    echo "❌ Application: INACCESSIBLE"
fi
EOF

chmod +x /usr/local/bin/health-check.sh
3. Logs et Surveillance
bash
# Configuration rotation des logs
cat > /etc/logrotate.d/al-toppe << EOF
/var/log/gunicorn/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    copytruncate
}
EOF
🐛 DÉPANNAGE
1. Vérification des Services
bash
# Statut des services
sudo systemctl status al-toppe
sudo systemctl status nginx
sudo systemctl status postgresql

# Logs en temps réel
sudo journalctl -u al-toppe -f
sudo tail -f /var/log/nginx/error.log
2. Problèmes Courants et Solutions
Erreur CSRF
bash
# Ajouter dans .env
ALLOWED_HOSTS=votre-ip,votre-domaine.sn,localhost,127.0.0.1
CSRF_TRUSTED_ORIGINS=http://votre-ip,https://votre-ip,http://votre-domaine.sn,https://votre-domaine.sn
Erreur Base de Données
bash
# Vérifier PostgreSQL
sudo systemctl status postgresql
sudo -u postgres psql -c "\l"

# Réappliquer les migrations
python manage.py migrate
Erreur Permissions
bash
# Corriger les permissions
sudo chown -R www-data:www-data /var/www/al-toppe
sudo chmod -R 755 /var/www/al-toppe
sudo -u www-data mkdir -p media staticfiles
Erreur Static Files
bash
# Recréer les fichiers statiques
python manage.py collectstatic --noinput --clear

# Vérifier les permissions Nginx
sudo chown -R www-data:www-data /var/www/al-toppe/staticfiles/
3. Script de Diagnostic
bash
cat > /usr/local/bin/diagnostic-altoppe.sh << 'EOF'
#!/bin/bash
echo "=== DIAGNOSTIC AL-TOPPE ==="

# 1. Services
echo "1. SERVICES:"
services=("al-toppe" "nginx" "postgresql" "redis")
for service in "${services[@]}"; do
    status=$(systemctl is-active $service 2>/dev/null)
    if [ "$status" = "active" ]; then
        echo "   ✅ $service: $status"
    else
        echo "   ❌ $service: $status"
    fi
done

# 2. Ports
echo "2. PORTS:"
netstat -tlnp | grep -E "(80|443|5432|6379|8000)" | while read line; do
    echo "   📍 $line"
done

# 3. Application
echo "3. APPLICATION:"
if curl -s http://localhost/health/ > /dev/null; then
    echo "   ✅ Application accessible"
else
    echo "   ❌ Application inaccessible"
    echo "   Logs Gunicorn:"
    sudo journalctl -u al-toppe -n 10 --no-pager
fi

# 4. Base de données
echo "4. BASE DE DONNÉES:"
cd /var/www/al-toppe
source venv/bin/activate
if python manage.py check --database default > /dev/null 2>&1; then
    echo "   ✅ Base de données accessible"
else
    echo "   ❌ Erreur base de données"
fi

echo "=== DIAGNOSTIC TERMINÉ ==="
EOF

chmod +x /usr/local/bin/diagnostic-altoppe.sh
📞 SUPPORT ET CONTACT
Informations de Support
Documentation : Incluse dans le dossier /docs/

Logs : /var/log/gunicorn/ et /var/log/nginx/

Configuration : /var/www/al-toppe/.env

Services : systemctl status al-toppe

Procédures d'Urgence
bash
# Redémarrage complet
sudo systemctl restart al-toppe nginx postgresql

# Restauration sauvegarde
/usr/local/bin/backup-altoppe.sh

# Mode maintenance
sudo systemctl stop al-toppe
# Effectuer les corrections
sudo systemctl start al-toppe
✅ CHECKLIST DE DÉPLOIEMENT
Serveur configuré et sécurisé

Dépendances système installées

Base de données PostgreSQL créée

Code application déployé

Environnement Python configuré

Variables d'environnement définies

Migrations Django appliquées

Fichiers statiques collectés

Compte administrateur créé

Gunicorn configuré et actif

Nginx configuré et actif

SSL configuré (optionnel)

Sauvegardes automatisées

Monitoring en place

Documentation mise à jour

