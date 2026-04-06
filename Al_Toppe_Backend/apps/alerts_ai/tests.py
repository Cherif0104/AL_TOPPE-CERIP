from django.test import TestCase
from django.contrib.auth import get_user_model
from datetime import date, timedelta
from decimal import Decimal
from .models import AlertType, AlertRule, Alert, Notification, AIModel, AIAnalysis, Recommendation
from apps.entrepreneurs.models import Entrepreneur, Activity

User = get_user_model()


class AlertTypeModelTests(TestCase):
    """Tests pour le modèle AlertType"""
    
    def test_create_alert_type(self):
        """Test de création d'un type d'alerte"""
        alert_type = AlertType.objects.create(
            name="Dépassement de budget",
            description="Alerte quand le budget est dépassé",
            category="financial",
            severity="warning",
            icon="fas fa-exclamation-triangle",
            color="#ffc107",
            is_active=True
        )
        
        self.assertEqual(alert_type.name, "Dépassement de budget")
        self.assertEqual(alert_type.category, "financial")
        self.assertEqual(alert_type.severity, "warning")
        self.assertEqual(alert_type.icon, "fas fa-exclamation-triangle")
        self.assertEqual(alert_type.color, "#ffc107")
        self.assertTrue(alert_type.is_active)
    
    def test_alert_type_str_representation(self):
        """Test de la représentation string du type d'alerte"""
        alert_type = AlertType.objects.create(
            name="Alerte Test",
            category="performance",
            severity="error"
        )
        
        expected_str = "Alerte Test (Performance - Erreur)"
        self.assertEqual(str(alert_type), expected_str)
    
    def test_alert_type_usage_count(self):
        """Test du comptage d'utilisation du type d'alerte"""
        alert_type = AlertType.objects.create(
            name="Type Usage",
            category="financial"
        )
        
        self.assertEqual(alert_type.get_usage_count(), 0)


class AlertRuleModelTests(TestCase):
    """Tests pour le modèle AlertRule"""
    
    def setUp(self):
        """Configuration initiale pour les tests"""
        self.alert_type = AlertType.objects.create(
            name="Règle Test",
            category="financial",
            severity="warning"
        )
    
    def test_create_alert_rule(self):
        """Test de création d'une règle d'alerte"""
        rule = AlertRule.objects.create(
            alert_type=self.alert_type,
            name="Règle budget mensuel",
            description="Déclencher quand le budget mensuel est dépassé de 20%",
            condition="budget_usage > 1.2",
            threshold_value=Decimal("1.2"),
            comparison_operator=">",
            is_active=True,
            frequency="daily"
        )
        
        self.assertEqual(rule.alert_type, self.alert_type)
        self.assertEqual(rule.name, "Règle budget mensuel")
        self.assertEqual(rule.condition, "budget_usage > 1.2")
        self.assertEqual(rule.threshold_value, Decimal("1.2"))
        self.assertEqual(rule.comparison_operator, ">")
        self.assertTrue(rule.is_active)
        self.assertEqual(rule.frequency, "daily")
    
    def test_rule_str_representation(self):
        """Test de la représentation string de la règle"""
        rule = AlertRule.objects.create(
            alert_type=self.alert_type,
            name="Règle Test",
            condition="revenue < 100000"
        )
        
        expected_str = "Règle Test - Règle Test"
        self.assertEqual(str(rule), expected_str)
    
    def test_rule_evaluation(self):
        """Test d'évaluation d'une règle"""
        rule = AlertRule.objects.create(
            alert_type=self.alert_type,
            name="Règle Évaluation",
            condition="value > 1000",
            threshold_value=Decimal("1000.00"),
            comparison_operator=">"
        )
        
        # Test condition vraie
        self.assertTrue(rule.evaluate({"value": 1500}))
        
        # Test condition fausse
        self.assertFalse(rule.evaluate({"value": 500}))


