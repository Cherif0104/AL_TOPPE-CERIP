#!/bin/bash

set -e  # Arrête le script en cas d'erreur

echo "🧹 Arrêt des services..."
docker-compose down

echo "🐳 Reconstruction des images..."
docker-compose build --no-cache --pull web

echo "🚀 Démarrage de la base et de Redis..."
docker-compose up -d db redis

echo "⏳ Attente de la disponibilité de Postgres..."
for i in {1..30}; do
    if docker-compose exec db pg_isready -U $POSTGRES_USER; then
        echo "✅ PostgreSQL est prêt"
        break
    fi
    echo "⏱️  Attente de PostgreSQL... ($i/30)"
    sleep 2
done

echo "🗃️ Application des migrations..."
docker-compose exec web python manage.py migrate --noinput

echo "📦 Collecte des fichiers statiques..."
docker-compose exec web python manage.py collectstatic --noinput --clear

echo "🌍 Démarrage du backend..."
docker-compose up -d web

echo "⏳ Vérification que l'application Django répond..."
for i in {1..20}; do
    if curl -f http://localhost:8000/health/ > /dev/null 2>&1; then
        echo "✅ Django est opérationnel"
        break
    fi
    echo "⏱️  Attente de Django... ($i/20)"
    sleep 3
done

echo "🔧 Démarrage NGINX..."
docker-compose up -d nginx

echo "⏳ Vérification que NGINX répond..."
sleep 5
if curl -f https://api.altoppe.sn/health/ > /dev/null 2>&1; then
    echo "✅ NGINX et SSL sont opérationnels"
else
    echo "⚠️  NGINX peut avoir besoin de plus de temps"
fi

echo "✅ Vérification finale des services..."
docker-compose ps

echo "📊 Statut des services :"
docker-compose ps --format "table {{.Name}}\t{{.State}}\t{{.Ports}}"

echo "🎉 DÉPLOIEMENT TERMINÉ AVEC SUCCÈS !"
