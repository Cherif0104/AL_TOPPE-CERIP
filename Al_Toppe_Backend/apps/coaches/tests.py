from django.test import TestCase
from django.contrib.auth import get_user_model
from datetime import date, timedelta
from .models import Coach, CoachAssignment, CoachingSession
from apps.entrepreneurs.models import Entrepreneur, Activity

User = get_user_model()


class CoachModelTests(TestCase):
    """Tests pour le modèle Coach"""
    
    def setUp(self):
        """Configuration initiale pour les tests"""
        self.user = User.objects.create_user(
            phone="221 70 123 45 67",
            role="coach"
        )
    
    def test_create_coach(self):
        """Test de création d'un coach"""
        coach = Coach.objects.create(
            user=self.user,
            organization="ONG Développement",
            specialization="business_development",
            years_experience=5,
            bio="Coach expérimenté en développement d'entreprise",
            skills=["gestion", "marketing", "finance"],
            certifications=["Certification PME"],
            is_certified=True,
            is_active=True,
            max_entrepreneurs=15
        )
        
        self.assertEqual(coach.organization, "ONG Développement")
        self.assertEqual(coach.specialization, "business_development")
        self.assertEqual(coach.years_experience, 5)
        self.assertTrue(coach.is_certified)
        self.assertTrue(coach.is_active)
        self.assertEqual(coach.max_entrepreneurs, 15)
        self.assertEqual(coach.current_entrepreneurs_count, 0)
        self.assertEqual(coach.available_slots, 15)
        self.assertTrue(coach.is_available)
    
    def test_coach_str_representation(self):
        """Test de la représentation string du coach"""
        coach = Coach.objects.create(
            user=self.user,
            organization="ONG Test",
            specialization="financial_management"
        )
        
        expected_str = f"Coach {coach.user.get_full_name()} - Développement d'entreprise"
        self.assertEqual(str(coach), expected_str)
    
    def test_coach_availability(self):
        """Test de la disponibilité du coach"""
        coach = Coach.objects.create(
            user=self.user,
            max_entrepreneurs=5
        )
        
        # Coach disponible au début
        self.assertTrue(coach.is_available)
        self.assertEqual(coach.available_slots, 5)
        
        # Simuler l'assignation d'entrepreneurs
        # (Les tests d'assignation seront dans CoachAssignmentModelTests)
    
    def test_coach_sessions_count(self):
        """Test du comptage des sessions"""
        coach = Coach.objects.create(
            user=self.user,
            organization="Test Org"
        )
        
        self.assertEqual(coach.get_total_sessions(), 0)
        self.assertEqual(coach.get_completed_sessions(), 0)
        self.assertEqual(coach.get_success_rate(), 0)


