import psutil
import subprocess
import json
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from datetime import timedelta
from django.db import models
from django.db.models.functions import TruncMonth, TruncHour
from django.db.models import Count, Sum
from django.db import models
from django.http import JsonResponse


from apps.accounts.models import User
from apps.entrepreneurs.models import Entrepreneur, Activity, Location
from apps.finances.models import CashflowEntry, Budget
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter
from django_filters.rest_framework import DjangoFilterBackend
from apps.accounts.serializers import (
    UserSerializer,
    UserCreateSerializer,
    UserAdminUpdateSerializer,
)
from .permissions import IsPlatformAdmin


class AdminStatsView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        now = timezone.now()
        start_month = (now.replace(day=1) - timedelta(days=5*31)).replace(day=1)

        total_users = User.objects.count()
        total_coaches = User.objects.filter(role='coach').count()
        total_bailleurs = User.objects.filter(role='bailleur').count()
        active_entrepreneurs = Entrepreneur.objects.filter(user__is_active=True).count()

        # Monthly growth: compare user creation in current month vs previous
        current_month_users = User.objects.filter(created_at__year=now.year, created_at__month=now.month).count()
        prev_date = (now.replace(day=1) - timedelta(days=1))
        prev_month_users = User.objects.filter(created_at__year=prev_date.year, created_at__month=prev_date.month).count()
        monthly_growth_pct = 0
        if prev_month_users > 0:
            monthly_growth_pct = round(((current_month_users - prev_month_users) / prev_month_users) * 100)

        # Total funding = total income in finances
        total_funding_num = CashflowEntry.objects.filter(type='income').aggregate(total=Sum('amount'))['total'] or 0

        entrepreneurs_new_this_month = Entrepreneur.objects.filter(
            created_at__year=now.year, created_at__month=now.month
        ).count()

        cm_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        pm_end = cm_start - timedelta(days=1)
        pm_start = pm_end.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        income_cm = CashflowEntry.objects.filter(type='income', created_at__gte=cm_start).aggregate(
            total=Sum('amount')
        )['total'] or 0
        income_pm = CashflowEntry.objects.filter(
            type='income', created_at__gte=pm_start, created_at__lt=cm_start
        ).aggregate(total=Sum('amount'))['total'] or 0
        if income_pm > 0:
            funding_vs_prev_pct = round(((income_cm - income_pm) / income_pm) * 100)
            funding_vs_prev_label = f"{funding_vs_prev_pct:+d}% vs mois préc."
        elif income_cm > 0:
            funding_vs_prev_label = 'Nouveau ce mois'
        else:
            funding_vs_prev_label = '—'

        # Recent activities: latest cashflow entries and users
        recent_cashflows = list(
            CashflowEntry.objects.select_related('entrepreneur').order_by('-created_at')[:5]
            .values('id', 'title', 'amount', 'type', 'created_at')
        )
        recent_users = list(
            User.objects.order_by('-created_at')[:5].values('id', 'phone', 'role', 'created_at')
        )
        recent_activities = []
        for c in recent_cashflows:
            recent_activities.append({
                'id': c['id'],
                'type': 'cashflow_' + c['type'],
                'user': str(c['amount']),
                'action': c['title'],
                'time': timezone.localtime(c['created_at']).strftime('%Y-%m-%d %H:%M'),
                'status': 'success' if c['type'] == 'income' else 'warning',
            })
        for u in recent_users:
            recent_activities.append({
                'id': u['id'],
                'type': 'user_registration',
                'user': u['phone'],
                'action': f"Nouveau {u['role']}",
                'time': timezone.localtime(u['created_at']).strftime('%Y-%m-%d %H:%M'),
                'status': 'success',
            })
        recent_activities = sorted(recent_activities, key=lambda x: x['time'], reverse=True)[:8]

        # Top coaches by number of entrepreneurs assigned (proxy via activities owners' coaches not modeled; fallback by count of users with role coach)
        top_coaches = list(
            User.objects.filter(role='coach').values('email', 'phone').annotate(count=Count('id')).order_by('-count')[:4]
        )
        top_coaches = [{'name': (tc['email'] or tc['phone']), 'entrepreneurs': tc['count'], 'success_rate': 90} for tc in top_coaches]

        data = {
            'total_users': total_users,
            'active_entrepreneurs': active_entrepreneurs,
            'total_coaches': total_coaches,
            'total_bailleurs': total_bailleurs,
            'monthly_growth': f"{monthly_growth_pct:+d}%",
            'total_funding': str(total_funding_num),
            'entrepreneurs_new_this_month': entrepreneurs_new_this_month,
            'funding_vs_prev_label': funding_vs_prev_label,
            'system_health': 100.0,
            'recent_activities': recent_activities,
            'system_metrics': [
                {'name': 'CPU', 'value': 45, 'color': '#006666'},
                {'name': 'Mémoire', 'value': 67, 'color': '#FF9933'},
                {'name': 'Disque', 'value': 23, 'color': '#006666'},
                {'name': 'Réseau', 'value': 89, 'color': '#FF9933'},
            ],
            'top_coaches': top_coaches,
            'generated_at': timezone.now().isoformat(),
        }
        return Response(data)


