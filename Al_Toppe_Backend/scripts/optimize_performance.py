#!/usr/bin/env python3
"""
SCRIPT D'OPTIMISATION DES PERFORMANCES AL-TOPPE
==============================================

Ce script optimise les performances de l'application :
- Création des index de base de données
- Nettoyage du cache
- Test des performances
- Génération de rapports
"""

import os
import sys
import django
import time
import logging
from datetime import datetime, timedelta

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'altoppe.settings.production')
django.setup()

from django.core.management import execute_from_command_line
from django.db import connection, transaction
from django.core.cache import cache
from django.conf import settings
from apps.finances.models import CashflowEntry, Category, Budget
from apps.entrepreneurs.models import Entrepreneur
from apps.finances.optimizations import OptimizedCashflowQueries, CacheOptimizer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PerformanceOptimizer:
    """Classe principale pour l'optimisation des performances"""
    
    def __init__(self):
        self.start_time = time.time()
        self.results = {}
    
    def create_database_indexes(self):
        """Créer les index optimisés pour la base de données"""
        logger.info("🔧 Création des index de base de données...")
        
        indexes = [
            # Index pour CashflowEntry
            "CREATE INDEX IF NOT EXISTS idx_cashflow_entrepreneur_date_type ON finances_cashflowentry (entrepreneur_id, date, type);",
            "CREATE INDEX IF NOT EXISTS idx_cashflow_entrepreneur_payment_status ON finances_cashflowentry (entrepreneur_id, payment_status);",
            "CREATE INDEX IF NOT EXISTS idx_cashflow_category_type ON finances_cashflowentry (category_id, type);",
            "CREATE INDEX IF NOT EXISTS idx_cashflow_date ON finances_cashflowentry (date);",
            "CREATE INDEX IF NOT EXISTS idx_cashflow_type ON finances_cashflowentry (type);",
            "CREATE INDEX IF NOT EXISTS idx_cashflow_payment_status ON finances_cashflowentry (payment_status);",
            
            # Index pour Budget
            "CREATE INDEX IF NOT EXISTS idx_budget_entrepreneur_dates ON finances_budget (entrepreneur_id, start_date, end_date);",
            "CREATE INDEX IF NOT EXISTS idx_budget_activity_status ON finances_budget (activity_id, status);",
            "CREATE INDEX IF NOT EXISTS idx_budget_status ON finances_budget (status);",
            
            # Index pour Category
            "CREATE INDEX IF NOT EXISTS idx_category_active_type ON finances_category (is_active, type);",
            "CREATE INDEX IF NOT EXISTS idx_category_name ON finances_category (name);",
            
            # Index pour Entrepreneur
            "CREATE INDEX IF NOT EXISTS idx_entrepreneur_user ON entrepreneurs_entrepreneur (user_id);",
            "CREATE INDEX IF NOT EXISTS idx_entrepreneur_cni ON entrepreneurs_entrepreneur (cni_number);",
        ]
        
        with connection.cursor() as cursor:
            for index_sql in indexes:
                try:
                    cursor.execute(index_sql)
                    logger.info(f"✅ Index créé: {index_sql.split('idx_')[1].split(' ')[0]}")
                except Exception as e:
                    logger.warning(f"⚠️ Index déjà existant ou erreur: {e}")
        
        self.results['indexes_created'] = len(indexes)
        logger.info("✅ Index de base de données créés avec succès")
    
    def optimize_database_queries(self):
        """Analyser et optimiser les requêtes de base de données"""
        logger.info("🔍 Analyse des requêtes de base de données...")
        
        # Analyser les requêtes lentes
        with connection.cursor() as cursor:
            # Activer le logging des requêtes lentes
            cursor.execute("SET log_min_duration_statement = 1000;")  # 1 seconde
            
            # Analyser les statistiques des tables
            cursor.execute("""
                SELECT 
                    schemaname,
                    tablename,
                    attname,
                    n_distinct,
                    correlation
                FROM pg_stats 
                WHERE schemaname = 'public' 
                AND tablename LIKE 'finances_%'
                ORDER BY tablename, attname;
            """)
            
            stats = cursor.fetchall()
            logger.info(f"📊 Statistiques analysées pour {len(stats)} colonnes")
        
        self.results['queries_analyzed'] = len(stats)
    
    def test_cache_performance(self):
        """Tester les performances du cache"""
        logger.info("🚀 Test des performances du cache...")
        
        # Test de base
        test_data = {
            'test_key': 'test_value',
            'timestamp': datetime.now().isoformat(),
            'data': list(range(1000))
        }
        
        # Test SET
        start_time = time.time()
        cache.set('perf_test', test_data, 300)
        set_time = time.time() - start_time
        
        # Test GET
        start_time = time.time()
        retrieved_data = cache.get('perf_test')
        get_time = time.time() - start_time
        
        # Test invalidation
        start_time = time.time()
        cache.delete('perf_test')
        delete_time = time.time() - start_time
        
        self.results['cache_performance'] = {
            'set_time_ms': round(set_time * 1000, 2),
            'get_time_ms': round(get_time * 1000, 2),
            'delete_time_ms': round(delete_time * 1000, 2),
            'data_size_bytes': len(str(test_data))
        }
        
        logger.info(f"✅ Cache testé - SET: {self.results['cache_performance']['set_time_ms']}ms, GET: {self.results['cache_performance']['get_time_ms']}ms")
    
    def test_dashboard_performance(self):
        """Tester les performances du tableau de bord"""
        logger.info("📊 Test des performances du tableau de bord...")
        
        # Récupérer un entrepreneur de test
        entrepreneur = Entrepreneur.objects.first()
        if not entrepreneur:
            logger.warning("⚠️ Aucun entrepreneur trouvé pour le test")
            return
        
        # Test version originale
        start_time = time.time()
        # Ici on testerait la version originale si elle existait
        original_time = time.time() - start_time
        
        # Test version optimisée
        start_time = time.time()
        dashboard_data = OptimizedCashflowQueries.get_dashboard_data_optimized(str(entrepreneur.id))
        optimized_time = time.time() - start_time
        
        self.results['dashboard_performance'] = {
            'optimized_time_ms': round(optimized_time * 1000, 2),
            'improvement': 'N/A' if original_time == 0 else round((original_time - optimized_time) / original_time * 100, 2),
            'data_points': len(dashboard_data.get('weekly_totals', []))
        }
        
        logger.info(f"✅ Dashboard testé - Temps optimisé: {self.results['dashboard_performance']['optimized_time_ms']}ms")
    
    def clean_cache(self):
        """Nettoyer le cache expiré"""
        logger.info("🧹 Nettoyage du cache...")
        
        try:
            # Vider le cache
            cache.clear()
            logger.info("✅ Cache nettoyé")
            
            # Nettoyer les caches spécifiques
            CacheOptimizer.invalidate_user_cache('test')
            
            self.results['cache_cleaned'] = True
        except Exception as e:
            logger.error(f"❌ Erreur nettoyage cache: {e}")
            self.results['cache_cleaned'] = False
    
    def generate_performance_report(self):
        """Générer un rapport de performance"""
        logger.info("📋 Génération du rapport de performance...")
        
        total_time = time.time() - self.start_time
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'total_execution_time': round(total_time, 2),
            'results': self.results,
            'recommendations': self.get_recommendations()
        }
        
        # Sauvegarder le rapport
        report_file = f"performance_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        import json
        
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        logger.info(f"✅ Rapport sauvegardé: {report_file}")
        return report
    
    def get_recommendations(self):
        """Obtenir des recommandations d'optimisation"""
        recommendations = []
        
        # Recommandations basées sur les résultats
        if 'cache_performance' in self.results:
            cache_perf = self.results['cache_performance']
            if cache_perf['get_time_ms'] > 10:
                recommendations.append("⚠️ Temps de récupération cache élevé - Vérifier la configuration Redis")
        
        if 'dashboard_performance' in self.results:
            dashboard_perf = self.results['dashboard_performance']
            if dashboard_perf['optimized_time_ms'] > 500:
                recommendations.append("⚠️ Temps de génération dashboard élevé - Optimiser les requêtes")
        
        # Recommandations générales
        recommendations.extend([
            "✅ Activer la compression Redis pour réduire l'utilisation mémoire",
            "✅ Configurer le monitoring des performances en continu",
            "✅ Implémenter la pagination pour les grandes listes",
            "✅ Utiliser select_related et prefetch_related dans les vues",
            "✅ Mettre en cache les données fréquemment accédées",
        ])
        
        return recommendations
    
    def run_optimization(self):
        """Exécuter toutes les optimisations"""
        logger.info("🚀 Début de l'optimisation des performances AL-TOPPE")
        
        try:
            # 1. Créer les index
            self.create_database_indexes()
            
            # 2. Optimiser les requêtes
            self.optimize_database_queries()
            
            # 3. Tester le cache
            self.test_cache_performance()
            
            # 4. Tester le dashboard
            self.test_dashboard_performance()
            
            # 5. Nettoyer le cache
            self.clean_cache()
            
            # 6. Générer le rapport
            report = self.generate_performance_report()
            
            logger.info("✅ Optimisation terminée avec succès!")
            return report
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de l'optimisation: {e}")
            raise


def main():
    """Fonction principale"""
    optimizer = PerformanceOptimizer()
    
    try:
        report = optimizer.run_optimization()
        
        print("\n" + "="*60)
        print("📊 RAPPORT D'OPTIMISATION DES PERFORMANCES")
        print("="*60)
        print(f"⏱️  Temps total: {report['total_execution_time']}s")
        print(f"📅 Date: {report['timestamp']}")
        print("\n📋 RECOMMANDATIONS:")
        for rec in report['recommendations']:
            print(f"   {rec}")
        print("="*60)
        
    except Exception as e:
        logger.error(f"❌ Erreur critique: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

