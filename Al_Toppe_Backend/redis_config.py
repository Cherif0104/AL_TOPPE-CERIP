"""
CONFIGURATION REDIS OPTIMISÉE POUR AL-TOPPE
==========================================

Configuration Redis optimisée pour les performances en production :
- Pool de connexions
- Compression des données
- TTL optimisé
- Monitoring
"""

import os
import redis
from django.conf import settings
import logging
import json
import gzip
from typing import Any, Optional

logger = logging.getLogger(__name__)


class OptimizedRedisCache:
    """Cache Redis optimisé avec compression et monitoring"""
    
    def __init__(self):
        self.redis_client = None
        self._connect()
    
    def _connect(self):
        """Établir la connexion Redis avec optimisations"""
        try:
            redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379/1')
            
            # Configuration optimisée pour la production
            self.redis_client = redis.from_url(
                redis_url,
                max_connections=50,
                retry_on_timeout=True,
                socket_keepalive=True,
                socket_keepalive_options={
                    1: 1,  # TCP_KEEPIDLE
                    2: 3,  # TCP_KEEPINTVL
                    3: 5,  # TCP_KEEPCNT
                },
                health_check_interval=30,
                decode_responses=False  # Garder les bytes pour la compression
            )
            
            # Test de connexion
            self.redis_client.ping()
            logger.info("✅ Connexion Redis optimisée établie")
            
        except Exception as e:
            logger.error(f"❌ Erreur connexion Redis: {e}")
            self.redis_client = None
    
    def set(self, key: str, value: Any, timeout: int = 300, compress: bool = True) -> bool:
        """
        Stocker une valeur avec compression optionnelle
        """
        if not self.redis_client:
            return False
        
        try:
            # Sérialiser en JSON
            json_data = json.dumps(value, default=str)
            
            # Compresser si demandé et si la donnée est assez grande
            if compress and len(json_data) > 1024:  # Seuil de 1KB
                compressed_data = gzip.compress(json_data.encode('utf-8'))
                # Ajouter un flag pour indiquer la compression
                compressed_data = b'COMPRESSED:' + compressed_data
                final_data = compressed_data
            else:
                final_data = json_data.encode('utf-8')
            
            # Stocker avec TTL
            result = self.redis_client.setex(
                f"altoppe:{key}",
                timeout,
                final_data
            )
            
            logger.debug(f"Cache SET: {key} ({len(final_data)} bytes)")
            return result
            
        except Exception as e:
            logger.error(f"Erreur cache SET {key}: {e}")
            return False
    
    def get(self, key: str, decompress: bool = True) -> Optional[Any]:
        """
        Récupérer une valeur avec décompression automatique
        """
        if not self.redis_client:
            return None
        
        try:
            raw_data = self.redis_client.get(f"altoppe:{key}")
            
            if raw_data is None:
                return None
            
            # Vérifier si les données sont compressées
            if raw_data.startswith(b'COMPRESSED:'):
                if decompress:
                    compressed_data = raw_data[11:]  # Enlever le préfixe
                    json_data = gzip.decompress(compressed_data).decode('utf-8')
                else:
                    return raw_data
            else:
                json_data = raw_data.decode('utf-8')
            
            # Désérialiser JSON
            value = json.loads(json_data)
            logger.debug(f"Cache GET: {key}")
            return value
            
        except Exception as e:
            logger.error(f"Erreur cache GET {key}: {e}")
            return None
    
    def delete(self, key: str) -> bool:
        """Supprimer une clé du cache"""
        if not self.redis_client:
            return False
        
        try:
            result = self.redis_client.delete(f"altoppe:{key}")
            logger.debug(f"Cache DELETE: {key}")
            return result > 0
        except Exception as e:
            logger.error(f"Erreur cache DELETE {key}: {e}")
            return False
    
    def get_stats(self) -> dict:
        """Obtenir les statistiques du cache Redis"""
        if not self.redis_client:
            return {}
        
        try:
            info = self.redis_client.info()
            return {
                'connected_clients': info.get('connected_clients', 0),
                'used_memory': info.get('used_memory_human', '0B'),
                'used_memory_peak': info.get('used_memory_peak_human', '0B'),
                'keyspace_hits': info.get('keyspace_hits', 0),
                'keyspace_misses': info.get('keyspace_misses', 0),
                'hit_rate': self._calculate_hit_rate(info),
                'uptime': info.get('uptime_in_seconds', 0),
            }
        except Exception as e:
            logger.error(f"Erreur stats Redis: {e}")
            return {}
    
    def _calculate_hit_rate(self, info: dict) -> float:
        """Calculer le taux de succès du cache"""
        hits = info.get('keyspace_hits', 0)
        misses = info.get('keyspace_misses', 0)
        total = hits + misses
        
        if total == 0:
            return 0.0
        
        return round((hits / total) * 100, 2)
    
    def warm_up_cache(self, entrepreneur_id: str):
        """Précharger le cache pour un utilisateur"""
        try:
            from apps.finances.optimizations import OptimizedCashflowQueries
            
            # Précharger les données fréquemment utilisées
            OptimizedCashflowQueries.get_dashboard_data_optimized(entrepreneur_id)
            OptimizedCashflowQueries.get_cashflow_entries_optimized(entrepreneur_id, 0, 20)
            
            logger.info(f"Cache préchargé pour l'entrepreneur: {entrepreneur_id}")
            
        except Exception as e:
            logger.error(f"Erreur préchargement cache: {e}")
    
    def invalidate_user_cache(self, entrepreneur_id: str):
        """Invalider le cache d'un utilisateur"""
        try:
            # Pattern des clés à supprimer
            patterns = [
                f"dashboard_financial_{entrepreneur_id}_*",
                f"cashflow_entries_{entrepreneur_id}_*",
                f"budgets_{entrepreneur_id}_*",
            ]
            
            for pattern in patterns:
                # Utiliser SCAN pour trouver les clés correspondantes
                keys = []
                cursor = 0
                
                while True:
                    cursor, found_keys = self.redis_client.scan(
                        cursor=cursor,
                        match=f"altoppe:{pattern}",
                        count=100
                    )
                    keys.extend(found_keys)
                    
                    if cursor == 0:
                        break
                
                # Supprimer les clés trouvées
                if keys:
                    self.redis_client.delete(*keys)
                    logger.info(f"Cache invalidé: {len(keys)} clés supprimées")
            
        except Exception as e:
            logger.error(f"Erreur invalidation cache: {e}")


