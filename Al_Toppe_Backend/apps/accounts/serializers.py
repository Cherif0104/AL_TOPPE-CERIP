from rest_framework import serializers
from django.contrib.auth import authenticate
from django.utils import timezone
from datetime import timedelta
from .models import User, PhoneVerification
# from .validator import package/module
import re
from django.core.exceptions import ValidationError
from apps.entrepreneurs.serializers import EntrepreneurSerializer
from apps.coaches.serializers import CoachSerializer
from apps.bailleurs.serializers import BailleurSerializer
from .utils import normalize_senegal_phone

class UserSerializer(serializers.ModelSerializer):
    """Sérialiseur pour le modèle User"""
    
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    
    # si  role est entrepreneur, on affiche le serializer de Entrepreneur
    entrepreneur = EntrepreneurSerializer(many=False, read_only=True)
    coach = CoachSerializer(many=False, read_only=True)
    bailleur = BailleurSerializer(many=False, read_only=True)

    class Meta:
        model = User
        fields = ['id', 'phone', 'email', 'role', 'role_display', 'language', 'is_active', 'created_at', 'last_login', 'full_name', 'entrepreneur', 'coach', 'bailleur']
        read_only_fields = ['id', 'created_at', 'last_login', 'role']

class UserCreateSerializer(serializers.ModelSerializer):
    """Sérialiseur pour la création d'utilisateur"""
    
    password = serializers.CharField(write_only=True, min_length=6)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['phone', 'email', 'role', 'password', 'password_confirm', 'language']


    

   

    def validate_phone_number(value):
        """Valider le format des numéros sénégalais"""
        pattern = r'^221\s(77|76|71|70|75|78)\s\d{3}\s\d{2}\s\d{2}$'
        if not re.match(pattern, value):
            raise ValidationError(
                'Le numéro doit être au format "221 XX XXX XX XX" et commencer par 77, 76, 70, 71, 75 ou 78'
            )

    def validate(self, attrs):
        """Validation des données"""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError(
                {"password_confirm": "Les mots de passe ne correspondent pas."}
            )
        phone = attrs.get('phone', '')
        normalized = normalize_senegal_phone(phone)
        if not normalized or not re.match(
            r"^221 (77|76|71|70|75|78) \d{3} \d{2} \d{2}$",
            normalized,
        ):
            raise serializers.ValidationError(
                {
                    "phone": 'Numéro invalide. Ex. 221701234567 ou « 221 70 123 45 67 ».',
                }
            )
        attrs['phone'] = normalized
        return attrs
    
    def create(self, validated_data):
        """Créer un nouvel utilisateur"""
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user


class PhoneVerificationSerializer(serializers.ModelSerializer):
    """Sérialiseur pour la vérification téléphonique"""
    
    class Meta:
        model = PhoneVerification
        fields = ['phone', 'otp_code']

    def validate_phone(self, value):
        return normalize_senegal_phone(value) or value


class PhoneVerificationCreateSerializer(serializers.Serializer):
    """Sérialiseur pour la demande de vérification téléphonique"""
    
    phone = serializers.CharField(max_length=22)
    
    def validate_phone(self, value):
        normalized = normalize_senegal_phone(value)
        if not re.match(r"^221 (77|76|71|70|75|78) \d{3} \d{2} \d{2}$", normalized):
            raise serializers.ValidationError(
                "Numéro sénégalais invalide. Ex. 221701234567 ou « 221 70 123 45 67 »."
            )
        return normalized