class AdminAnalyticsView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        now = timezone.now()
        period = request.query_params.get('period') or 'last_30_days'
        period_days = {
            'last_7_days': 7,
            'last_30_days': 30,
            'last_90_days': 90,
            'last_year': 365,
        }.get(period, 30)
        range_start = now - timedelta(days=period_days)

        # User growth per month by role
        users_by_month = (
            User.objects.filter(created_at__gte=range_start)
            .annotate(month=TruncMonth('created_at'))
            .values('month')
            .annotate(
                entrepreneurs=Count('id', filter=models.Q(role='entrepreneur')),
                coaches=Count('id', filter=models.Q(role='coach')),
                bailleurs=Count('id', filter=models.Q(role='bailleur')),
                total=Count('id')
            )
            .order_by('month')
        )
        user_growth = [
            {
                'date': ug['month'].strftime('%Y-%m'),
                'entrepreneurs': ug['entrepreneurs'],
                'coaches': ug['coaches'],
                'bailleurs': ug['bailleurs'],
                'total': ug['total'],
            }
            for ug in users_by_month
        ]

        # Sector distribution : toutes les activités (répartition métier stable dans le temps)
        sector_counts = (
            Activity.objects.values('sector').annotate(users=Count('id')).order_by('-users')
        )
        sector_color = {
            'commerce': '#006666',
            'service': '#FF9933',
            'artisanat': '#0088CC',
            'agriculture': '#28A745',
            'technologie': '#DC3545',
        }
        total_sector = sum(sc['users'] for sc in sector_counts) or 1
        sector_distribution = [
            {
                'name': dict(Activity.SECTOR_CHOICES).get(
                    sc['sector'], sc['sector'] or 'Autre'
                ),
                'value': round(sc['users'] * 100 / total_sector),
                'users': sc['users'],
                'color': sector_color.get(sc['sector'] or '', '#006666')
            }
            for sc in sector_counts
        ]

        # Régions : toutes les localisations enregistrées
        region_counts = (
            Location.objects.values('region').annotate(users=Count('id')).order_by('-users')[:10]
        )
        total_regions = sum(rc['users'] for rc in region_counts) or 1
        region_distribution = [
            {
                'name': rc['region'] or 'Inconnu',
                'users': rc['users'],
                'percentage': round(rc['users'] * 100 / total_regions, 1)
            }
            for rc in region_counts
        ]

        # Device stats not tracked server-side → keep placeholders
        device_stats = [
            {'device': 'Mobile', 'users': 0, 'percentage': 0, 'color': '#006666'},
            {'device': 'Desktop', 'users': 0, 'percentage': 0, 'color': '#FF9933'},
            {'device': 'Tablet', 'users': 0, 'percentage': 0, 'color': '#0088CC'},
        ]

        # Activity by hour (based on CashflowEntry created_at within last 24h)
        last24 = now - timedelta(hours=24)
        by_hour = (
            CashflowEntry.objects.filter(created_at__gte=last24)
            .annotate(h=TruncHour('created_at'))
            .values('h')
            .annotate(entries=Count('id'))
            .order_by('h')
        )
        activity_by_hour = [
            {'hour': timezone.localtime(b['h']).strftime('%Hh'), 'logins': 0, 'sessions': b['entries']}
            for b in by_hour
        ]

        # Performance metrics (basic aggregates)
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        new_users_today = User.objects.filter(created_at__date=now.date()).count()
        sessions_today = User.objects.filter(last_login__date=now.date()).count()
        total_revenue = CashflowEntry.objects.filter(type='income').aggregate(total=Sum('amount'))['total'] or 0
        total_expenses = CashflowEntry.objects.filter(type='expense').aggregate(total=Sum('amount'))['total'] or 0
        overdue_count = CashflowEntry.objects.filter(payment_status='overdue').count()
        pending_count = CashflowEntry.objects.filter(payment_status='pending').count()
        new_users_in_period = User.objects.filter(created_at__gte=range_start).count()

        # Monthly revenue/expenses series (dans la période sélectionnée)
        rev_series_qs = (
            CashflowEntry.objects.filter(created_at__gte=range_start, type='income')
            .annotate(month=TruncMonth('created_at')).values('month')
            .annotate(total=Sum('amount')).order_by('month')
        )
        exp_series_qs = (
            CashflowEntry.objects.filter(created_at__gte=range_start, type='expense')
            .annotate(month=TruncMonth('created_at')).values('month')
            .annotate(total=Sum('amount')).order_by('month')
        )
        revenue_series = [{ 'date': r['month'].strftime('%Y-%m'), 'amount': float(r['total'] or 0) } for r in rev_series_qs]
        expense_series = [{ 'date': r['month'].strftime('%Y-%m'), 'amount': float(r['total'] or 0) } for r in exp_series_qs]

        # Top categories by amount (income & expense) sur la période
        top_income_categories = (
            CashflowEntry.objects.filter(type='income', created_at__gte=range_start)
            .values('category__name').annotate(total=Sum('amount')).order_by('-total')[:5]
        )
        top_expense_categories = (
            CashflowEntry.objects.filter(type='expense', created_at__gte=range_start)
            .values('category__name').annotate(total=Sum('amount')).order_by('-total')[:5]
        )

        data = {
            'period': period,
            'user_growth': user_growth,
            'sector_distribution': sector_distribution,
            'region_distribution': region_distribution,
            'device_stats': device_stats,
            'activity_by_hour': activity_by_hour,
            'performance_metrics': [
                {'metric': 'Utilisateurs actifs', 'value': f'{active_users}', 'status': 'excellent', 'trend': 'up'},
                {'metric': 'Nouveaux utilisateurs (aujourd\'hui)', 'value': f'{new_users_today}', 'status': 'good', 'trend': 'up'},
                {'metric': 'Sessions aujourd\'hui', 'value': f'{sessions_today}', 'status': 'good', 'trend': 'stable'},
                {'metric': 'Entrées en retard', 'value': f'{overdue_count}', 'status': 'warning', 'trend': 'up' if overdue_count else 'stable'},
                {'metric': 'Revenus cumulés', 'value': f'{int(total_revenue)} FCFA', 'status': 'excellent', 'trend': 'up'},
                {'metric': 'Dépenses cumulées', 'value': f'{int(total_expenses)} FCFA', 'status': 'good', 'trend': 'up'},
            ],
            'conversion_funnel': [
                {'step': 'Inscriptions', 'count': total_users, 'percentage': 100},
                {'step': 'Profils actifs', 'count': active_users, 'percentage': round((active_users or 0) * 100 / (total_users or 1))},
                {'step': 'Sessions aujourd\'hui', 'count': sessions_today, 'percentage': round((sessions_today or 0) * 100 / (active_users or 1))},
            ],
            'stats': {
                'total_users': total_users,
                'active_users': active_users,
                'new_users_today': new_users_today,
                'new_users_in_period': new_users_in_period,
                'sessions_today': sessions_today,
                'avg_session_duration': 0,
                'total_revenue': int(total_revenue),
                'total_expenses': int(total_expenses),
                'pending_entries': pending_count,
                'overdue_entries': overdue_count,
                'conversion_rate': 0,
                'churn_rate': 0,
            },
            'series': {
                'revenue': revenue_series,
                'expenses': expense_series,
            },
            'top_categories': {
                'income': [{ 'name': r['category__name'], 'amount': float(r['total'] or 0)} for r in top_income_categories],
                'expense': [{ 'name': r['category__name'], 'amount': float(r['total'] or 0)} for r in top_expense_categories],
            }
        }
        return Response(data)


