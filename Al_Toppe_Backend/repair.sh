#!/bin/bash

echo "🔧 RÉPARATION URGENCE AL-TOPPE"
git pull origin offlin
echo "1. Arrêt des services..."
docker-compose down

echo "2. Nettoyage Docker..."
docker system prune -f

echo "3. Vérification des images..."
docker images | grep al-toppe

echo "4. Reconstruction de l'application..."
docker-compose build --no-cache web

echo "5. Démarrage base de données..."
docker-compose up -d db redis
sleep 15

echo "6. Vérification PostgreSQL..."
docker-compose exec db pg_isready -U $POSTGRES_USER || echo "❌ PostgreSQL non prêt"

echo "7. Démarrage application..."
docker-compose up -d web
sleep 10

echo "8. Test application interne..."
docker-compose exec web python -c "
import requests
try:
    r = requests.get('http://localhost:8000/health/', timeout=5)
    print('✅ Application interne:', r.status_code)
except Exception as e:
    print('❌ Application interne:', e)
"

echo "9. Démarrage NGINX..."
docker-compose up -d nginx
sleep 5

echo "10. Test final..."
curl -s -o /dev/null -w "%{http_code}" https://api.altoppe.sn/health/ && echo " ✅ API OK" || echo " ❌ API KO"

echo "🔧 RÉPARATION TERMINÉE"
