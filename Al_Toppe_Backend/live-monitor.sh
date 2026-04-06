#!/bin/bash

# Surveillance en temps réel avec refresh automatique

while true; do
    clear
    echo "🔄 Surveillance Temps Réel AL-TOPPE - $(date)"
    echo "=============================================="
    
    # Exécuter le dashboard
    /var/www/al-toppe/admin-dashboard.sh
    
    echo ""
    echo "⏰ Actualisation dans 30 secondes..."
    echo "Press Ctrl+C pour arrêter"
    
    sleep 30
done
