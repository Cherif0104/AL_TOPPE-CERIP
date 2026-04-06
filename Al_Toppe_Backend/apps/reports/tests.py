from django.test import TestCase
from django.contrib.auth import get_user_model
from datetime import date, timedelta
from .models import Report, ReportTemplate, ReportSchedule, ReportDistribution
from apps.entrepreneurs.models import Entrepreneur, Activity

User = get_user_model()


class ReportModelTests(TestCase):
    """Tests pour le modèle Report"""
    
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
            title="Commerce Test",
            sector="commerce",
            creation_date=date.today(),
            legal_form="Informel"
        )
        self.template = ReportTemplate.objects.create(
            name="Template Test",
            description="Template de test",
            report_type="financial",
            template_config={
                "sections": ["revenue", "expenses", "profit"],
                "format": "pdf"
            }
        )
    
    def test_create_report(self):
        """Test de création d'un rapport"""
        report = Report.objects.create(
            name="Rapport Mensuel",
            description="Rapport financier du mois de janvier",
            report_type="financial",
            target_user=self.entrepreneur,
            activity=self.activity,
            template=self.template,
            period_start=date.today() - timedelta(days=30),
            period_end=date.today(),
            status="generated",
            file_path="/reports/monthly_report_2024_01.pdf",
            file_size=1024000,
            generation_time_seconds=45,
            report_data={
                "summary": {
                    "total_revenue": 1000000,
                    "total_expenses": 600000,
                    "net_profit": 400000
                },
                "charts": [
                    {"type": "revenue_trend", "data": []},
                    {"type": "expense_breakdown", "data": []}
                ]
            }
        )
        
        self.assertEqual(report.name, "Rapport Mensuel")
        self.assertEqual(report.report_type, "financial")
        self.assertEqual(report.target_user, self.entrepreneur)
        self.assertEqual(report.activity, self.activity)
        self.assertEqual(report.template, self.template)
        self.assertEqual(report.period_start, date.today() - timedelta(days=30))
        self.assertEqual(report.period_end, date.today())
        self.assertEqual(report.status, "generated")
        self.assertEqual(report.file_path, "/reports/monthly_report_2024_01.pdf")
        self.assertEqual(report.file_size, 1024000)
        self.assertEqual(report.generation_time_seconds, 45)
        self.assertIsNotNone(report.report_data)
        self.assertIsNotNone(report.generated_at)
    
    def test_report_str_representation(self):
        """Test de la représentation string du rapport"""
        report = Report.objects.create(
            name="Rapport Test",
            report_type="performance",
            target_user=self.entrepreneur,
            status="generated"
        )
        
        expected_str = "Rapport Test - Performance"
        self.assertEqual(str(report), expected_str)
