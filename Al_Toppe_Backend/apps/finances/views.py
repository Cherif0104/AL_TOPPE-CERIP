from django.shortcuts import render
from rest_framework import status, generics, permissions, filters
from rest_framework.exceptions import PermissionDenied
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Sum, Count, Avg
from django.utils import timezone
from datetime import timedelta, date, datetime
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)

from .models import Category, CashflowEntry, Budget, BudgetItem
from .serializers import (
    CategorySerializer, CategoryCreateSerializer, CashflowEntrySerializer,
    CashflowEntryCreateSerializer, CashflowEntryUpdateSerializer,
    BudgetSerializer, BudgetCreateSerializer, BudgetUpdateSerializer,
    BudgetItemSerializer, BudgetItemCreateSerializer,
    FinancialSummarySerializer, CategorySummarySerializer
)
from .report_service import FinancialReportService


class CategoryListView(generics.ListCreateAPIView):
    """Vue pour lister et créer des catégories"""
    
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['type', 'is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    
    def get_serializer_class(self):
        """Choisir le bon sérialiseur selon l'action"""
        if self.request.method == 'POST':
            return CategoryCreateSerializer
        return CategorySerializer


class CategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Vue pour afficher, modifier et supprimer une catégorie"""
    
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'
    
    def perform_destroy(self, instance):
        """Supprimer la catégorie (désactiver au lieu de supprimer)"""
        instance.is_active = False
        instance.save()


class CashflowEntryListView(generics.ListCreateAPIView):
    """Vue pour lister et créer des entrées de trésorerie"""
    
    serializer_class = CashflowEntrySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['type', 'payment_status', 'frequency', 'category', 'date']
    search_fields = ['title', 'description', 'reference']
    ordering_fields = ['date', 'amount', 'created_at']
    ordering = ['-date', '-created_at']
    
    def _apply_cashflow_date_range(self, qs):
        """Filtre optionnel start_date / end_date (YYYY-MM-DD), aligné sur l'export PDF."""
        params = getattr(self.request, "query_params", self.request.GET)
        start_raw = params.get('start_date')
        end_raw = params.get('end_date')
        if start_raw:
            try:
                start_d = datetime.strptime(start_raw, '%Y-%m-%d').date()
                qs = qs.filter(date__gte=start_d)
            except ValueError:
                pass
        if end_raw:
            try:
                end_d = datetime.strptime(end_raw, '%Y-%m-%d').date()
                qs = qs.filter(date__lte=end_d)
            except ValueError:
                pass
        return qs

    def get_queryset(self):
        """Filtrer les entrées selon l'entrepreneur avec gestion des permissions"""
        # Log pour déboguer
        logger.info(f"CashflowEntryListView - User: {self.request.user}, Role: {getattr(self.request.user, 'role', 'N/A')}, Authenticated: {self.request.user.is_authenticated}")
        entrepreneur_id = self.kwargs.get('entrepreneur_id')
        
        if not entrepreneur_id:
            # Si pas d'entrepreneur_id, vérifier les permissions
            if hasattr(self.request.user, 'is_admin') and self.request.user.is_admin:
                # Admin peut voir toutes les entrées
                qs = CashflowEntry.objects.all()
            elif hasattr(self.request.user, 'is_coach') and self.request.user.is_coach:
                # Coach peut voir les entrées de ses entrepreneurs assignés
                from apps.coaches.models import CoachAssignment
                assigned_entrepreneur_ids = CoachAssignment.objects.filter(
                    coach__user=self.request.user,
                    status='active'
                ).values_list('entrepreneur_id', flat=True)
                qs = CashflowEntry.objects.filter(entrepreneur_id__in=assigned_entrepreneur_ids)
            elif hasattr(self.request.user, 'entrepreneur'):
                # Entrepreneur peut voir ses propres entrées
                qs = CashflowEntry.objects.filter(entrepreneur_id=self.request.user.entrepreneur.id)
            else:
                qs = CashflowEntry.objects.none()
            return self._apply_cashflow_date_range(qs)
        
        # Si entrepreneur_id est fourni, vérifier les permissions
        if hasattr(self.request.user, 'is_admin') and self.request.user.is_admin:
            # Admin peut voir toutes les entrées
            qs = CashflowEntry.objects.filter(entrepreneur_id=entrepreneur_id)
        elif hasattr(self.request.user, 'is_coach') and self.request.user.is_coach:
            # Coach peut voir les entrées de ses entrepreneurs assignés
            from apps.coaches.models import CoachAssignment
            is_assigned = CoachAssignment.objects.filter(
                coach__user=self.request.user,
                entrepreneur_id=entrepreneur_id,
                status='active'
            ).exists()
            if is_assigned:
                qs = CashflowEntry.objects.filter(entrepreneur_id=entrepreneur_id)
            else:
                qs = CashflowEntry.objects.none()
        elif hasattr(self.request.user, 'entrepreneur') and str(self.request.user.entrepreneur.id) == str(entrepreneur_id):
            # Entrepreneur peut voir ses propres entrées
            qs = CashflowEntry.objects.filter(entrepreneur_id=entrepreneur_id)
        else:
            qs = CashflowEntry.objects.none()
        return self._apply_cashflow_date_range(qs)
    
    def get_serializer_class(self):
        """Choisir le bon sérialiseur selon l'action"""
        if self.request.method == 'POST':
            return CashflowEntryCreateSerializer
        return CashflowEntrySerializer
    
    def perform_create(self, serializer):
        """Créer l'entrée de trésorerie pour l'entrepreneur spécifié"""
        entrepreneur_id = self.kwargs.get('entrepreneur_id')
        entrepreneur = self.request.user.entrepreneur if hasattr(self.request.user, 'entrepreneur') else None
        
        # if entrepreneur and str(entrepreneur.id) != entrepreneur_id:
        #     raise PermissionDenied("Vous ne pouvez créer des entrées que pour votre propre compte.")
        
        serializer.save()


class CashflowEntryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Vue pour afficher, modifier et supprimer une entrée de trésorerie"""
    
    serializer_class = CashflowEntrySerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'
    
    def get_queryset(self):
        """Filtrer les entrées selon l'entrepreneur avec gestion des permissions"""
        entrepreneur_id = self.kwargs.get('entrepreneur_id')
        
        if not entrepreneur_id:
            # Si pas d'entrepreneur_id, vérifier les permissions
            if hasattr(self.request.user, 'is_admin') and self.request.user.is_admin:
                # Admin peut voir toutes les entrées
                return CashflowEntry.objects.all()
            elif hasattr(self.request.user, 'is_coach') and self.request.user.is_coach:
                # Coach peut voir les entrées de ses entrepreneurs assignés
                from apps.coaches.models import CoachAssignment
                assigned_entrepreneur_ids = CoachAssignment.objects.filter(
                    coach__user=self.request.user,
                    status='active'
                ).values_list('entrepreneur_id', flat=True)
                return CashflowEntry.objects.filter(entrepreneur_id__in=assigned_entrepreneur_ids)
            elif hasattr(self.request.user, 'entrepreneur'):
                # Entrepreneur peut voir ses propres entrées
                return CashflowEntry.objects.filter(entrepreneur_id=self.request.user.entrepreneur.id)
            else:
                return CashflowEntry.objects.none()
        
        # Si entrepreneur_id est fourni, vérifier les permissions
        if hasattr(self.request.user, 'is_admin') and self.request.user.is_admin:
            # Admin peut voir toutes les entrées
            return CashflowEntry.objects.filter(entrepreneur_id=entrepreneur_id)
        elif hasattr(self.request.user, 'is_coach') and self.request.user.is_coach:
            # Coach peut voir les entrées de ses entrepreneurs assignés
            from apps.coaches.models import CoachAssignment
            is_assigned = CoachAssignment.objects.filter(
                coach__user=self.request.user,
                entrepreneur_id=entrepreneur_id,
                status='active'
            ).exists()
            if is_assigned:
                return CashflowEntry.objects.filter(entrepreneur_id=entrepreneur_id)
            else:
                return CashflowEntry.objects.none()
        elif hasattr(self.request.user, 'entrepreneur') and str(self.request.user.entrepreneur.id) == str(entrepreneur_id):
            # Entrepreneur peut voir ses propres entrées
            return CashflowEntry.objects.filter(entrepreneur_id=entrepreneur_id)
        else:
            return CashflowEntry.objects.none()
    
    def get_serializer_class(self):
        """Choisir le bon sérialiseur selon l'action"""
        if self.request.method in ['PUT', 'PATCH']:
            return CashflowEntryUpdateSerializer
        return CashflowEntrySerializer


class BudgetListView(generics.ListCreateAPIView):
    """Vue pour lister et créer des budgets"""
    
    serializer_class = BudgetSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['period', 'status', 'start_date']
    search_fields = ['name', 'description']
    ordering_fields = ['start_date', 'created_at']
    ordering = ['-start_date', '-created_at']
    
    def get_queryset(self):
        """Filtrer les budgets selon l'entrepreneur"""
        entrepreneur_id = self.kwargs.get('entrepreneur_id')
        if entrepreneur_id:
            return Budget.objects.filter(entrepreneur_id=entrepreneur_id)
        return Budget.objects.none()
    
    def get_serializer_class(self):
        """Choisir le bon sérialiseur selon l'action"""
        if self.request.method == 'POST':
            return BudgetCreateSerializer
        return BudgetSerializer
    
    def perform_create(self, serializer):
        """Créer le budget pour l'entrepreneur spécifié"""
        entrepreneur_id = self.kwargs.get('entrepreneur_id')
        entrepreneur = self.request.user.entrepreneur if hasattr(self.request.user, 'entrepreneur') else None
        
        if entrepreneur and str(entrepreneur.id) != entrepreneur_id:
            raise permissions.PermissionDenied("Vous ne pouvez créer des budgets que pour votre propre compte.")
        
        serializer.save(entrepreneur_id=entrepreneur_id)


class BudgetDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Vue pour afficher, modifier et supprimer un budget"""
    
    serializer_class = BudgetSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'
    
    def get_queryset(self):
        """Filtrer les budgets selon l'entrepreneur"""
        entrepreneur_id = self.kwargs.get('entrepreneur_id')
        if entrepreneur_id:
            return Budget.objects.filter(entrepreneur_id=entrepreneur_id)
        return Budget.objects.none()
    
    def get_serializer_class(self):
        """Choisir le bon sérialiseur selon l'action"""
        if self.request.method in ['PUT', 'PATCH']:
            return BudgetUpdateSerializer
        return BudgetSerializer


class BudgetItemListView(generics.ListCreateAPIView):
    """Vue pour lister et créer des éléments de budget"""
    
    serializer_class = BudgetItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filtrer les éléments selon le budget"""
        budget_id = self.kwargs.get('budget_id')
        if budget_id:
            return BudgetItem.objects.filter(budget_id=budget_id)
        return BudgetItem.objects.none()
    
    def get_serializer_class(self):
        """Choisir le bon sérialiseur selon l'action"""
        if self.request.method == 'POST':
            return BudgetItemCreateSerializer
        return BudgetItemSerializer
    
    def perform_create(self, serializer):
        """Créer l'élément de budget pour le budget spécifié"""
        budget_id = self.kwargs.get('budget_id')
        serializer.save(budget_id=budget_id)


class BudgetItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Vue pour afficher, modifier et supprimer un élément de budget"""
    
    serializer_class = BudgetItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'
    
    def get_queryset(self):
        """Filtrer les éléments selon le budget"""
        budget_id = self.kwargs.get('budget_id')
        if budget_id:
            return BudgetItem.objects.filter(budget_id=budget_id)
        return BudgetItem.objects.none()


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def financial_dashboard(request, entrepreneur_id):
    """Tableau de bord financier d'un entrepreneur - VERSION OPTIMISÉE"""
    
    try:
        # Vérifier les permissions
        # if not hasattr(request.user, "entrepreneur") or str(request.user.entrepreneur.id) != entrepreneur_id:
        #     raise PermissionDenied("Vous ne pouvez accéder qu'à votre propre tableau de bord financier.")
        
        # Période par défaut (30 derniers jours)
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=30)
        
        # Récupérer les entrées de trésorerie de la période
        entries = CashflowEntry.objects.filter(
            entrepreneur_id=entrepreneur_id,
            date__gte=start_date,
            date__lte=end_date
        )
        
        # Calculer les totaux
        total_income = entries.filter(type='income').aggregate(total=Sum('amount'))['total'] or 0
        total_expenses = entries.filter(type='expense').aggregate(total=Sum('amount'))['total'] or 0
        net_result = total_income - total_expenses
        
        # Calculer la marge bénéficiaire
        profit_margin = (net_result / total_income * 100) if total_income > 0 else 0
        
        # Top catégories de revenus
        top_income_categories = entries.filter(type='income').values('category__name').annotate(
            total=Sum('amount')
        ).order_by('-total')[:5]
        
        # Top catégories de dépenses
        top_expense_categories = entries.filter(type='expense').values('category__name').annotate(
            total=Sum('amount')
        ).order_by('-total')[:5]
        
        # Moyennes quotidiennes
        daily_averages = {
            'income': float(total_income / 30) if total_income > 0 else 0,
            'expenses': float(total_expenses / 30) if total_expenses > 0 else 0,
            'net': float(net_result / 30) if net_result != 0 else 0
        }
        
        # Totaux hebdomadaires (4 dernières semaines)
        weekly_totals = []
        for i in range(4):
            week_start = end_date - timedelta(weeks=i+1)
            week_end = end_date - timedelta(weeks=i)
            
            week_income = entries.filter(
                type='income',
                date__gte=week_start,
                date__lt=week_end
            ).aggregate(total=Sum('amount'))['total'] or 0
            
            week_expenses = entries.filter(
                type='expense',
                date__gte=week_start,
                date__lt=week_end
            ).aggregate(total=Sum('amount'))['total'] or 0
            
            weekly_totals.append({
                'week': f"Semaine {4-i}",
                'income': float(week_income),
                'expenses': float(week_expenses),
                'net': float(week_income - week_expenses)
            })
        
        # Alertes
        overdue_payments = entries.filter(
            type='income',
            payment_status='overdue'
        ).count()
        
        low_balance_alerts = []
        if net_result < 0:
            low_balance_alerts.append("Solde négatif - Attention aux dépenses")
        
        # Données du tableau de bord
        dashboard_data = {
            'period_start': start_date,
            'period_end': end_date,
            'total_income': total_income,
            'income_count': entries.filter(type='income').count(),
            'total_expenses': total_expenses,
            'expenses_count': entries.filter(type='expense').count(),
            'net_result': net_result,
            'profit_margin': round(profit_margin, 2),
            'top_income_categories': list(top_income_categories),
            'top_expense_categories': list(top_expense_categories),
            'daily_averages': daily_averages,
            'weekly_totals': weekly_totals,
            'overdue_payments': overdue_payments,
            'low_balance_alerts': low_balance_alerts
        }
        
        serializer = FinancialSummarySerializer(dashboard_data)
        return Response(serializer.data)
        
    except Exception as e:
        logger.error(f"Erreur dashboard financier: {e}")
        return Response(
            {'error': f'Erreur lors de la récupération du tableau de bord: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def category_summary(request, entrepreneur_id):
    """Résumé des catégories pour un entrepreneur"""
    
    try:
        # Vérifier les permissions
        # if request.user.is_entrepreneur and str(request.user.entrepreneur.id) != entrepreneur_id:
        #     return Response(
        #         {'error': 'Vous ne pouvez accéder qu\'à vos propres données.'},
        #         status=status.HTTP_403_FORBIDDEN
        #     )
        
        # Période par défaut (30 derniers jours)
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=30)
        
        # Récupérer les entrées de trésorerie de la période
        entries = CashflowEntry.objects.filter(
            entrepreneur_id=entrepreneur_id,
            date__gte=start_date,
            date__lte=end_date
        )
        
        # Calculer les totaux par catégorie
        categories_summary = []
        
        for category in Category.objects.filter(is_active=True):
            category_entries = entries.filter(category=category)
            total_amount = category_entries.aggregate(total=Sum('amount'))['total'] or 0
            entries_count = category_entries.count()
            
            if total_amount > 0:
                # Calculer le pourcentage du total
                total_all = entries.aggregate(total=Sum('amount'))['total'] or 0
                percentage = (total_amount / total_all * 100) if total_all > 0 else 0
                
                # Déterminer la tendance (simplifié)
                trend = 'stable'  # À améliorer avec des données historiques
                
                categories_summary.append({
                    'category_id': category.id,
                    'category_name': category.name,
                    'category_type': category.type,
                    'total_amount': total_amount,
                    'entries_count': entries_count,
                    'percentage_of_total': round(percentage, 2),
                    'trend': trend
                })
        
        # Trier par montant total décroissant
        categories_summary.sort(key=lambda x: x['total_amount'], reverse=True)
        
        serializer = CategorySummarySerializer(categories_summary, many=True)
        return Response(serializer.data)
        
    except Exception as e:
        return Response(
            {'error': f'Erreur lors de la récupération du résumé des catégories: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def cashflow_analysis(request, entrepreneur_id):
    """Analyse des flux de trésorerie pour un entrepreneur"""
    
    try:
        # Vérifier les permissions
        # if request.user.is_entrepreneur and str(request.user.entrepreneur.id) != entrepreneur_id:
        #     return Response(
        #         {'error': 'Vous ne pouvez accéder qu\'à vos propres données.'},
        #         status=status.HTTP_403_FORBIDDEN
        #     )
        
        # Paramètres de période
        period = request.GET.get('period', '30')  # jours
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=int(period))
        
        # Récupérer les entrées de trésorerie de la période
        entries = CashflowEntry.objects.filter(
            entrepreneur_id=entrepreneur_id,
            date__gte=start_date,
            date__lte=end_date
        )
        
        # Analyse par jour
        daily_analysis = []
        current_date = start_date
        
        while current_date <= end_date:
            day_entries = entries.filter(date=current_date)
            day_income = day_entries.filter(type='income').aggregate(total=Sum('amount'))['total'] or 0
            day_expenses = day_entries.filter(type='expense').aggregate(total=Sum('amount'))['total'] or 0
            
            daily_analysis.append({
                'date': current_date,
                'income': float(day_income),
                'expenses': float(day_expenses),
                'net': float(day_income - day_expenses)
            })
            
            current_date += timedelta(days=1)
        
        # Statistiques générales
        total_income = entries.filter(type='income').aggregate(total=Sum('amount'))['total'] or 0
        total_expenses = entries.filter(type='expense').aggregate(total=Sum('amount'))['total'] or 0
        net_cashflow = total_income - total_expenses
        
        # Moyennes
        avg_daily_income = total_income / len(daily_analysis) if daily_analysis else 0
        avg_daily_expenses = total_expenses / len(daily_analysis) if daily_analysis else 0
        
        # Jours avec revenus/dépenses
        days_with_income = sum(1 for x in daily_analysis if x['income'] > 0)
        days_with_expenses = sum(1 for x in daily_analysis if x['expenses'] > 0)
        
        analysis_data = {
            'period_start': start_date,
            'period_end': end_date,
            'total_income': total_income,
            'total_expenses': total_expenses,
            'net_cashflow': net_cashflow,
            'avg_daily_income': round(float(avg_daily_income), 2),
            'avg_daily_expenses': round(float(avg_daily_expenses), 2),
            'days_with_income': days_with_income,
            'days_with_expenses': days_with_expenses,
            'daily_analysis': daily_analysis
        }
        
        return Response(analysis_data)
        
    except Exception as e:
        return Response(
            {'error': f'Erreur lors de l\'analyse des flux de trésorerie: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def generate_income_statement(request, entrepreneur_id):
    """
    Génère le compte de résultat pour un entrepreneur
    
    Paramètres GET:
    - start_date: Date de début (format: YYYY-MM-DD)
    - end_date: Date de fin (format: YYYY-MM-DD)
    """
    try:
        from .income_statement import IncomeStatementService
        from datetime import datetime
        
        # Récupérer les paramètres
        start_date_str = request.GET.get('start_date')
        end_date_str = request.GET.get('end_date')
        
        start_date = None
        end_date = None
        
        if start_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        if end_date_str:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        
        # Créer le service
        service = IncomeStatementService(entrepreneur_id, start_date, end_date)
        
        # Générer le compte de résultat
        data = service.generate()
        
        return Response(data)
        
    except ValueError as e:
        return Response(
            {'error': f'Format de date invalide. Utilisez YYYY-MM-DD. Erreur: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {'error': f'Erreur lors de la génération du compte de résultat: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def financial_report_summary(request, entrepreneur_id):
    """
    Récupère le résumé financier (Total Produits, Total Charges, Bénéfice)
    pour une période donnée
    """
    try:
        from datetime import datetime
        
        # Récupérer les paramètres de période
        start_date_str = request.GET.get('start_date')
        end_date_str = request.GET.get('end_date')
        
        start_date = None
        end_date = None
        
        if start_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        if end_date_str:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        
        # Créer le service de rapport
        report_service = FinancialReportService(entrepreneur_id, start_date, end_date)
        
        # Récupérer les données de synthèse
        report_data = report_service.get_summary()
        
        return Response(report_data)
        
    except ValueError as e:
        return Response(
            {'error': f'Format de date invalide. Utilisez YYYY-MM-DD. Erreur: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Erreur génération rapport financier: {e}")
        return Response(
            {'error': f'Erreur lors de la génération du rapport: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def export_financial_report_pdf(request, entrepreneur_id):
    """
    Exporte le rapport financier en PDF
    """
    try:
        from reportlab.lib.pagesizes import letter, A4
        from reportlab.lib import colors
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
        from django.http import HttpResponse
        from io import BytesIO
        from datetime import datetime
        
        # Récupérer les paramètres de période
        start_date_str = request.GET.get('start_date')
        end_date_str = request.GET.get('end_date')
        
        start_date = None
        end_date = None
        
        if start_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        if end_date_str:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        
        # Créer le service de rapport
        report_service = FinancialReportService(entrepreneur_id, start_date, end_date)
        report_data = report_service.get_summary()
        
        # Créer le buffer pour le PDF
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
        
        # Styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#006666'),
            spaceAfter=30,
            alignment=TA_CENTER
        )
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#006666'),
            spaceAfter=12
        )
        normal_style = styles['Normal']
        
        # Contenu du PDF
        story = []
        
        # Titre
        story.append(Paragraph("RAPPORT FINANCIER", title_style))
        story.append(Spacer(1, 0.2*inch))
        
        # Période
        period_text = f"Période du {report_data['period']['start_date_display']} au {report_data['period']['end_date_display']}"
        story.append(Paragraph(period_text, normal_style))
        story.append(Spacer(1, 0.3*inch))
        
        # Résumé financier
        story.append(Paragraph("RÉSUMÉ FINANCIER", heading_style))
        
        summary_data = [
            ['Total Produits (A)', f"{report_data['summary']['total_produits']:,.0f} FCFA"],
            ['Total Charges (B)', f"{report_data['summary']['total_charges']:,.0f} FCFA"],
            ['Bénéfice (A - B)', f"{report_data['summary']['benefice']:,.0f} FCFA"],
            ['Marge Bénéficiaire', f"{report_data['summary']['marge_beneficiaire']:.2f}%"],
        ]
        
        summary_table = Table(summary_data, colWidths=[4*inch, 2*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F0F9F9')),
            ('BACKGROUND', (1, 0), (1, -1), colors.white),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('FONTNAME', (0, 2), (0, 2), 'Helvetica-Bold'),
            ('FONTNAME', (1, 2), (1, 2), 'Helvetica-Bold'),
            ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#E0F2F2')),
        ]))
        
        story.append(summary_table)
        story.append(Spacer(1, 0.3*inch))
        
        # Produits par catégorie
        if report_data['produits_by_category']:
            story.append(Paragraph("PRODUITS PAR CATÉGORIE", heading_style))
            
            produits_data = [['Catégorie', 'Montant (FCFA)', '%']]
            for item in report_data['produits_by_category']:
                produits_data.append([
                    item['category_name'],
                    f"{item['amount']:,.0f}",
                    f"{item['percentage']:.2f}%"
                ])
            
            produits_table = Table(produits_data, colWidths=[3.5*inch, 1.5*inch, 1*inch])
            produits_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#006666')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 11),
                ('FONTSIZE', (0, 1), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 1, colors.grey),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F9F9F9')]),
            ]))
            
            story.append(produits_table)
            story.append(Spacer(1, 0.3*inch))
        
        # Charges par catégorie
        if report_data['charges_by_category']:
            story.append(Paragraph("CHARGES PAR CATÉGORIE", heading_style))
            
            charges_data = [['Catégorie', 'Montant (FCFA)', '%']]
            for item in report_data['charges_by_category']:
                charges_data.append([
                    item['category_name'],
                    f"{item['amount']:,.0f}",
                    f"{item['percentage']:.2f}%"
                ])
            
            charges_table = Table(charges_data, colWidths=[3.5*inch, 1.5*inch, 1*inch])
            charges_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#DC2626')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 11),
                ('FONTSIZE', (0, 1), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 1, colors.grey),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F9F9F9')]),
            ]))
            
            story.append(charges_table)
        
        # Générer le PDF
        doc.build(story)
        
        # Préparer la réponse
        buffer.seek(0)
        response = HttpResponse(buffer.read(), content_type='application/pdf')
        filename = f"rapport-financier-{entrepreneur_id}-{report_data['period']['start_date']}-{report_data['period']['end_date']}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        return response
        
    except ValueError as e:
        return Response(
            {'error': f'Format de date invalide. Utilisez YYYY-MM-DD. Erreur: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    except ImportError:
        return Response(
            {'error': 'Le module reportlab n\'est pas installé. Installez-le avec: pip install reportlab'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    except Exception as e:
        logger.error(f"Erreur export PDF: {e}")
        return Response(
            {'error': f'Erreur lors de l\'export PDF: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


