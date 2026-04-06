"""
Service de génération de rapports financiers
"""
from django.db.models import Sum, Q
from django.utils import timezone
from datetime import datetime, date, timedelta
from decimal import Decimal
from .models import CashflowEntry, Category


class FinancialReportService:
    """Service pour générer des rapports financiers"""
    
    def __init__(self, entrepreneur_id, start_date=None, end_date=None):
        self.entrepreneur_id = entrepreneur_id
        self.end_date = end_date or timezone.now().date()
        self.start_date = start_date or (self.end_date - timezone.timedelta(days=30))
    
    def get_summary(self):
        """Récupère les données de synthèse (Total Produits, Total Charges, Bénéfice)"""
        entries = CashflowEntry.objects.filter(
            entrepreneur_id=self.entrepreneur_id,
            date__gte=self.start_date,
            date__lte=self.end_date
        )
        
        # Total Produits (Revenus)
        total_produits = entries.filter(type='income').aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0')
        
        # Total Charges (Dépenses)
        total_charges = entries.filter(type='expense').aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0')
        
        # Bénéfice (Résultat)
        benefice = total_produits - total_charges
        
        # Répartition par catégorie - Produits
        produits_by_category = entries.filter(type='income').values(
            'category__name', 'category__id'
        ).annotate(
            total=Sum('amount')
        ).order_by('-total')
        
        # Répartition par catégorie - Charges
        charges_by_category = entries.filter(type='expense').values(
            'category__name', 'category__id'
        ).annotate(
            total=Sum('amount')
        ).order_by('-total')
        
        return {
            'period': {
                'start_date': self.start_date.isoformat(),
                'end_date': self.end_date.isoformat(),
                'start_date_display': self.start_date.strftime('%d/%m/%Y'),
                'end_date_display': self.end_date.strftime('%d/%m/%Y'),
            },
            'summary': {
                'total_produits': float(total_produits),
                'total_charges': float(total_charges),
                'benefice': float(benefice),
                'marge_beneficiaire': float((benefice / total_produits * 100) if total_produits > 0 else 0),
            },
            'produits_by_category': [
                {
                    'category_name': item['category__name'] or 'Non catégorisé',
                    'category_id': str(item['category__id']) if item['category__id'] else None,
                    'amount': float(item['total']),
                    'percentage': float((item['total'] / total_produits * 100) if total_produits > 0 else 0)
                }
                for item in produits_by_category
            ],
            'charges_by_category': [
                {
                    'category_name': item['category__name'] or 'Non catégorisé',
                    'category_id': str(item['category__id']) if item['category__id'] else None,
                    'amount': float(item['total']),
                    'percentage': float((item['total'] / total_charges * 100) if total_charges > 0 else 0)
                }
                for item in charges_by_category
            ],
            'transaction_count': {
                'income': entries.filter(type='income').count(),
                'expense': entries.filter(type='expense').count(),
                'total': entries.count()
            }
        }