class CoachAssignmentModelTests(TestCase):
    """Tests pour le modèle CoachAssignment"""
    
    def setUp(self):
        """Configuration initiale pour les tests"""
        self.coach_user = User.objects.create_user(
            phone="221 70 123 45 68",
            role="coach"
        )
        self.coach = Coach.objects.create(
            user=self.coach_user,
            organization="ONG Test",
            max_entrepreneurs=10
        )
        
        self.entrepreneur_user = User.objects.create_user(
            phone="221 70 123 45 69",
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
    
    def test_create_coach_assignment(self):
        """Test de création d'une assignation coach"""
        assignment = CoachAssignment.objects.create(
            coach=self.coach,
            entrepreneur=self.entrepreneur,
            status="active",
            start_date=date.today(),
            objectives=["Développer les ventes", "Améliorer la gestion"],
            progress_notes="Première session réalisée avec succès"
        )
        
        self.assertEqual(assignment.coach, self.coach)
        self.assertEqual(assignment.entrepreneur, self.entrepreneur)
        self.assertEqual(assignment.status, "active")
        self.assertTrue(assignment.is_active)
        self.assertGreaterEqual(assignment.duration_days, 0)
    
    def test_assignment_str_representation(self):
        """Test de la représentation string de l'assignation"""
        assignment = CoachAssignment.objects.create(
            coach=self.coach,
            entrepreneur=self.entrepreneur,
            start_date=date.today()
        )
        
        expected_str = f"{self.coach} → {self.entrepreneur}"
        self.assertEqual(str(assignment), expected_str)
    
    def test_complete_assignment(self):
        """Test de finalisation d'une assignation"""
        assignment = CoachAssignment.objects.create(
            coach=self.coach,
            entrepreneur=self.entrepreneur,
            status="active",
            start_date=date.today()
        )
        
        self.assertTrue(assignment.is_active)
        
        # Finaliser l'assignation
        result = assignment.complete_assignment()
        self.assertTrue(result)
        self.assertEqual(assignment.status, "completed")
        self.assertEqual(assignment.end_date, date.today())
        self.assertFalse(assignment.is_active)


class CoachingSessionModelTests(TestCase):
    """Tests pour le modèle CoachingSession"""
    
    def setUp(self):
        """Configuration initiale pour les tests"""
        self.coach_user = User.objects.create_user(
            phone="221 70 123 45 70",
            role="coach"
        )
        self.coach = Coach.objects.create(
            user=self.coach_user,
            organization="ONG Test"
        )
        
        self.entrepreneur_user = User.objects.create_user(
            phone="221 70 123 45 71",
            role="entrepreneur"
        )
        self.entrepreneur = Entrepreneur.objects.create(
            user=self.entrepreneur_user,
            first_name="Fatou",
            last_name="Diop",
            civility="Mme",
            cni_number="1234567890124",
            address="Dakar, Sénégal"
        )
        
        self.assignment = CoachAssignment.objects.create(
            coach=self.coach,
            entrepreneur=self.entrepreneur,
            start_date=date.today()
        )
    
    def test_create_coaching_session(self):
        """Test de création d'une session de coaching"""
        session = CoachingSession.objects.create(
            assignment=self.assignment,
            session_type="initial",
            status="scheduled",
            scheduled_date=date.today(),
            duration_minutes=60,
            agenda="Discussion sur les objectifs et plan d'action"
        )
        
        self.assertEqual(session.session_type, "initial")
        self.assertEqual(session.status, "scheduled")
        self.assertEqual(session.duration_minutes, 60)
        self.assertEqual(session.coach, self.coach)
        self.assertEqual(session.entrepreneur, self.entrepreneur)
        self.assertFalse(session.is_overdue)
        self.assertEqual(session.actual_duration_minutes, 0)
    
    def test_session_str_representation(self):
        """Test de la représentation string de la session"""
        session = CoachingSession.objects.create(
            assignment=self.assignment,
            session_type="follow_up",
            scheduled_date=date.today()
        )
        
        expected_str = f"Session Suivi - {self.assignment}"
        self.assertEqual(str(session), expected_str)
    
    def test_start_session(self):
        """Test de démarrage d'une session"""
        session = CoachingSession.objects.create(
            assignment=self.assignment,
            session_type="initial",
            status="scheduled",
            scheduled_date=date.today()
        )
        
        result = session.start_session()
        self.assertTrue(result)
        self.assertEqual(session.status, "in_progress")
        self.assertIsNotNone(session.actual_start_time)
    
    def test_complete_session(self):
        """Test de finalisation d'une session"""
        session = CoachingSession.objects.create(
            assignment=self.assignment,
            session_type="initial",
            status="in_progress",
            scheduled_date=date.today(),
            actual_start_time=date.today()
        )
        
        result = session.complete_session(
            notes="Session très productive",
            action_items=["Analyser les ventes", "Préparer le budget"],
            entrepreneur_rating=5
        )
        
        self.assertTrue(result)
        self.assertEqual(session.status, "completed")
        self.assertIsNotNone(session.actual_end_time)
        self.assertEqual(session.notes, "Session très productive")
        self.assertEqual(session.entrepreneur_rating, 5)
        self.assertGreater(session.actual_duration_minutes, 0)
    
    def test_overdue_session(self):
        """Test d'une session en retard"""
        past_date = date.today() - timedelta(days=1)
        session = CoachingSession.objects.create(
            assignment=self.assignment,
            session_type="follow_up",
            status="scheduled",
            scheduled_date=past_date
        )
        
        self.assertTrue(session.is_overdue)
    
    def test_session_dependencies(self):
        """Test des dépendances de session"""
        session = CoachingSession.objects.create(
            assignment=self.assignment,
            session_type="initial",
            status="scheduled",
            scheduled_date=date.today()
        )
        
        # Test des tâches dépendantes (vide pour l'instant)
        dependent_tasks = session.get_dependent_tasks()
        self.assertEqual(len(dependent_tasks), 0)
        
        # Test des tâches bloquantes (vide pour l'instant)
        blocking_tasks = session.get_blocking_tasks()
        self.assertEqual(len(blocking_tasks), 0)