class AlertModelTests(TestCase):
    """Tests pour le modèle Alert"""
    
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
        self.alert_type = AlertType.objects.create(
            name="Alerte Test",
            category="financial",
            severity="warning"
        )
        self.alert_rule = AlertRule.objects.create(
            alert_type=self.alert_type,
            name="Règle Test",
            condition="budget > 100000"
        )
    
    def test_create_alert(self):
        """Test de création d'une alerte"""
        alert = Alert.objects.create(
            alert_type=self.alert_type,
            alert_rule=self.alert_rule,
            entrepreneur=self.entrepreneur,
            activity=self.activity,
            title="Budget dépassé",
            message="Le budget mensuel a été dépassé de 25%",
            severity="warning",
            status="active",
            trigger_data={
                "budget_allocated": 100000,
                "budget_used": 125000,
                "percentage": 1.25
            },
            ai_confidence=0.85
        )
        
        self.assertEqual(alert.alert_type, self.alert_type)
        self.assertEqual(alert.alert_rule, self.alert_rule)
        self.assertEqual(alert.entrepreneur, self.entrepreneur)
        self.assertEqual(alert.activity, self.activity)
        self.assertEqual(alert.title, "Budget dépassé")
        self.assertEqual(alert.severity, "warning")
        self.assertEqual(alert.status, "active")
        self.assertEqual(alert.ai_confidence, 0.85)
        self.assertIsNotNone(alert.trigger_data)
        self.assertIsNotNone(alert.created_at)
    
    def test_alert_str_representation(self):
        """Test de la représentation string de l'alerte"""
        alert = Alert.objects.create(
            alert_type=self.alert_type,
            alert_rule=self.alert_rule,
            entrepreneur=self.entrepreneur,
            activity=self.activity,
            title="Alerte Test",
            severity="error"
        )
        
        expected_str = "Alerte Test - Erreur"
        self.assertEqual(str(alert), expected_str)
    
    def test_alert_acknowledgment(self):
        """Test d'acquittement d'une alerte"""
        alert = Alert.objects.create(
            alert_type=self.alert_type,
            alert_rule=self.alert_rule,
            entrepreneur=self.entrepreneur,
            activity=self.activity,
            title="Alerte Acquittement",
            status="active"
        )
        
        result = alert.acknowledge()
        self.assertTrue(result)
        self.assertEqual(alert.status, "acknowledged")
        self.assertIsNotNone(alert.acknowledged_at)
    
    def test_alert_resolution(self):
        """Test de résolution d'une alerte"""
        alert = Alert.objects.create(
            alert_type=self.alert_type,
            alert_rule=self.alert_rule,
            entrepreneur=self.entrepreneur,
            activity=self.activity,
            title="Alerte Résolution",
            status="active"
        )
        
        result = alert.resolve("Problème résolu")
        self.assertTrue(result)
        self.assertEqual(alert.status, "resolved")
        self.assertEqual(alert.resolution_notes, "Problème résolu")
        self.assertIsNotNone(alert.resolved_at)
    
    def test_alert_ai_confidence_display(self):
        """Test de l'affichage de la confiance IA"""
        # Alerte avec haute confiance
        high_confidence_alert = Alert.objects.create(
            alert_type=self.alert_type,
            alert_rule=self.alert_rule,
            entrepreneur=self.entrepreneur,
            activity=self.activity,
            title="Alerte Haute Confiance",
            ai_confidence=0.95
        )
        
        self.assertEqual(high_confidence_alert.ai_confidence_display(), "95%")
        
        # Alerte avec basse confiance
        low_confidence_alert = Alert.objects.create(
            alert_type=self.alert_type,
            alert_rule=self.alert_rule,
            entrepreneur=self.entrepreneur,
            activity=self.activity,
            title="Alerte Basse Confiance",
            ai_confidence=0.45
        )
        
        self.assertEqual(low_confidence_alert.ai_confidence_display(), "45%")


