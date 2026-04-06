#!/bin/bash
# Script de déploiement pour AL-TOPPE

set -e  # Arrêter en cas d'erreur

# ============================================================================
# CONFIGURATION
# ============================================================================

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
ENVIRONMENT=${1:-production}
COMPOSE_FILE="docker-compose.yml"
BACKUP_DIR="./backups"
LOG_DIR="./logs"

# ============================================================================
# FONCTIONS UTILITAIRES
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_requirements() {
    log_info "Vérification des prérequis..."
    
    # Vérifier Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker n'est pas installé"
        exit 1
    fi
    
    # Vérifier Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose n'est pas installé"
        exit 1
    fi
    
    # Vérifier le fichier .env
    if [ ! -f .env ]; then
        log_error "Fichier .env manquant"
        exit 1
    fi
    
    log_success "Prérequis vérifiés"
}

create_directories() {
    log_info "Création des répertoires nécessaires..."
    
    mkdir -p $BACKUP_DIR
    mkdir -p $LOG_DIR
    mkdir -p ./ssl
    
    log_success "Répertoires créés"
}

backup_database() {
    log_info "Sauvegarde de la base de données..."
    
    if [ "$ENVIRONMENT" = "production" ]; then
        COMPOSE_FILE="docker-compose.prod.yml"
        
        # Sauvegarde PostgreSQL
        docker-compose -f $COMPOSE_FILE exec -T db pg_dump -U ${DB_USER:-altoppe_user} ${DB_NAME:-altoppe_prod} > $BACKUP_DIR/db_backup_$(date +%Y%m%d_%H%M%S).sql
        
        log_success "Base de données sauvegardée"
    else
        log_info "Sauvegarde non nécessaire pour l'environnement $ENVIRONMENT"
    fi
}

pull_images() {
    log_info "Téléchargement des images Docker..."
    
    docker-compose -f $COMPOSE_FILE pull
    
    log_success "Images téléchargées"
}

build_images() {
    log_info "Construction des images Docker..."
    
    docker-compose -f $COMPOSE_FILE build --no-cache
    
    log_success "Images construites"
}

stop_services() {
    log_info "Arrêt des services existants..."
    
    docker-compose -f $COMPOSE_FILE down
    
    log_success "Services arrêtés"
}

start_services() {
    log_info "Démarrage des services..."
    
    if [ "$ENVIRONMENT" = "production" ]; then
        COMPOSE_FILE="docker-compose.prod.yml"
        docker-compose -f $COMPOSE_FILE up -d
    else
        docker-compose -f $COMPOSE_FILE up -d
    fi
    
    log_success "Services démarrés"
}

wait_for_services() {
    log_info "Attente du démarrage des services..."
    
    # Attendre que la base de données soit prête
    timeout=60
    while [ $timeout -gt 0 ]; do
        if docker-compose -f $COMPOSE_FILE exec -T db pg_isready -U ${DB_USER:-postgres} > /dev/null 2>&1; then
            break
        fi
        sleep 2
        timeout=$((timeout-2))
    done
    
    if [ $timeout -le 0 ]; then
        log_error "Timeout lors de l'attente de la base de données"
        exit 1
    fi
    
    log_success "Services prêts"
}

run_migrations() {
    log_info "Exécution des migrations..."
    
    docker-compose -f $COMPOSE_FILE exec -T web python manage.py migrate
    
    log_success "Migrations exécutées"
}

collect_static() {
    log_info "Collecte des fichiers statiques..."
    
    docker-compose -f $COMPOSE_FILE exec -T web python manage.py collectstatic --noinput
    
    log_success "Fichiers statiques collectés"
}

create_superuser() {
    log_info "Création du superutilisateur..."
    
    # Vérifier si un superutilisateur existe déjà
    if docker-compose -f $COMPOSE_FILE exec -T web python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); print('Superuser exists:', User.objects.filter(is_superuser=True).exists())" | grep -q "True"; then
        log_info "Superutilisateur existe déjà"
    else
        log_warning "Création d'un superutilisateur par défaut"
        docker-compose -f $COMPOSE_FILE exec -T web python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(is_superuser=True).exists():
    User.objects.create_superuser('admin', 'admin@altoppe.sn', 'admin123')
    print('Superutilisateur créé')
