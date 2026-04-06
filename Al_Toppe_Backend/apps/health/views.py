

from django.http import JsonResponse
from django.views import View
import datetime

class HealthCheckView(View):
    def get(self, request):
        try:
            # Test ultra simple
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            
            return JsonResponse({
                'status': 'healthy',
                'timestamp': datetime.datetime.now().isoformat(),
                'service': 'altoppe-api'
            })
            
        except Exception as e:
            return JsonResponse({
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.datetime.now().isoformat()
            }, status=503)


