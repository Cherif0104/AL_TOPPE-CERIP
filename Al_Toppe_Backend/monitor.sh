#!/bin/bash

echo "🔍 SANTÉ DU SYSTÈME - $(date)"

echo "📊 Utilisation disque:"
df -h / | awk 'NR==2{print $3 " utilisés sur " $2 " (" $5 ")"}'

echo "🐳 Statut Docker:"
docker system df

echo "🌐 Services en ligne:"
if curl -s -f https://api.altoppe.sn/health/ > /dev/null; then
    echo "✅ API: EN LIGNE"
else
    echo "❌ API: HORS LIGNE"
fi

if curl -s -f https://www.altoppe.sn/ > /dev/null; then
    echo "✅ Frontend: EN LIGNE" 
else
    echo "❌ Frontend: HORS LIGNE"
fi

echo "📦 Containers:"
docker-compose ps --services | while read service; do
    if [ "$(docker-compose ps -q $service)" ]; then
        echo "✅ $service: RUNNING"
    else
        echo "❌ $service: STOPPED"
    fi
done

echo "🔒 Certificats SSL:"
if openssl s_client -connect api.altoppe.sn:443 -servername api.altoppe.sn < /dev/null 2>/dev/null | openssl x509 -noout -checkend 864000; then
    echo "✅ SSL: VALIDE (plus de 10 jours)"
else
    echo "⚠️  SSL: BIENTÔT EXPIRÉ"
fi