# Instance globale du cache optimisé
optimized_cache = OptimizedRedisCache()


# Configuration Django pour utiliser le cache optimisé
def get_cache_config():
    """Retourne la configuration de cache optimisée"""
    return {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': os.environ.get('REDIS_URL', 'redis://localhost:6379/1'),
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                'CONNECTION_POOL_KWARGS': {
                    'max_connections': 50,
                    'retry_on_timeout': True,
                    'socket_keepalive': True,
                    'socket_keepalive_options': {
                        1: 1,  # TCP_KEEPIDLE
                        2: 3,  # TCP_KEEPINTVL
                        3: 5,  # TCP_KEEPCNT
                    },
                    'health_check_interval': 30,
                },
                'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
                'IGNORE_EXCEPTIONS': True,
            },
            'KEY_PREFIX': 'altoppe_optimized',
            'TIMEOUT': 300,
        }
    }


# Middleware pour le monitoring du cache
class CacheMonitoringMiddleware:
    """Middleware pour monitorer les performances du cache"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Avant la requête
        start_time = time.time()
        
        response = self.get_response(request)
        
        # Après la requête
        duration = time.time() - start_time
        
        # Log des performances
        if duration > 1.0:  # Requêtes lentes
            logger.warning(f"Requête lente: {request.path} - {duration:.2f}s")
        
        return response


# Utilitaires pour le cache
def cache_performance_test():
    """Test de performance du cache"""
    import time
    
    test_data = {
        'test_key': 'test_value',
        'numbers': list(range(1000)),
        'nested': {'key1': 'value1', 'key2': [1, 2, 3, 4, 5]}
    }
    
    # Test SET
    start = time.time()
    optimized_cache.set('perf_test', test_data, compress=True)
    set_time = time.time() - start
    
    # Test GET
    start = time.time()
    retrieved_data = optimized_cache.get('perf_test')
    get_time = time.time() - start
    
    # Test compression
    uncompressed_size = len(json.dumps(test_data).encode('utf-8'))
    optimized_cache.set('perf_test_compressed', test_data, compress=True)
    compressed_data = optimized_cache.redis_client.get('altoppe:perf_test_compressed')
    compressed_size = len(compressed_data)
    
    compression_ratio = (1 - compressed_size / uncompressed_size) * 100
    
    results = {
        'set_time': round(set_time * 1000, 2),  # ms
        'get_time': round(get_time * 1000, 2),  # ms
        'compression_ratio': round(compression_ratio, 2),
        'uncompressed_size': uncompressed_size,
        'compressed_size': compressed_size,
    }
    
    logger.info(f"Test performance cache: {results}")
    return results


if __name__ == "__main__":
    # Test de performance
    cache_performance_test()