class NotificationModelTests(TestCase):
    """Tests pour le modèle Notification"""
    
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
        self.alert_type = AlertType.objects.create(
            name="Notification Test",
            category="system",
            severity="info"
        )
    def test_create_notification(self):
        """Test de création d'une notification"""
        notification = Notification.objects.create(
            user=self.user,
            title="Nouvelle notification",
            message="Vous avez reçu une nouvelle alerte",
            notification_type="alert",
            priority="medium",
            is_read=False,
            delivery_method="in_app",
            metadata={
                "alert_id": 1,
                "category": "financial"
            }
        )
        
        self.assertEqual(notification.user, self.user)
        self.assertEqual(notification.title, "Nouvelle notification")
        self.assertEqual(notification.message, "Vous avez reçu une nouvelle alerte")
        self.assertEqual(notification.notification_type, "alert")
        self.assertEqual(notification.priority, "medium")
        self.assertFalse(notification.is_read)
        self.assertEqual(notification.delivery_method, "in_app")
        self.assertIsNotNone(notification.metadata)
        self.assertIsNotNone(notification.created_at)
    
    def test_notification_str_representation(self):
        """Test de la représentation string de la notification"""
        notification = Notification.objects.create(
            user=self.user,
            title="Notification Test",
            message="Message test"
        )
        
        expected_str = "Notification Test - Fatou Diop"
        self.assertEqual(str(notification), expected_str)
    
    def test_notification_mark_as_read(self):
        """Test de marquage comme lu"""
        notification = Notification.objects.create(
            user=self.user,
            title="Notification Non Lue",
            message="Message non lu",
            is_read=False
        )
        
        result = notification.mark_as_read()
        self.assertTrue(result)
        self.assertTrue(notification.is_read)
        self.assertIsNotNone(notification.read_at)
    
    def test_notification_delivery_metrics(self):
        """Test des métriques de livraison"""
        notification = Notification.objects.create(
            user=self.user,
            title="Notification Métriques",
            message="Test des métriques",
            delivery_method="email",
            delivery_status="delivered"
        )
        
        metrics = notification.delivery_metrics()
        self.assertIsNotNone(metrics)
        self.assertIn("status", metrics)
        self.assertIn("method", metrics)


class AIModelModelTests(TestCase):
    """Tests pour le modèle AIModel"""
    
    def test_create_ai_model(self):
        """Test de création d'un modèle IA"""
        ai_model = AIModel.objects.create(
            name="Modèle Prédiction Revenus",
            description="Modèle pour prédire les revenus futurs",
            model_type="prediction",
            version="1.0",
            algorithm="linear_regression",
            training_data_size=10000,
            accuracy=0.85,
            is_active=True,
            model_config={
                "features": ["revenue_history", "seasonality", "market_trends"],
                "target": "future_revenue",
                "parameters": {"learning_rate": 0.01}
            }
        )
        
        self.assertEqual(ai_model.name, "Modèle Prédiction Revenus")
        self.assertEqual(ai_model.model_type, "prediction")
        self.assertEqual(ai_model.version, "1.0")
        self.assertEqual(ai_model.algorithm, "linear_regression")
        self.assertEqual(ai_model.training_data_size, 10000)
        self.assertEqual(ai_model.accuracy, 0.85)
        self.assertTrue(ai_model.is_active)
        self.assertIsNotNone(ai_model.model_config)
    
    def test_ai_model_str_representation(self):
        """Test de la représentation string du modèle IA"""
        ai_model = AIModel.objects.create(
            name="Modèle Test",
            model_type="classification",
            version="2.0"
        )
        
        expected_str = "Modèle Test v2.0 (Classification)"
        self.assertEqual(str(ai_model), expected_str)
    
    def test_ai_model_accuracy_display(self):
        """Test de l'affichage de la précision"""
        ai_model = AIModel.objects.create(
            name="Modèle Précision",
            model_type="prediction",
            accuracy=0.875
        )
        
        self.assertEqual(ai_model.accuracy_display(), "87.5%")


