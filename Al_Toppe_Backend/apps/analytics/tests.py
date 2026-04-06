from django.test import TestCase
from django.contrib.auth import get_user_model
from datetime import date, timedelta
from decimal import Decimal
from .models import KPIMetric, KPIMeasurement, Dashboard, AnalyticsReport, TrendAnalysis
from apps.entrepreneurs.models import Entrepreneur, Activity

User = get_user_model()


class KPIMetricModelTests(TestCase):
    """Tests pour le modèle KPIMetric"""
    
    def test_create_kpi_metric(self):
        """Test de création d'un KPI"""
        kpi = KPIMetric.objects.create(
            name="Chiffre d'affaires mensuel",
            description="Revenus totaux par mois",
            metric_type="revenue",
            unit="FCFA",
            calculation_method="sum",
            target_value=Decimal("1000000.00"),
            is_active=True,
            category="financial"
        )
        
        self.assertEqual(kpi.name, "Chiffre d'affaires mensuel")
        self.assertEqual(kpi.metric_type, "revenue")
        self.assertEqual(kpi.unit, "FCFA")
        self.assertEqual(kpi.calculation_method, "sum")
        self.assertEqual(kpi.target_value, Decimal("1000000.00"))
        self.assertTrue(kpi.is_active)
        self.assertEqual(kpi.category, "financial")
    
    def test_kpi_str_representation(self):
        """Test de la représentation string du KPI"""
        kpi = KPIMetric.objects.create(
            name="KPI Test",
            metric_type="growth",
            unit="%"
        )
        
        expected_str = "KPI Test (Croissance)"
        self.assertEqual(str(kpi), expected_str)
    
    def test_kpi_measurement_count(self):
        """Test du comptage des mesures"""
        kpi = KPIMetric.objects.create(
            name="KPI Comptage",
            metric_type="revenue"
        )
        
        self.assertEqual(kpi.get_measurement_count(), 0)
