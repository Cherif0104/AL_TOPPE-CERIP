from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from decimal import Decimal
from datetime import date, timedelta
from .models import Category, CashflowEntry, Budget, BudgetItem
from apps.entrepreneurs.models import Entrepreneur, Activity

User = get_user_model()


class CategoryModelTests(TestCase):
    """Tests pour le modèle Category"""
    
    def test_create_income_category(self):
        """Test de création d'une catégorie de revenu"""
        category = Category.objects.create(
            name="Ventes",
            description="Revenus des ventes",
            type="income",
            icon="fas fa-shopping-cart",
            color="#28a745"
        )
        
        self.assertEqual(category.name, "Ventes")
        self.assertEqual(category.type, "income")
        self.assertTrue(category.is_active)
        self.assertEqual(str(category), "Ventes (Revenu)")
    
    def test_create_expense_category(self):
        """Test de création d'une catégorie de dépense"""
        category = Category.objects.create(
            name="Matériel",
            description="Achat de matériel",
            type="expense",
            icon="fas fa-tools",
            color="#dc3545"
        )
        
        self.assertEqual(category.type, "expense")
        self.assertEqual(str(category), "Matériel (Dépense)")
    
    def test_create_both_category(self):
        """Test de création d'une catégorie mixte"""
        category = Category.objects.create(
            name="Divers",
            description="Catégorie mixte",
            type="both"
        )
        
        self.assertEqual(category.type, "both")
        self.assertEqual(str(category), "Divers (Revenu et Dépense)")


class CashflowEntryModelTests(TestCase):
    """Tests pour le modèle CashflowEntry"""
    
    def setUp(self):
        """Configuration initiale pour les tests"""
        self.user = User.objects.create_user(
            phone="221 70 123 45 67",
            role="entrepreneur"
        )
        self.entrepreneur = Entrepreneur.objects.create(
            user=self.user,
            first_name="Amadou",
            last_name="Ba",
            civility="M",
            cni_number="1234567890123",
            address="Dakar, Sénégal"
        )
        self.activity = Activity.objects.create(
            entrepreneur=self.entrepreneur,
            title="Vente de poisson",
            sector="commerce",
            creation_date=date.today(),
            legal_form="Informel"
        )
        self.category = Category.objects.create(
            name="Ventes",
            type="income"
        )
    
    def test_create_income_entry(self):
        """Test de création d'une entrée de revenu"""
        entry = CashflowEntry.objects.create(
            entrepreneur=self.entrepreneur,
            activity=self.activity,
            title="Vente du jour",
            description="Vente de poisson au marché",
            type="income",
            amount=Decimal("50000.00"),
            category=self.category,
            date=date.today(),
            payment_status="paid"
        )
        
        self.assertEqual(entry.type, "income")
        self.assertEqual(entry.amount, Decimal("50000.00"))
        self.assertEqual(entry.payment_status, "paid")
        self.assertFalse(entry.is_overdue)
        self.assertEqual(entry.days_overdue, 0)
    
    def test_create_expense_entry(self):
        """Test de création d'une entrée de dépense"""
        expense_category = Category.objects.create(
            name="Transport",
            type="expense"
        )
        
        entry = CashflowEntry.objects.create(
            entrepreneur=self.entrepreneur,
            activity=self.activity,
            title="Transport",
            description="Frais de transport",
            type="expense",
            amount=Decimal("5000.00"),
            category=expense_category,
            date=date.today(),
            due_date=date.today() + timedelta(days=7),
            payment_status="pending"
        )
        
        self.assertEqual(entry.type, "expense")
        self.assertEqual(entry.amount, Decimal("5000.00"))
        self.assertEqual(entry.payment_status, "pending")
        self.assertFalse(entry.is_overdue)
    
    def test_overdue_entry(self):
        """Test d'une entrée en retard"""
        entry = CashflowEntry.objects.create(
            entrepreneur=self.entrepreneur,
            activity=self.activity,
            title="Facture en retard",
            type="expense",
            amount=Decimal("10000.00"),
            category=self.category,
            date=date.today() - timedelta(days=10),
            due_date=date.today() - timedelta(days=5),
            payment_status="pending"
        )
        
        self.assertTrue(entry.is_overdue)
        self.assertEqual(entry.days_overdue, 5)
    
    def test_entry_str_representation(self):
        """Test de la représentation string"""
        entry = CashflowEntry.objects.create(
            entrepreneur=self.entrepreneur,
            activity=self.activity,
            title="Vente test",
            type="income",
            amount=Decimal("25000.00"),
            category=self.category,
            date=date.today()
        )
        
        expected_str = "Vente test - 25000.00 FCFA (Revenu)"
        self.assertEqual(str(entry), expected_str)