class AIAnalysisModelTests(TestCase):
    """Tests pour le modèle AIAnalysis"""
    
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
            title="Service Test",
            sector="service",
            creation_date=date.today(),
            legal_form="Informel"
        )
        self.ai_model = AIModel.objects.create(
            name="Modèle Test",
            model_type="analysis",
            version="1.0"
        )
    
    def test_create_ai_analysis(self):
        """Test de création d'une analyse IA"""
        analysis = AIAnalysis.objects.create(
            ai_model=self.ai_model,
            entrepreneur=self.entrepreneur,
            activity=self.activity,
            analysis_type="performance",
            input_data={
                "revenue_history": [100000, 120000, 110000, 130000],
                "expense_history": [60000, 70000, 65000, 75000],
                "market_conditions": "stable"
            },
            output_data={
                "predicted_revenue": 140000,
                "confidence_interval": [130000, 150000],
                "risk_factors": ["seasonality", "competition"]
            },
            confidence_score=0.82,
            processing_time_ms=1500,
            status="completed"
        )
        
        self.assertEqual(analysis.ai_model, self.ai_model)
        self.assertEqual(analysis.entrepreneur, self.entrepreneur)
        self.assertEqual(analysis.activity, self.activity)
        self.assertEqual(analysis.analysis_type, "performance")
        self.assertEqual(analysis.confidence_score, 0.82)
        self.assertEqual(analysis.processing_time_ms, 1500)
        self.assertEqual(analysis.status, "completed")
        self.assertIsNotNone(analysis.input_data)
        self.assertIsNotNone(analysis.output_data)
        self.assertIsNotNone(analysis.created_at)
    
    def test_analysis_str_representation(self):
        """Test de la représentation string de l'analyse"""
        analysis = AIAnalysis.objects.create(
            ai_model=self.ai_model,
            entrepreneur=self.entrepreneur,
            activity=self.activity,
            analysis_type="prediction"
        )
        
        expected_str = f"Analyse Prédiction - {self.entrepreneur}"
        self.assertEqual(str(analysis), expected_str)
    
    def test_analysis_confidence_display(self):
        """Test de l'affichage de la confiance"""
        analysis = AIAnalysis.objects.create(
            ai_model=self.ai_model,
            entrepreneur=self.entrepreneur,
            activity=self.activity,
            confidence_score=0.875
        )
        
        self.assertEqual(analysis.confidence_score_display(), "87.5%")
    
    def test_analysis_processing_time_display(self):
        """Test de l'affichage du temps de traitement"""
        analysis = AIAnalysis.objects.create(
            ai_model=self.ai_model,
            entrepreneur=self.entrepreneur,
            activity=self.activity,
            processing_time_ms=1500
        )
        
        self.assertEqual(analysis.processing_time_display(), "1.5s")