"
    fi
    
    log_success "Superutilisateur configuré"
}

run_tests() {
    log_info "Exécution des tests..."
    
    docker-compose -f $COMPOSE_FILE exec -T web python manage.py test --verbosity=2
    
    log_success "Tests exécutés avec succès"
}

health_check() {
    log_info "Vérification de la santé de l'application..."
    
    # Attendre que l'application soit prête
    timeout=60
    while [ $timeout -gt 0 ]; do
        if curl -f http://localhost:8000/health/ > /dev/null 2>&1; then
            break
        fi
        sleep 2
        timeout=$((timeout-2))
    done
    
    if [ $timeout -le 0 ]; then
        log_error "L'application n'est pas accessible"
        exit 1
    fi
    
    log_success "Application accessible"
}

show_status() {
    log_info "Statut des services:"
    docker-compose -f $COMPOSE_FILE ps
    
    log_info "Logs récents:"
    docker-compose -f $COMPOSE_FILE logs --tail=20
}

cleanup() {
    log_info "Nettoyage des images inutilisées..."
    
    docker system prune -f
    docker volume prune -f
    
    log_success "Nettoyage terminé"
}

# ============================================================================
# FONCTION PRINCIPALE
# ============================================================================

deploy() {
    log_info "Déploiement d'AL-TOPPE en environnement $ENVIRONMENT"
    
    # Vérifier les prérequis
    check_requirements
    
    # Créer les répertoires
    create_directories
    
    # Sauvegarder la base de données (production uniquement)
    backup_database
    
    # Arrêter les services existants
    stop_services
    
    # Construire les images
    build_images
    
    # Démarrer les services
    start_services
    
    # Attendre que les services soient prêts
    wait_for_services
    
    # Exécuter les migrations
    run_migrations
    
    # Collecter les fichiers statiques
    collect_static
    
    # Créer le superutilisateur
    create_superuser
    
    # Vérifier la santé de l'application
    health_check
    
    # Afficher le statut
    show_status
    
    log_success "Déploiement terminé avec succès!"
    log_info "Application accessible sur: http://localhost:8000"
    log_info "Documentation API: http://localhost:8000/api/docs/"
    log_info "Interface d'administration: http://localhost:8000/admin/"
}

# ============================================================================
# GESTION DES COMMANDES
# ============================================================================

case "${2:-deploy}" in
    deploy)
        deploy
        ;;
    backup)
        backup_database
        ;;
    restore)
        log_info "Restauration de la base de données..."
        # TODO: Implémenter la restauration
        ;;
    test)
        run_tests
        ;;
    status)
        show_status
        ;;
    cleanup)
        cleanup
        ;;
    logs)
        docker-compose -f $COMPOSE_FILE logs -f
        ;;
    shell)
        docker-compose -f $COMPOSE_FILE exec web python manage.py shell
        ;;
    migrate)
        run_migrations
        ;;
    collectstatic)
        collect_static
        ;;
    *)
        echo "Usage: $0 {production|staging} {deploy|backup|restore|test|status|cleanup|logs|shell|migrate|collectstatic}"
        echo ""
        echo "Environnements:"
        echo "  production  - Déploiement en production"
        echo "  staging     - Déploiement en staging"
        echo ""
        echo "Commandes:"
        echo "  deploy      - Déploiement complet (défaut)"
        echo "  backup      - Sauvegarde de la base de données"
        echo "  restore     - Restauration de la base de données"
        echo "  test        - Exécution des tests"
        echo "  status      - Statut des services"
        echo "  cleanup     - Nettoyage des images Docker"
        echo "  logs        - Affichage des logs en temps réel"
        echo "  shell       - Accès au shell Django"
        echo "  migrate     - Exécution des migrations"
        echo "  collectstatic - Collecte des fichiers statiques"
        exit 1
        ;;
esac


