"""
Vues de santé pour vérifier l'état de l'application
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.db import connection
from django.core.cache import cache
import time


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Endpoint de santé pour vérifier l'état de l'application
    """
    start_time = time.time()
    
    try:
        # Vérifier la base de données
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            db_status = "OK"
    except Exception as e:
        db_status = f"ERROR: {str(e)}"
    
    # Vérifier le cache
    try:
        cache.set('health_check', 'test', 10)
        cache_status = "OK" if cache.get('health_check') == 'test' else "ERROR"
    except Exception as e:
        cache_status = f"ERROR: {str(e)}"
    
    response_time = round((time.time() - start_time) * 1000, 2)
    
    return Response({
        'status': 'healthy',
        'timestamp': time.time(),
        'response_time_ms': response_time,
        'database': db_status,
        'cache': cache_status,
        'version': '1.0.0'
    }, status=status.HTTP_200_OK)

