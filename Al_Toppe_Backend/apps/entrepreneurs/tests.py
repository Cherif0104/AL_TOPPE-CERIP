from django.test import TestCase
from django.contrib.auth import get_user_model
from .models import Entrepreneur, Location, Activity
from datetime import date

User = get_user_model()


class EntrepreneurModelTests(TestCase):
    """Tests pour le modèle Entrepreneur"""
    
    def setUp(self):
        """Configuration initiale pour les tests"""
        self.user = User.objects.create_user(
            phone="221 70 123 45 67",
            role="entrepreneur"
        )
    
    def test_create_entrepreneur(self):
        """Test de création d'un entrepreneur"""
        entrepreneur = Entrepreneur.objects.create(
            user=self.user,
            first_name="Amadou",
            last_name="Ba",
            civility="M",
            cni_number="1234567890123",
            address="Dakar, Sénégal",
            birth_date=date(1990, 1, 1)
        )
        
        self.assertEqual(entrepreneur.first_name, "Amadou")
        self.assertEqual(entrepreneur.last_name, "Ba")
        self.assertEqual(entrepreneur.full_name, "Amadou Ba")
        self.assertEqual(entrepreneur.cni_number, "1234567890123")
        self.assertIsNotNone(entrepreneur.age)
    
    def test_entrepreneur_str_representation(self):
        """Test de la représentation string de l'entrepreneur"""
        entrepreneur = Entrepreneur.objects.create(
            user=self.user,
            first_name="Fatou",
            last_name="Diop",
            civility="Mme",
            cni_number="1234567890124",
            address="Dakar, Sénégal"
        )
        
        expected_str = "Fatou Diop (221 70 123 45 67)"
        self.assertEqual(str(entrepreneur), expected_str)
    
    def test_cni_optional(self):
        """Le CNI peut être vide (pas de contrainte au niveau modèle)."""
        user2 = User.objects.create_user(
            phone="221 70 123 45 99",
            role="entrepreneur",
        )
        entrepreneur = Entrepreneur.objects.create(
            user=user2,
            first_name="Test",
            last_name="SansCni",
            civility="M",
            cni_number=None,
            address="Dakar",
        )
        entrepreneur.full_clean()
        self.assertIsNone(entrepreneur.cni_number)


class LocationModelTests(TestCase):
    """Tests pour le modèle Location"""
    
    def setUp(self):
        """Configuration initiale pour les tests"""
        self.user = User.objects.create_user(
            phone="221 70 123 45 68",
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
    
    def test_create_location(self):
        """Test de création d'une localisation"""
        location = Location.objects.create(
            entrepreneur=self.entrepreneur,
            address="Plateau, Dakar",
            region="Dakar",
            city="Dakar",
            lat=14.6937,
            lng=-17.4441,
            is_primary=True
        )
        
        self.assertEqual(location.address, "Plateau, Dakar")
        self.assertEqual(location.region, "Dakar")
        self.assertTrue(location.is_primary)
        self.assertEqual(location.coordinates, (14.6937, -17.4441))


class ActivityModelTests(TestCase):
    """Tests pour le modèle Activity"""
    
    def setUp(self):
        """Configuration initiale pour les tests"""
        self.user = User.objects.create_user(
            phone="221 70 123 45 69",
            role="entrepreneur"
        )
        self.entrepreneur = Entrepreneur.objects.create(
            user=self.user,
            first_name="Awa",
            last_name="Ndiaye",
            civility="Mme",
            cni_number="1234567890126",
            address="Dakar, Sénégal"
        )
    
    def test_create_activity(self):
        """Test de création d'une activité"""
        activity = Activity.objects.create(
            entrepreneur=self.entrepreneur,
            title="Vente de poisson",
            sector="commerce",
            description="Vente de poisson frais au marché",
            creation_date=date.today(),
            legal_form="Informel",
            status="active"
        )
        
        self.assertEqual(activity.title, "Vente de poisson")
        self.assertEqual(activity.sector, "commerce")
        self.assertTrue(activity.is_active)
        self.assertGreaterEqual(activity.age_in_days, 0)
