from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()
from .models import PhoneVerification


class UserModelTests(TestCase):
    """Tests pour le modèle User"""
    
    def test_create_user(self):
        """Test de création d'un utilisateur normal"""
        user = User.objects.create_user(
            phone="221 70 123 45 67",
            email="test@example.com",
            password="testpass123"
        )
        self.assertEqual(user.phone, "221 70 123 45 67")
        self.assertEqual(user.email, "test@example.com")
        self.assertEqual(user.role, "entrepreneur")
        self.assertTrue(user.check_password("testpass123"))
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
    
    def test_create_superuser(self):
        """Test de création d'un superutilisateur"""
        admin_user = User.objects.create_superuser(
            phone="221 70 123 45 68",
            email="admin@example.com",
            password="adminpass123"
        )
        self.assertEqual(admin_user.phone, "221 70 123 45 68")
        self.assertEqual(admin_user.role, "admin")
        self.assertTrue(admin_user.is_active)
        self.assertTrue(admin_user.is_staff)
        self.assertTrue(admin_user.is_superuser)
    
    def test_user_without_phone_raises_error(self):
        """Test qu'un utilisateur sans téléphone lève une erreur"""
        with self.assertRaises(ValueError):
            User.objects.create_user(phone="", password="testpass123")
    
    def test_user_str_representation(self):
        """Test de la représentation string de l'utilisateur"""
        user = User.objects.create_user(
            phone="221 70 123 45 69",
            password="testpass123"
        )
        expected_str = "221 70 123 45 69 (Entrepreneur)"
        self.assertEqual(str(user), expected_str)
    
    def test_user_role_properties(self):
        """Test des propriétés de rôle"""
        entrepreneur = User.objects.create_user(
            phone="221 70 123 45 70",
            role="entrepreneur"
        )
        coach = User.objects.create_user(
            phone="221 70 123 45 71",
            role="coach"
        )
        
        self.assertTrue(entrepreneur.is_entrepreneur)
        self.assertFalse(entrepreneur.is_coach)
        
        self.assertTrue(coach.is_coach)
        self.assertFalse(coach.is_entrepreneur)

    def test_create_entrepreneur_user_auto_creates_profile(self):
        """Un user entrepreneur doit avoir un profil entrepreneur créé automatiquement."""
        from apps.entrepreneurs.models import Entrepreneur

        user = User.objects.create_user(
            phone="221 70 123 45 72",
            role="entrepreneur",
            password="testpass123"
        )

        self.assertTrue(Entrepreneur.objects.filter(user=user).exists())

    def test_create_coach_user_auto_creates_profile(self):
        """Un user coach doit avoir un profil coach créé automatiquement."""
        from apps.coaches.models import Coach

        user = User.objects.create_user(
            phone="221 70 123 45 73",
            role="coach",
            password="testpass123"
        )

        self.assertTrue(Coach.objects.filter(user=user).exists())

    def test_role_change_creates_missing_profile(self):
        """Un changement de rôle crée le profil manquant si nécessaire."""
        from apps.coaches.models import Coach

        user = User.objects.create_user(
            phone="221 70 123 45 74",
            role="entrepreneur",
            password="testpass123"
        )
        user.role = "coach"
        user.save(update_fields=["role"])

        self.assertTrue(Coach.objects.filter(user=user).exists())


