from django.shortcuts import render

# Create your views here.
from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import login, logout
from django.utils import timezone
from datetime import timedelta
import random
import string
import logging

from .models import User, PhoneVerification

logger = logging.getLogger(__name__)
from .serializers import (
    UserSerializer, UserCreateSerializer, PhoneVerificationSerializer,
    PhoneVerificationCreateSerializer, LoginSerializer, PasswordChangeSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer,
    ProfileUpdateSerializer
)
from drf_spectacular.utils import extend_schema
from rest_framework_simplejwt.tokens import RefreshToken



class UserRegistrationView(generics.CreateAPIView):
    """Vue pour l'inscription d'un nouvel utilisateur"""
    
    queryset = User.objects.all()
    serializer_class = UserCreateSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        """Créer un nouvel utilisateur"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Générer et envoyer un code OTP (simulation)
        otp_code = ''.join(random.choices(string.digits, k=6))
        expires_at = timezone.now() + timedelta(minutes=10)
        
        PhoneVerification.objects.create(
            phone=user.phone,
            otp_code=otp_code,
            expires_at=expires_at
        )
        
        # En production, envoyer le SMS ici
        print(f"Code OTP pour {user.phone}: {otp_code}")
        
        return Response({
            'message': 'Utilisateur créé avec succès. Vérifiez votre téléphone pour le code OTP.',
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)


class PhoneVerificationView(APIView):
    """Vue pour la vérification du numéro de téléphone"""
    
    permission_classes = [permissions.AllowAny]
    serializer_class = PhoneVerificationSerializer  # ✅ ajouté


    @extend_schema(
        request=PhoneVerificationSerializer,   # ✅ ce que la vue attend
        responses={200: UserSerializer}        # ✅ ce qu’elle renvoie
    )
    @api_view(['GET'])
    def user_info(request):
        """Vue pour obtenir les infos de l'utilisateur connecté"""
        return Response({
            'user': UserSerializer(request.user).data
        })
    def post(self, request):
        """Demander un code OTP"""
        serializer = PhoneVerificationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        phone = serializer.validated_data['phone']
        
        # Supprimer les anciens codes OTP
        PhoneVerification.objects.filter(phone=phone).delete()
        
        # Générer un nouveau code OTP
        otp_code = ''.join(random.choices(string.digits, k=6))
        expires_at = timezone.now() + timedelta(minutes=10)
        
        PhoneVerification.objects.create(
            phone=phone,
            otp_code=otp_code,
            expires_at=expires_at
        )
        
        # En production, envoyer le SMS ici
        print(f"Code OTP pour {phone}: {otp_code}")
        
        return Response({
            'message': f'Code OTP envoyé au {phone}',
            'expires_in': '10 minutes'
        }, status=status.HTTP_200_OK)
    
    def put(self, request):
        """Vérifier le code OTP"""
        serializer = PhoneVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        phone = serializer.validated_data['phone']
        otp_code = serializer.validated_data['otp_code']
        
        try:
            verification = PhoneVerification.objects.get(
                phone=phone,
                otp_code=otp_code
            )
            
            if verification.is_expired():
                return Response({
                    'error': 'Le code OTP a expiré'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Marquer comme vérifié
            verification.is_verified = True
            verification.save()
            
            return Response({
                'message': 'Numéro de téléphone vérifié avec succès'
            }, status=status.HTTP_200_OK)
            
        except PhoneVerification.DoesNotExist:
            return Response({
                'error': 'Code OTP invalide'
            }, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    """Vue pour la connexion utilisateur"""
    
    permission_classes = [permissions.AllowAny]
    serializer_class = LoginSerializer  # ✅ ajouté

    @extend_schema(
        request=LoginSerializer,
        responses={200: UserSerializer}
    )
    def post(self, request):
        """Authentifier un utilisateur"""
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        # Créer des tokens JWT
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        # Mettre à jour la dernière connexion
        user.update_last_login()

        return Response({
            'message': 'Connexion réussie',
            'access': access_token,
            'refresh': refresh_token,
            'user': UserSerializer(user).data
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """Vue pour la déconnexion utilisateur"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Déconnecter l'utilisateur (invalide optionnellement le refresh token)"""
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()  # nécessite d'activer la liste noire si souhaité
        except Exception:
            pass
        logout(request)
        return Response({'message': 'Déconnexion réussie'}, status=status.HTTP_200_OK)


class UserProfileView(generics.RetrieveUpdateAPIView):
    """Vue pour la gestion du profil utilisateur"""
    
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        """Retourner l'utilisateur connecté"""
        return self.request.user


class ProfileUpdateView(generics.UpdateAPIView):
    """Vue pour la mise à jour du profil"""
    
    serializer_class = ProfileUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        """Retourner l'utilisateur connecté"""
        return self.request.user


class PasswordChangeView(APIView):
    """Vue pour le changement de mot de passe"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Changer le mot de passe"""
        serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        
        return Response({
            'message': 'Mot de passe modifié avec succès'
        }, status=status.HTTP_200_OK)


class PasswordResetRequestView(APIView):
    """Vue pour la demande de réinitialisation de mot de passe"""
    
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        """Demander une réinitialisation de mot de passe"""
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        phone = serializer.validated_data['phone']
        
        try:
            user = User.objects.get(phone=phone, is_active=True)
            
            # Supprimer les anciens codes OTP
            PhoneVerification.objects.filter(phone=phone).delete()
            
            # Générer un nouveau code OTP
            otp_code = ''.join(random.choices(string.digits, k=6))
            expires_at = timezone.now() + timedelta(minutes=10)
            
            PhoneVerification.objects.create(
                phone=phone,
                otp_code=otp_code,
                expires_at=expires_at
            )
            
            # En production, envoyer le SMS ici
            print(f"Code OTP de réinitialisation pour {phone}: {otp_code}")
            
            return Response({
                'message': f'Code OTP de réinitialisation envoyé au {phone}',
                'expires_in': '10 minutes',
                'otp_code': otp_code
            }, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            return Response({
                'error': 'Aucun utilisateur trouvé avec ce numéro de téléphone'
            }, status=status.HTTP_404_NOT_FOUND)


class PasswordResetConfirmView(APIView):
    """Vue pour la confirmation de réinitialisation de mot de passe"""
    
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        """Confirmer la réinitialisation de mot de passe"""
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        phone = serializer.validated_data['phone']
        new_password = serializer.validated_data['new_password']
        
        try:
            user = User.objects.get(phone=phone, is_active=True)
            
            # Vérifier le code OTP avant de changer le mot de passe
            try:
                verification = PhoneVerification.objects.get(
                    phone=phone,
                    otp_code=serializer.validated_data['otp_code']
                )
                
                # Vérifier si le code a expiré
                if verification.is_expired():
                    verification.delete()
                    return Response({
                        'error': 'Code OTP expiré. Veuillez demander un nouveau code.'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
            except PhoneVerification.DoesNotExist:
                return Response({
                    'error': 'Code OTP invalide. Veuillez vérifier le code reçu par SMS.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Changer le mot de passe
            user.set_password(new_password)
            user.save()
            
            # Marquer le code OTP comme utilisé (le supprimer)
            verification.delete()
            
            logger.info(f"✅ Mot de passe réinitialisé pour {phone}")
            
            return Response({
                'message': 'Mot de passe réinitialisé avec succès'
            }, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            logger.warning(f"⚠️ Tentative de réinitialisation pour numéro inexistant: {phone}")
            return Response({
                'error': 'Aucun utilisateur trouvé avec ce numéro de téléphone'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"❌ Erreur lors de la réinitialisation: {e}", exc_info=True)
            return Response({
                'error': 'Erreur lors de la réinitialisation du mot de passe'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_info(request):
    """Vue pour obtenir les informations de l'utilisateur connecté"""
    return Response({
        'user': UserSerializer(request.user).data
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def resend_otp(request):
    """Vue pour renvoyer un code OTP"""
    phone = request.data.get('phone')
    
    if not phone:
        return Response({
            'error': 'Numéro de téléphone requis'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Supprimer les anciens codes OTP
    PhoneVerification.objects.filter(phone=phone).delete()
    
    # Générer un nouveau code OTP
    otp_code = ''.join(random.choices(string.digits, k=6))
    expires_at = timezone.now() + timedelta(minutes=10)
    
    PhoneVerification.objects.create(
        phone=phone,
        otp_code=otp_code,
        expires_at=expires_at
    )
    
    # En production, envoyer le SMS ici
    print(f"Code OTP renvoyé pour {phone}: {otp_code}")
    
    return Response({
        'message': f'Code OTP renvoyé au {phone}',
        'expires_in': '10 minutes'
    }, status=status.HTTP_200_OK)