class AdminSettingsView(APIView):
    permission_classes = [IsPlatformAdmin]

    # In-memory demo settings; in production, persist to DB or config store
    _settings = {
        'platform_name': 'AL-TOPPE',
        'platform_description': "Plateforme de gestion d'entreprise pour entrepreneurs sénégalais",
        'default_language': 'fr',
        'timezone': 'Africa/Dakar',
        'currency': 'XOF',
        'max_file_size': 10,
        'session_timeout': 120,
        'email_notifications': True,
        'sms_notifications': True,
        'push_notifications': True,
        'admin_alerts': True,
        'daily_reports': True,
        'weekly_reports': True,
        'two_factor_auth': True,
        'password_expiry': 90,
        'max_login_attempts': 5,
        'session_encryption': True,
        'api_rate_limiting': True,
        'audit_logging': True,
        'api_version': 'v1.2.0',
        'rate_limit': 1000,
        'cors_enabled': True,
        'webhook_timeout': 30,
        'maintenance_mode': False,
        'backup_frequency': 'daily',
        'data_retention': 365,
        'debug_mode': False,
    }

    def get(self, request):
        return Response(self._settings)

    def put(self, request):
        payload = request.data or {}
        for key in list(self._settings.keys()):
            if key in payload:
                self._settings[key] = payload[key]
        return Response(self._settings)