class LoginSerializer(serializers.Serializer):
    """Sérialiseur pour la connexion"""
    
    phone = serializers.CharField(max_length=20)
    password = serializers.CharField(max_length=128, write_only=True)
    
    def validate(self, attrs):
        """Validation des identifiants de connexion"""
        phone = attrs.get('phone')
        password = attrs.get('password')
        
        if phone and password:
            phone = normalize_senegal_phone(phone)
            attrs['phone'] = phone
            user = authenticate(request=self.context.get('request'), phone=phone, password=password)
            if not user:
                raise serializers.ValidationError('Numéro de téléphone ou mot de passe incorrect.')
            if not user.is_active:
                raise serializers.ValidationError('Ce compte a été désactivé.')
            
            attrs['user'] = user
        else:
            raise serializers.ValidationError('Le numéro de téléphone et le mot de passe sont requis.')
        
        return attrs


class PasswordChangeSerializer(serializers.Serializer):
    """Sérialiseur pour le changement de mot de passe"""
    
    old_password = serializers.CharField(max_length=128, write_only=True)
    new_password = serializers.CharField(max_length=128, write_only=True, min_length=6)
    new_password_confirm = serializers.CharField(max_length=128, write_only=True)
    
    def validate(self, attrs):
        """Validation du changement de mot de passe"""
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError("Les nouveaux mots de passe ne correspondent pas.")
        return attrs
    
    def validate_old_password(self, value):
        """Validation de l'ancien mot de passe"""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("L'ancien mot de passe est incorrect.")
        return value


class PasswordResetRequestSerializer(serializers.Serializer):
    """Sérialiseur pour la demande de réinitialisation de mot de passe"""
    
    phone = serializers.CharField(max_length=22)

    def validate_phone(self, value):
        normalized = normalize_senegal_phone(value)
        if not re.match(r"^221 (77|76|71|70|75|78) \d{3} \d{2} \d{2}$", normalized):
            raise serializers.ValidationError("Numéro sénégalais invalide.")
        return normalized


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Sérialiseur pour la confirmation de réinitialisation de mot de passe"""
    
    phone = serializers.CharField(max_length=20)
    otp_code = serializers.CharField(max_length=6)
    new_password = serializers.CharField(max_length=128, write_only=True, min_length=6)
    new_password_confirm = serializers.CharField(max_length=128, write_only=True)
    
    def validate(self, attrs):
        """Validation de la réinitialisation"""
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError("Les nouveaux mots de passe ne correspondent pas.")
        
        attrs['phone'] = normalize_senegal_phone(attrs['phone'])
        # Vérifier que le code OTP est valide
        try:
            verification = PhoneVerification.objects.get(
                phone=attrs['phone'],
                otp_code=attrs['otp_code'],
                # is_verified=True
            )
            if verification.is_expired():
                raise serializers.ValidationError("Le code OTP a expiré.")
        except PhoneVerification.DoesNotExist:
            raise serializers.ValidationError("Code OTP invalide.")
        
        return attrs


class UserAdminUpdateSerializer(serializers.ModelSerializer):
    """Mise à jour utilisateur par l'admin (rôle, statut, email)."""

    class Meta:
        model = User
        fields = ['email', 'language', 'role', 'is_active']


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """Sérialiseur pour la mise à jour du profil utilisateur"""

    phone = serializers.CharField(required=False, allow_blank=True, max_length=22)

    class Meta:
        model = User
        fields = ['email', 'language', 'phone']

    def validate_phone(self, value):
        if value is None or (isinstance(value, str) and not value.strip()):
            return value
        normalized = normalize_senegal_phone(value)
        if not normalized or not re.match(
            r"^221 (77|76|71|70|75|78) \d{3} \d{2} \d{2}$",
            normalized,
        ):
            raise serializers.ValidationError(
                'Numéro invalide. Ex. 221701234567 ou « 221 70 123 45 67 ».'
            )
        if (
            User.objects.filter(phone=normalized)
            .exclude(pk=self.instance.pk)
            .exists()
        ):
            raise serializers.ValidationError('Ce numéro est déjà utilisé.')
        return normalized

    def update(self, instance, validated_data):
        """Mettre à jour le profil utilisateur"""
        if 'phone' in validated_data and not (validated_data.get('phone') or '').strip():
            validated_data.pop('phone')
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance