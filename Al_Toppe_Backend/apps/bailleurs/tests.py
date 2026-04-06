from django.test import TestCase
from django.contrib.auth import get_user_model
from datetime import date, timedelta
from decimal import Decimal
from .models import Bailleur, FundingProgram, FundingApplication
from apps.entrepreneurs.models import Entrepreneur, Activity

User = get_user_model()


class BailleurModelTests(TestCase):
    """Tests pour le modèle Bailleur"""
    
    def setUp(self):
        """Configuration initiale pour les tests"""
        self.user = User.objects.create_user(
            phone="221 70 123 45 67",
            role="bailleur"
        )
    
    def test_create_bailleur(self):
        """Test de création d'un bailleur"""
        bailleur = Bailleur.objects.create(
            user=self.user,
            organization="Banque de Développement",
            organization_type="bank",
            contact_person="M. Diallo",
            contact_email="contact@banque.sn",
            contact_phone="221 33 123 45 67",
            address="Dakar, Sénégal",
            website="https://www.banque.sn",
            description="Institution financière spécialisée dans le financement des PME",
            is_active=True
        )
        
        self.assertEqual(bailleur.organization, "Banque de Développement")
        self.assertEqual(bailleur.organization_type, "bank")
        self.assertEqual(bailleur.contact_person, "M. Diallo")
        self.assertTrue(bailleur.is_active)
        self.assertEqual(bailleur.get_total_funded(), Decimal("0.00"))
        self.assertEqual(bailleur.get_entrepreneurs_supported(), 0)
    
    def test_bailleur_str_representation(self):
        """Test de la représentation string du bailleur"""
        bailleur = Bailleur.objects.create(
            user=self.user,
            organization="ONG Finance",
            organization_type="ngo"
        )
        
        expected_str = "ONG Finance (ONG)"
        self.assertEqual(str(bailleur), expected_str)
    
    def test_bailleur_active_programs_count(self):
        """Test du comptage des programmes actifs"""
        bailleur = Bailleur.objects.create(
            user=self.user,
            organization="Test Bailleur"
        )
        
        # Créer des programmes
        program1 = FundingProgram.objects.create(
            bailleur=bailleur,
            name="Programme Test 1",
            status="active"
        )
        program2 = FundingProgram.objects.create(
            bailleur=bailleur,
            name="Programme Test 2",
            status="inactive"
        )
        
        self.assertEqual(bailleur.get_active_programs_count(), 1)


class FundingProgramModelTests(TestCase):
    """Tests pour le modèle FundingProgram"""
    
    def setUp(self):
        """Configuration initiale pour les tests"""
        self.user = User.objects.create_user(
            phone="221 70 123 45 68",
            role="bailleur"
        )
        self.bailleur = Bailleur.objects.create(
            user=self.user,
            organization="Banque Test",
            organization_type="bank"
        )
    
    def test_create_funding_program(self):
        """Test de création d'un programme de financement"""
        program = FundingProgram.objects.create(
            bailleur=self.bailleur,
            name="Programme PME",
            description="Financement des petites et moyennes entreprises",
            funding_type="loan",
            min_amount=Decimal("100000.00"),
            max_amount=Decimal("5000000.00"),
            interest_rate=Decimal("8.5"),
            term_months=24,
            requirements=["CNI", "Plan d'affaires", "Garantie"],
            target_sectors=["commerce", "service"],
            application_deadline=date.today() + timedelta(days=30),
            status="active",
            is_active=True
        )
        
        self.assertEqual(program.name, "Programme PME")
        self.assertEqual(program.funding_type, "loan")
        self.assertEqual(program.min_amount, Decimal("100000.00"))
        self.assertEqual(program.max_amount, Decimal("5000000.00"))
        self.assertEqual(program.interest_rate, Decimal("8.5"))
        self.assertEqual(program.term_months, 24)
        self.assertTrue(program.is_active)
        self.assertEqual(program.get_application_status(), "Ouvert aux candidatures")
    
    def test_program_str_representation(self):
        """Test de la représentation string du programme"""
        program = FundingProgram.objects.create(
            bailleur=self.bailleur,
            name="Programme Test",
            funding_type="grant"
        )
        
        expected_str = "Programme Test - Subvention"
        self.assertEqual(str(program), expected_str)
    
    def test_program_eligibility_check(self):
        """Test de vérification d'éligibilité"""
        program = FundingProgram.objects.create(
            bailleur=self.bailleur,
            name="Programme Éligibilité",
            min_amount=Decimal("50000.00"),
            max_amount=Decimal("1000000.00"),
            target_sectors=["commerce"]
        )
        
        # Test montant éligible
        self.assertTrue(program.is_eligible_amount(Decimal("100000.00")))
        self.assertFalse(program.is_eligible_amount(Decimal("30000.00")))
        self.assertFalse(program.is_eligible_amount(Decimal("2000000.00")))
        
        # Test secteur éligible
        self.assertTrue(program.is_eligible_sector("commerce"))
        self.assertFalse(program.is_eligible_sector("agriculture"))
    
    def test_program_application_count(self):
        """Test du comptage des candidatures"""
        program = FundingProgram.objects.create(
            bailleur=self.bailleur,
            name="Programme Comptage"
        )
        
        self.assertEqual(program.get_application_count(), 0)
        self.assertEqual(program.get_approved_count(), 0)
        self.assertEqual(program.get_funding_allocated(), Decimal("0.00"))