class RecommendationModelTests(TestCase):
    """Tests pour le modèle Recommendation"""
    
    def setUp(self):
        """Configuration initiale pour les tests"""
        self.user = User.objects.create_user(
            phone="221 70 123 45 70",
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
        self.activity = Activity.objects.create(
            entrepreneur=self.entrepreneur,
            title="Commerce Test",
            sector="commerce",
            creation_date=date.today(),
            legal_form="Informel"
        )
        self.ai_model = AIModel.objects.create(
            name="Modèle Recommandation",
            model_type="recommendation",
            version="1.0"
        )
        self.ai_analysis = AIAnalysis.objects.create(
            ai_model=self.ai_model,
            entrepreneur=self.entrepreneur,
            activity=self.activity,
            analysis_type="recommendation"
        )
    
    def test_create_recommendation(self):
        """Test de création d'une recommandation"""
        recommendation = Recommendation.objects.create(
            ai_analysis=self.ai_analysis,
            entrepreneur=self.entrepreneur,
            activity=self.activity,
            recommendation_type="action",
            title="Augmenter les prix",
            description="Les données montrent que vous pouvez augmenter vos prix de 10% sans perdre de clients",
            priority="high",
            confidence_score=0.88,
            expected_impact="positive",
            implementation_difficulty="medium",
            estimated_cost=Decimal("50000.00"),
            estimated_benefit=Decimal("200000.00"),
            is_implemented=False,
            user_rating=None
        )
        
        self.assertEqual(recommendation.ai_analysis, self.ai_analysis)
        self.assertEqual(recommendation.entrepreneur, self.entrepreneur)
        self.assertEqual(recommendation.activity, self.activity)
        self.assertEqual(recommendation.recommendation_type, "action")
        self.assertEqual(recommendation.title, "Augmenter les prix")
        self.assertEqual(recommendation.priority, "high")
        self.assertEqual(recommendation.confidence_score, 0.88)
        self.assertEqual(recommendation.expected_impact, "positive")
        self.assertEqual(recommendation.implementation_difficulty, "medium")
        self.assertEqual(recommendation.estimated_cost, Decimal("50000.00"))
        self.assertEqual(recommendation.estimated_benefit, Decimal("200000.00"))
        self.assertFalse(recommendation.is_implemented)
        self.assertIsNone(recommendation.user_rating)
    
    def test_recommendation_str_representation(self):
        """Test de la représentation string de la recommandation"""
        recommendation = Recommendation.objects.create(
            ai_analysis=self.ai_analysis,
            entrepreneur=self.entrepreneur,
            activity=self.activity,
            title="Recommandation Test",
            recommendation_type="strategy"
        )
        
        expected_str = "Recommandation Test - Stratégie"
        self.assertEqual(str(recommendation), expected_str)
    
    def test_recommendation_confidence_display(self):
        """Test de l'affichage de la confiance"""
        recommendation = Recommendation.objects.create(
            ai_analysis=self.ai_analysis,
            entrepreneur=self.entrepreneur,
            activity=self.activity,
            title="Confiance Test",
            confidence_score=0.925
        )
        
        self.assertEqual(recommendation.confidence_score_display(), "92.5%")
    
    def test_recommendation_user_rating_display(self):
        """Test de l'affichage de la note utilisateur"""
        # Recommandation sans note
        recommendation_no_rating = Recommendation.objects.create(
            ai_analysis=self.ai_analysis,
            entrepreneur=self.entrepreneur,
            activity=self.activity,
            title="Sans Note",
            user_rating=None
        )
        
        self.assertEqual(recommendation_no_rating.user_rating_display(), "Non noté")
        
        # Recommandation avec note
        recommendation_with_rating = Recommendation.objects.create(
            ai_analysis=self.ai_analysis,
            entrepreneur=self.entrepreneur,
            activity=self.activity,
            title="Avec Note",
            user_rating=4
        )
        
        self.assertEqual(recommendation_with_rating.user_rating_display(), "4/5")
    
    def test_recommendation_implementation(self):
        """Test d'implémentation d'une recommandation"""
        recommendation = Recommendation.objects.create(
            ai_analysis=self.ai_analysis,
            entrepreneur=self.entrepreneur,
            activity=self.activity,
            title="Implémentation Test",
            is_implemented=False
        )
        
        result = recommendation.implement("Recommandation mise en œuvre")
        self.assertTrue(result)
        self.assertTrue(recommendation.is_implemented)
        self.assertEqual(recommendation.implementation_notes, "Recommandation mise en œuvre")
        self.assertIsNotNone(recommendation.implemented_at)
    
    def test_recommendation_rating(self):
        """Test de notation d'une recommandation"""
        recommendation = Recommendation.objects.create(
            ai_analysis=self.ai_analysis,
            entrepreneur=self.entrepreneur,
            activity=self.activity,
            title="Notation Test",
            user_rating=None
        )
        
        result = recommendation.rate(5, "Excellente recommandation")
        self.assertTrue(result)
        self.assertEqual(recommendation.user_rating, 5)
        self.assertEqual(recommendation.user_feedback, "Excellente recommandation")
        self.assertIsNotNone(recommendation.rated_at)
    
    def test_recommendation_roi_calculation(self):
        """Test de calcul du ROI"""
        recommendation = Recommendation.objects.create(
            ai_analysis=self.ai_analysis,
            entrepreneur=self.entrepreneur,
            activity=self.activity,
            title="ROI Test",
            estimated_cost=Decimal("100000.00"),
            estimated_benefit=Decimal("300000.00")
        )
        
        roi = recommendation.calculate_roi()
        self.assertEqual(roi, 200.0)  # (300000 - 100000) / 100000 * 100