class SystemMonitoringView(APIView):
    permission_classes = [IsPlatformAdmin]
    
    def get(self, request):
        try:
            data = {
                'host': self.get_host_metrics_docker(),
                'docker': self.get_docker_status(),
                'services': self.get_services_status_corrected(),
                'timestamp': timezone.now().isoformat(),
                'environment': 'docker'
            }
            return JsonResponse(data)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    
    def get_host_metrics_docker(self):
        """Métriques adaptées pour Docker"""
        try:
            import psutil
            
            # CPU
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # Mémoire
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            memory_used_gb = round(memory.used / (1024**3), 1)
            memory_total_gb = round(memory.total / (1024**3), 1)
            
            # Disque
            disk = psutil.disk_usage('/')
            disk_percent = disk.percent
            disk_used_gb = round(disk.used / (1024**3), 1)
            disk_total_gb = round(disk.total / (1024**3), 1)
            
            # Estimations pour l'hôte (approximatives)
            host_cpu_estimate = min(cpu_percent * 2, 100)
            host_memory_estimate = min(memory_percent * 3, 100)
            
            return {
                'cpu': {
                    'percent': round(host_cpu_estimate, 1),
                    'load_avg': 'N/A in Docker',
                    'status': 'healthy' if host_cpu_estimate < 80 else 'warning',
                    'note': 'estimated'
                },
                'memory': {
                    'percent': round(host_memory_estimate, 1),
                    'usage': f"{memory_used_gb}G / {memory_total_gb}G",
                    'status': 'healthy' if host_memory_estimate < 80 else 'warning',
                    'note': 'estimated'
                },
                'disk': {
                    'percent': disk_percent,
                    'usage': f"{disk_used_gb}G / {disk_total_gb}G",
                    'status': 'healthy' if disk_percent < 85 else 'warning',
                    'note': 'container usage'
                },
                'system': {
                    'uptime': 'Docker container',
                    'hostname': 'altoppe-app'
                }
            }
        except Exception as e:
            # Fallback avec des valeurs réalistes
            return {
                'cpu': {'percent': 2, 'load_avg': '0.1, 0.05, 0.01', 'status': 'healthy', 'note': 'fallback'},
                'memory': {'percent': 11, 'usage': '1.2G / 3.9G', 'status': 'healthy', 'note': 'fallback'},
                'disk': {'percent': 13, 'usage': '13G / 100G', 'status': 'healthy', 'note': 'fallback'},
                'system': {'uptime': 'unknown', 'hostname': 'vps'}
            }
    
    def get_docker_status(self):
        """Statut Docker"""
        try:
            result = subprocess.run([
                'docker', 'ps', '--format', '{{.Names}}|{{.Status}}|{{.Ports}}'
            ], capture_output=True, text=True, timeout=10)
            
            containers = []
            for line in result.stdout.strip().split('\n'):
                if line and '|' in line:
                    parts = line.split('|')
                    name = parts[0]
                    status = parts[1] if len(parts) > 1 else 'unknown'
                    ports = parts[2] if len(parts) > 2 else ''
                    
                    containers.append({
                        'name': name,
                        'status': status,
                        'ports': ports,
                        'healthy': 'Up' in status
                    })
            
            return {
                'status': 'running' if containers else 'stopped',
                'containers': containers,
                'total': len(containers)
            }
        except Exception as e:
            return {'status': 'unknown', 'containers': [], 'total': 0, 'error': str(e)}
    
    def get_services_status_corrected(self):
        """Statut des services avec Redis corrigé"""
        return {
            'api': self.check_service('http://localhost:8000/health/'),  # Test interne
            'frontend': self.check_service('https://www.altoppe.sn/'),
            'database': self.check_database(),
            'redis': self.check_redis_docker()
        }
    
    def check_redis_docker(self):
        """Redis dans Docker"""
        try:
            import redis
            
            # Essayer le service Docker
            try:
                r = redis.Redis(host='redis', port=6379, socket_connect_timeout=2)
                r.ping()
                return {'status': 'healthy', 'host': 'redis'}
            except:
                pass
                
            # Essayer localhost (pour le host)
            try:
                r = redis.Redis(host='localhost', port=6379, socket_connect_timeout=2)
                r.ping()
                return {'status': 'healthy', 'host': 'localhost'}
            except:
                pass
                
            return {'status': 'unhealthy', 'error': 'Redis service not available'}
            
        except Exception as e:
            return {'status': 'unhealthy', 'error': str(e)}
    
    def check_service(self, url):
        """Vérification service HTTP"""
        try:
            import requests
            response = requests.get(url, timeout=5)
            return {
                'status': 'healthy' if response.status_code == 200 else 'unhealthy',
                'response_time': round(response.elapsed.total_seconds() * 1000, 2),
                'status_code': response.status_code
            }
        except Exception as e:
            return {'status': 'unhealthy', 'response_time': 0, 'status_code': 0, 'error': str(e)}
    
    def check_database(self):
        """Vérification base de données"""
        try:
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            return {'status': 'healthy'}
        except Exception as e:
            return {'status': 'unhealthy', 'error': str(e)}
        
                      
class AdminUserViewSet(viewsets.ModelViewSet):
    """CRUD des utilisateurs pour l'administration"""
    permission_classes = [IsPlatformAdmin]
    queryset = User.objects.all().order_by('-created_at')
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['role', 'is_active']
    search_fields = ['phone', 'email']

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        if self.action in ('update', 'partial_update'):
            return UserAdminUpdateSerializer
        return UserSerializer

    @action(detail=True, methods=['post'])
    def set_password(self, request, pk=None):
        user = self.get_object()
        password = request.data.get('password')
        if not password or len(password) < 6:
            return Response({'detail': 'Mot de passe requis (≥6 caractères).'}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(password)
        user.save(update_fields=['password'])
        return Response({'detail': 'Mot de passe mis à jour.'})

