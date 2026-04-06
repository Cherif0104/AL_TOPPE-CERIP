"""
Service pour générer le Compte de Résultat
Compatible avec le template Excel client
"""
from django.db.models import Sum, Q, F
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
from .models import Category, CashflowEntry


class IncomeStatementService:
    """
    Service pour générer le Compte de Résultat
    Compatible avec le template client
    """
    
    def __init__(self, entrepreneur_id, start_date=None, end_date=None):
        self.entrepreneur_id = entrepreneur_id
        self.start_date = start_date or (timezone.now().date() - timedelta(days=90))
        self.end_date = end_date or timezone.now().date()
    
    def generate(self):
        """
        Génère le compte de résultat complet
        Retourne: dict avec toutes les données
        """
        # 1. Récupérer toutes les entrées de la période
        entries = CashflowEntry.objects.filter(
            entrepreneur_id=self.entrepreneur_id,
            date__gte=self.start_date,
            date__lte=self.end_date
        ).select_related('category', 'category__parent')
        
        # 2. Calculer les totaux par catégorie
        income_data = self._calculate_income(entries)
        expense_data = self._calculate_expenses(entries)
        
        # 3. Calculer les totaux globaux
        total_income = sum([cat['amount'] for cat in income_data['categories']])
        total_expense = sum([cat['amount'] for cat in expense_data['categories']])
        net_result = total_income - total_expense
        
        # 4. Récupérer le journal des transactions
        journal = self._get_journal(entries)
        
        return {
            'period': {
                'start_date': self.start_date.strftime('%d/%m/%Y'),
                'end_date': self.end_date.strftime('%d/%m/%Y')
            },
            'income': income_data,
            'expenses': expense_data,
            'totals': {
                'total_income': float(total_income),
                'total_expense': float(total_expense),
                'net_result': float(net_result),
                'profit_margin': float((net_result / total_income * 100) if total_income > 0 else 0)
            },
            'journal': journal
        }
    
    def _calculate_income(self, entries):
        """Calcule les revenus par catégorie avec mapping intelligent"""
        income_entries = entries.filter(type='income')
        
        # Calculer le total de tous les revenus
        total_all_income = income_entries.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # Catégories principales de revenus du compte de résultat
        income_categories = [
            'Ventes de marchandises',
            'Ventes de produits fabriqués',
            'Prestations de services',
            'Produits accessoires',
            'Subventions et Dons',
        ]
        
        # Mapping des catégories réelles vers les catégories du compte de résultat
        category_mapping = {
            # Ventes de marchandises (produits achetés et revendus)
            'alimentation': 'Ventes de marchandises',
            'habillement': 'Ventes de marchandises',
            'divers': 'Ventes de marchandises',  # Par défaut, divers = marchandises
            # Ventes de produits fabriqués (artisanat, production)
            'artisanat': 'Ventes de produits fabriqués',
            'production': 'Ventes de produits fabriqués',
            # Prestations de services
            'services': 'Prestations de services',
            'transport': 'Prestations de services',
            # Produits accessoires
            'communication': 'Produits accessoires',
            'éducation': 'Produits accessoires',
        }
        
        # Initialiser les catégories avec 0
        category_totals = {cat_name: Decimal('0.00') for cat_name in income_categories}
        
        # Grouper les revenus par catégorie réelle
        for entry in income_entries:
            if not entry.category:
                # Si pas de catégorie, mettre dans "Ventes de marchandises"
                category_totals['Ventes de marchandises'] += entry.amount
                continue
            
            # Normaliser le nom de la catégorie (minuscules, sans accents pour comparaison)
            category_name = entry.category.name.lower().strip()
            
            # Si la catégorie a un parent, utiliser le nom du parent pour le mapping
            if entry.category.parent:
                category_name = entry.category.parent.name.lower().strip()
            
            # Trouver la catégorie du compte de résultat correspondante
            mapped_category = category_mapping.get(category_name, 'Ventes de marchandises')  # Par défaut
            
            # S'assurer que la catégorie mappée existe dans income_categories
            if mapped_category not in income_categories:
                mapped_category = 'Ventes de marchandises'
            
            category_totals[mapped_category] += entry.amount
        
        # Construire la liste des catégories
        categories = []
        total = Decimal('0.00')
        
        for cat_name in income_categories:
            cat_total = category_totals.get(cat_name, Decimal('0.00'))
            total += cat_total
            
            categories.append({
                'name': cat_name,
                'amount': float(cat_total),
                'percentage': 0  # Calculé après
            })
        
        # Calculer les pourcentages
        if total > 0:
            for cat in categories:
                cat['percentage'] = round((cat['amount'] / float(total)) * 100, 2)
        
        return {
            'categories': categories,
            'total': float(total)
        }
    
    def _calculate_expenses(self, entries):
        """Calcule les dépenses par catégorie avec hiérarchie"""
        expense_entries = entries.filter(type='expense')
        
        categories = []
        total = Decimal('0.00')
        
        # Récupérer toutes les catégories parentes de dépenses
        parent_categories = Category.objects.filter(
            type='expense',
            parent__isnull=True
        ).order_by('order', 'name')
        
        for parent_cat in parent_categories:
            # Total de la catégorie parente (incluant les sous-catégories)
            parent_total = expense_entries.filter(
                Q(category=parent_cat) | Q(category__parent=parent_cat)
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            total += parent_total
            
            # Sous-catégories
            subcategories = []
            for sub_cat in parent_cat.subcategories.all().order_by('order', 'name'):
                sub_total = expense_entries.filter(
                    category=sub_cat
                ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                
                if sub_total > 0:  # Ne garder que les sous-catégories avec des montants
                    subcategories.append({
                        'name': sub_cat.name,
                        'amount': float(sub_total),
                        'percentage': 0  # Calculé après
                    })
            
            if parent_total > 0 or subcategories:  # Ne garder que les catégories avec des montants ou des sous-catégories
                categories.append({
                    'name': parent_cat.name,
                    'amount': float(parent_total),
                    'percentage': 0,  # Calculé après
                    'subcategories': subcategories
                })
        
        # Calculer les pourcentages
        if total > 0:
            for cat in categories:
                cat['percentage'] = round((cat['amount'] / float(total)) * 100, 2)
                for sub in cat.get('subcategories', []):
                    sub['percentage'] = round((sub['amount'] / float(total)) * 100, 2)
        
        return {
            'categories': categories,
            'total': float(total)
        }
    
    def _get_journal(self, entries):
        """Récupère le journal des transactions"""
        journal = []
        
        for entry in entries.order_by('date', 'created_at'):
            journal.append({
                'id': str(entry.id),
                'date': entry.date.strftime('%d/%m/%Y'),
                'invoice_number': entry.invoice_number or '',
                'type': 'Recette' if entry.type == 'income' else 'Dépense',
                'client_supplier': entry.client_supplier or '',
                'category': entry.category.get_full_name() if hasattr(entry.category, 'get_full_name') else entry.category.name,
                'description': entry.description or entry.title,
                'amount': float(entry.amount),
                'payment_method': entry.payment_method or 'Non spécifié',
                'has_invoice': entry.has_invoice,
                'status': entry.get_payment_status_display()
            })
        
        return journal