class FundingApplicationModelTests(TestCase):
    """Tests pour le modèle FundingApplication"""
    
    def setUp(self):
        """Configuration initiale pour les tests"""
        # Créer un bailleur
        self.bailleur_user = User.objects.create_user(
            phone="221 70 123 45 69",
            role="bailleur"
        )
        self.bailleur = Bailleur.objects.create(
            user=self.bailleur_user,
            organization="Banque Test"
        )
        
        # Créer un programme
        self.program = FundingProgram.objects.create(
            bailleur=self.bailleur,
            name="Programme Test",
            min_amount=Decimal("100000.00"),
            max_amount=Decimal("1000000.00"),
            status="active"
        )
        
        # Créer un entrepreneur
        self.entrepreneur_user = User.objects.create_user(
            phone="221 70 123 45 70",
            role="entrepreneur"
        )
        self.entrepreneur = Entrepreneur.objects.create(
            user=self.entrepreneur_user,
            first_name="Amadou",
            last_name="Ba",
            civility="M",
            cni_number="1234567890123",
            address="Dakar, Sénégal"
        )
        
        # Créer une activité
        self.activity = Activity.objects.create(
            entrepreneur=self.entrepreneur,
            title="Commerce Test",
            sector="commerce",
            creation_date=date.today(),
            legal_form="Informel"
        )
    
    def test_create_funding_application(self):
        """Test de création d'une candidature de financement"""
        application = FundingApplication.objects.create(
            entrepreneur=self.entrepreneur,
            program=self.program,
            activity=self.activity,
            requested_amount=Decimal("500000.00"),
            purpose="Développement de l'activité commerciale",
            business_plan_summary="Plan d'affaires détaillé",
            financial_projections={
                "revenue_year_1": 2000000,
                "revenue_year_2": 3000000,
                "profit_margin": 0.25
            },
            repayment_plan="Remboursement sur 24 mois",
            status="submitted",
            submission_date=date.today()
        )
        
        self.assertEqual(application.entrepreneur, self.entrepreneur)
        self.assertEqual(application.program, self.program)
        self.assertEqual(application.requested_amount, Decimal("500000.00"))
        self.assertEqual(application.status, "submitted")
        self.assertEqual(application.submission_date, date.today())
        self.assertIsNone(application.approved_amount)
        self.assertIsNone(application.approval_date)
    
    def test_application_str_representation(self):
        """Test de la représentation string de la candidature"""
        application = FundingApplication.objects.create(
            entrepreneur=self.entrepreneur,
            program=self.program,
            activity=self.activity,
            requested_amount=Decimal("300000.00"),
            status="submitted"
        )
        
        expected_str = f"Candidature {self.entrepreneur} - Programme Test"
        self.assertEqual(str(application), expected_str)
    
    def test_application_approval(self):
        """Test d'approbation d'une candidature"""
        application = FundingApplication.objects.create(
            entrepreneur=self.entrepreneur,
            program=self.program,
            activity=self.activity,
            requested_amount=Decimal("500000.00"),
            status="under_review"
        )
        
        result = application.approve(
            approved_amount=Decimal("400000.00"),
            conditions=["Garantie requise", "Suivi mensuel"],
            notes="Candidature approuvée avec conditions"
        )
        
        self.assertTrue(result)
        self.assertEqual(application.status, "approved")
        self.assertEqual(application.approved_amount, Decimal("400000.00"))
        self.assertEqual(application.approval_date, date.today())
        self.assertIsNotNone(application.conditions)
        self.assertEqual(application.notes, "Candidature approuvée avec conditions")
    
    def test_application_rejection(self):
        """Test de rejet d'une candidature"""
        application = FundingApplication.objects.create(
            entrepreneur=self.entrepreneur,
            program=self.program,
            activity=self.activity,
            requested_amount=Decimal("500000.00"),
            status="under_review"
        )
        
        result = application.reject(
            reason="Plan d'affaires insuffisant",
            notes="Candidature rejetée - plan d'affaires à revoir"
        )
        
        self.assertTrue(result)
        self.assertEqual(application.status, "rejected")
        self.assertEqual(application.rejection_date, date.today())
        self.assertEqual(application.rejection_reason, "Plan d'affaires insuffisant")
        self.assertEqual(application.notes, "Candidature rejetée - plan d'affaires à revoir")
    
    def test_application_withdrawal(self):
        """Test de retrait d'une candidature"""
        application = FundingApplication.objects.create(
            entrepreneur=self.entrepreneur,
            program=self.program,
            activity=self.activity,
            requested_amount=Decimal("500000.00"),
            status="submitted"
        )
        
        result = application.withdraw("Changement de stratégie")
        self.assertTrue(result)
        self.assertEqual(application.status, "withdrawn")
        self.assertEqual(application.withdrawal_date, date.today())
        self.assertEqual(application.withdrawal_reason, "Changement de stratégie")
    
    def test_application_eligibility_check(self):
        """Test de vérification d'éligibilité de la candidature"""
        application = FundingApplication.objects.create(
            entrepreneur=self.entrepreneur,
            program=self.program,
            activity=self.activity,
            requested_amount=Decimal("500000.00")
        )
        
        # Test éligibilité
        eligibility = application.check_eligibility()
        self.assertIsNotNone(eligibility)
        self.assertIn("eligible", eligibility)
        self.assertIn("reasons", eligibility)