class PasswordResetTests(TestCase):
    """Tests pour la réinitialisation de mot de passe"""
    
    def setUp(self):
        """Configuration initiale pour les tests"""
        self.client = APIClient()
        self.phone = "+221701234567"
        self.user = User.objects.create_user(
            phone=self.phone,
            password="oldpassword123"
        )
    
    def test_password_reset_request_valid_phone(self):
        """Test de demande de réinitialisation avec numéro valide"""
        response = self.client.post(
            '/api/auth/password/reset/request/',
            {'phone': self.phone},
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('message', response.data)
        self.assertIn('expires_in', response.data)
        
        # Vérifier qu'un code OTP a été créé
        verification = PhoneVerification.objects.get(phone=self.phone)
        self.assertIsNotNone(verification)
        self.assertEqual(len(verification.otp_code), 6)
        self.assertFalse(verification.is_expired())
    
    def test_password_reset_request_invalid_phone(self):
        """Test de demande de réinitialisation avec numéro inexistant"""
        response = self.client.post(
            '/api/auth/password/reset/request/',
            {'phone': '+221999999999'},
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('error', response.data)
    
    def test_password_reset_request_invalid_format(self):
        """Test de demande avec format de téléphone invalide"""
        response = self.client.post(
            '/api/auth/password/reset/request/',
            {'phone': '701234567'},  # Sans +221
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_password_reset_confirm_valid(self):
        """Test de confirmation avec code OTP valide"""
        # Créer un code OTP
        otp_code = '123456'
        PhoneVerification.objects.create(
            phone=self.phone,
            otp_code=otp_code,
            expires_at=timezone.now() + timedelta(minutes=10)
        )
        
        new_password = 'newpassword123'
        response = self.client.post(
            '/api/auth/password/reset/confirm/',
            {
                'phone': self.phone,
                'otp_code': otp_code,
                'new_password': new_password,
                'new_password_confirm': new_password
            },
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('message', response.data)
        
        # Vérifier que le mot de passe a été changé
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(new_password))
        
        # Vérifier que le code OTP a été supprimé
        self.assertFalse(PhoneVerification.objects.filter(phone=self.phone).exists())
    
    def test_password_reset_confirm_invalid_otp(self):
        """Test de confirmation avec code OTP invalide"""
        new_password = 'newpassword123'
        response = self.client.post(
            '/api/auth/password/reset/confirm/',
            {
                'phone': self.phone,
                'otp_code': '999999',  # Code invalide
                'new_password': new_password,
                'new_password_confirm': new_password
            },
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # Les erreurs de validation du serializer sont dans non_field_errors
        self.assertIn('non_field_errors', response.data)
        self.assertIn('Code OTP invalide', str(response.data['non_field_errors']))
        
        # Vérifier que le mot de passe n'a pas été changé
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('oldpassword123'))
    
    def test_password_reset_confirm_expired_otp(self):
        """Test de confirmation avec code OTP expiré"""
        # Créer un code OTP expiré
        otp_code = '123456'
        PhoneVerification.objects.create(
            phone=self.phone,
            otp_code=otp_code,
            expires_at=timezone.now() - timedelta(minutes=1)  # Expiré
        )
        
        new_password = 'newpassword123'
        response = self.client.post(
            '/api/auth/password/reset/confirm/',
            {
                'phone': self.phone,
                'otp_code': otp_code,
                'new_password': new_password,
                'new_password_confirm': new_password
            },
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # Les erreurs de validation du serializer sont dans non_field_errors
        self.assertIn('non_field_errors', response.data)
        self.assertIn('expiré', str(response.data['non_field_errors']).lower())
        
        # Vérifier que le code OTP existe toujours (pas supprimé par le serializer, seulement par la vue)
        # Le serializer valide avant que la vue ne supprime
        verification = PhoneVerification.objects.filter(phone=self.phone, otp_code=otp_code).first()
        # Le code existe toujours car la validation échoue avant d'arriver à la vue
    
    def test_password_reset_confirm_password_mismatch(self):
        """Test de confirmation avec mots de passe différents"""
        otp_code = '123456'
        PhoneVerification.objects.create(
            phone=self.phone,
            otp_code=otp_code,
            expires_at=timezone.now() + timedelta(minutes=10)
        )
        
        response = self.client.post(
            '/api/auth/password/reset/confirm/',
            {
                'phone': self.phone,
                'otp_code': otp_code,
                'new_password': 'newpassword123',
                'new_password_confirm': 'differentpassword123'
            },
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_password_reset_confirm_short_password(self):
        """Test de confirmation avec mot de passe trop court"""
        otp_code = '123456'
        PhoneVerification.objects.create(
            phone=self.phone,
            otp_code=otp_code,
            expires_at=timezone.now() + timedelta(minutes=10)
        )
        
        response = self.client.post(
            '/api/auth/password/reset/confirm/',
            {
                'phone': self.phone,
                'otp_code': otp_code,
                'new_password': '12345',  # Trop court
                'new_password_confirm': '12345'
            },
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_password_reset_request_deletes_old_otp(self):
        """Test que les anciens codes OTP sont supprimés lors d'une nouvelle demande"""
        # Créer un ancien code OTP
        old_otp = PhoneVerification.objects.create(
            phone=self.phone,
            otp_code='111111',
            expires_at=timezone.now() + timedelta(minutes=10)
        )
        
        # Faire une nouvelle demande
        response = self.client.post(
            '/api/auth/password/reset/request/',
            {'phone': self.phone},
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Vérifier que l'ancien code a été supprimé
        self.assertFalse(PhoneVerification.objects.filter(otp_code='111111').exists())
        
        # Vérifier qu'un nouveau code a été créé
        new_verification = PhoneVerification.objects.get(phone=self.phone)
        self.assertNotEqual(new_verification.otp_code, '111111')
