from django.test import TestCase
from django.contrib.auth import get_user_model
from datetime import date, timedelta
from .models import BusinessPlanTemplate, BusinessPlan, BusinessPlanValidation, BusinessPlanComment
from apps.entrepreneurs.models import Entrepreneur, Activity

User = get_user_model()


class BusinessPlanTemplateModelTests(TestCase):
    """Tests pour le modèle BusinessPlanTemplate"""
    
    def test_create_business_plan_template(self):
        """Test de création d'un template de plan d'affaires"""
        template = BusinessPlanTemplate.objects.create(
            name="Template Commerce",
            description="Template pour les activités commerciales",
            sector="commerce",
            version="1.0",
            is_active=True,
            template_data={
                "sections": [
                    {"name": "Résumé exécutif", "required": True},
                    {"name": "Analyse du marché", "required": True},
                    {"name": "Stratégie marketing", "required": False}
                ]
            }
        )
        
        self.assertEqual(template.name, "Template Commerce")
        self.assertEqual(template.sector, "commerce")
        self.assertEqual(template.version, "1.0")
        self.assertTrue(template.is_active)
        self.assertIsNotNone(template.template_data)
    
    def test_template_str_representation(self):
        """Test de la représentation string du template"""
        template = BusinessPlanTemplate.objects.create(
            name="Template Test",
            sector="service",
            version="1.0"
        )
        
        expected_str = "Template Test v1.0 (Service)"
        self.assertEqual(str(template), expected_str)
    
    def test_template_usage_count(self):
        """Test du comptage d'utilisation du template"""
        template = BusinessPlanTemplate.objects.create(
            name="Template Usage",
            sector="commerce"
        )
        
        self.assertEqual(template.get_usage_count(), 0)