class BudgetModelTests(TestCase):
    """Tests pour le modèle Budget"""
    
    def setUp(self):
        """Configuration initiale pour les tests"""
        self.user = User.objects.create_user(
            phone="221 70 123 45 68",
            role="entrepreneur"
        )
        self.entrepreneur = Entrepreneur.objects.create(
            user=self.user,
            first_name="Fatou",
            last_name="Diop",
            civility="Mme",
            cni_number="1234567890124",
            address="Dakar, Sénégal"
        )
        self.activity = Activity.objects.create(
            entrepreneur=self.entrepreneur,
            title="Restaurant",
            sector="service",
            creation_date=date.today(),
            legal_form="Informel"
        )
    
    def test_create_budget(self):
        """Test de création d'un budget"""
        budget = Budget.objects.create(
            entrepreneur=self.entrepreneur,
            activity=self.activity,
            name="Budget mensuel",
            description="Budget pour le mois de janvier",
            period="monthly",
            start_date=date.today(),
            end_date=date.today() + timedelta(days=30),
            total_income_budget=Decimal("200000.00"),
            total_expense_budget=Decimal("150000.00"),
            status="active"
        )
        
        self.assertEqual(budget.name, "Budget mensuel")
        self.assertEqual(budget.period, "monthly")
        self.assertEqual(budget.net_budget, Decimal("50000.00"))
        self.assertEqual(budget.status, "active")
        self.assertGreaterEqual(budget.progress_percentage, 0)
    
    def test_budget_str_representation(self):
        """Test de la représentation string"""
        budget = Budget.objects.create(
            entrepreneur=self.entrepreneur,
            activity=self.activity,
            name="Budget test",
            start_date=date.today(),
            end_date=date.today() + timedelta(days=30),
            total_income_budget=Decimal("100000.00"),
            total_expense_budget=Decimal("80000.00")
        )
        
        expected_str = f"Budget test - {date.today()} à {date.today() + timedelta(days=30)}"
        self.assertEqual(str(budget), expected_str)


class BudgetItemModelTests(TestCase):
    """Tests pour le modèle BudgetItem"""
    
    def setUp(self):
        """Configuration initiale pour les tests"""
        self.user = User.objects.create_user(
            phone="221 70 123 45 69",
            role="entrepreneur"
        )
        self.entrepreneur = Entrepreneur.objects.create(
            user=self.user,
            first_name="Omar",
            last_name="Sall",
            civility="M",
            cni_number="1234567890125",
            address="Dakar, Sénégal"
        )
        self.activity = Activity.objects.create(
            entrepreneur=self.entrepreneur,
            title="Commerce",
            sector="commerce",
            creation_date=date.today(),
            legal_form="Informel"
        )
        self.budget = Budget.objects.create(
            entrepreneur=self.entrepreneur,
            activity=self.activity,
            name="Budget test",
            start_date=date.today(),
            end_date=date.today() + timedelta(days=30),
            total_income_budget=Decimal("100000.00"),
            total_expense_budget=Decimal("80000.00")
        )
        self.category = Category.objects.create(
            name="Ventes",
            type="income"
        )
    
    def test_create_budget_item(self):
        """Test de création d'un élément de budget"""
        item = BudgetItem.objects.create(
            budget=self.budget,
            category=self.category,
            budgeted_amount=Decimal("50000.00"),
            notes="Objectif de vente mensuel"
        )
        
        self.assertEqual(item.budgeted_amount, Decimal("50000.00"))
        self.assertEqual(item.actual_amount, 0)  # Pas d'entrées de trésorerie
        self.assertEqual(item.variance, Decimal("-50000.00"))
        self.assertEqual(item.variance_percentage, -100.0)
    
    def test_budget_item_str_representation(self):
        """Test de la représentation string"""
        item = BudgetItem.objects.create(
            budget=self.budget,
            category=self.category,
            budgeted_amount=Decimal("30000.00")
        )
        
        expected_str = "Ventes - 30000.00 FCFA"
        self.assertEqual(str(item), expected_str)
