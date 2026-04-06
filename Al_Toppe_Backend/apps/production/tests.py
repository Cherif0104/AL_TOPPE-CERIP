from django.test import TestCase
from django.contrib.auth import get_user_model
from datetime import date, timedelta
from .models import ProductionCycle, ProductionTask
from apps.entrepreneurs.models import Entrepreneur, Activity

User = get_user_model()


class ProductionCycleModelTests(TestCase):
    """Tests pour le modèle ProductionCycle"""
    
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
            title="Production Test",
            sector="manufacturing",
            creation_date=date.today(),
            legal_form="Informel"
        )
    
    def test_create_production_cycle(self):
        """Test de création d'un cycle de production"""
        cycle = ProductionCycle.objects.create(
            entrepreneur=self.entrepreneur,
            activity=self.activity,
            name="Cycle Production Mensuel",
            description="Cycle de production pour le mois de janvier",
            cycle_type="monthly",
            start_date=date.today(),
            end_date=date.today() + timedelta(days=30),
            target_quantity=1000,
            status="active",
            priority="high"
        )
        
        self.assertEqual(cycle.entrepreneur, self.entrepreneur)
        self.assertEqual(cycle.activity, self.activity)
        self.assertEqual(cycle.name, "Cycle Production Mensuel")
        self.assertEqual(cycle.cycle_type, "monthly")
        self.assertEqual(cycle.start_date, date.today())
        self.assertEqual(cycle.end_date, date.today() + timedelta(days=30))
        self.assertEqual(cycle.target_quantity, 1000)
        self.assertEqual(cycle.status, "active")
        self.assertEqual(cycle.priority, "high")
        self.assertEqual(cycle.produced_quantity, 0)
        self.assertEqual(cycle.progress_percentage, 0)
    
    def test_cycle_str_representation(self):
        """Test de la représentation string du cycle"""
        cycle = ProductionCycle.objects.create(
            entrepreneur=self.entrepreneur,
            activity=self.activity,
            name="Cycle Test",
            cycle_type="weekly"
        )
        
        expected_str = "Cycle Test - Hebdomadaire"
        self.assertEqual(str(cycle), expected_str)
