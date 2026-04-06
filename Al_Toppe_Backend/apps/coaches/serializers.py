from rest_framework.fields import ReadOnlyField


from rest_framework.serializers import ListSerializer, ModelSerializer
from rest_framework import serializers
import re

from typing import Any


from rest_framework.relations import ManyRelatedField, PrimaryKeyRelatedField


from rest_framework import serializers
from .models import Coach, CoachAssignment, CoachingSession
from django.utils import timezone
from apps.accounts.models import User

from apps.entrepreneurs.serializers import EntrepreneurSerializer

class CoachSerializer(serializers.ModelSerializer):
    """Serializer pour les coaches, inclut les entrepreneurs associés"""
    
    organization = serializers.PrimaryKeyRelatedField(read_only=True)
    current_entrepreneurs_count = serializers.ReadOnlyField()
    available_slots = serializers.ReadOnlyField()
    is_available = serializers.ReadOnlyField()
    total_sessions = serializers.SerializerMethodField()
    completed_sessions = serializers.SerializerMethodField()
    success_rate = serializers.ReadOnlyField()
    coach_name = serializers.ReadOnlyField(source='user.get_full_name', read_only=True)
    phone = serializers.CharField(source='user.phone', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    # Ajout du champ entrepreneurs associés (liste sérialisée)
    entrepreneurs = serializers.SerializerMethodField()

    class Meta:
        model = Coach
        fields = [
            'id', 'phone', 'email', 'user', 'organization', 'coach_name', 'specialization', 'years_experience',
            'bio', 'skills', 'certifications', 'is_certified', 'is_active',
            'max_entrepreneurs', 'availability_schedule', 'preferred_contact_method',
            'success_rate', 'average_rating', 'current_entrepreneurs_count',
            'available_slots', 'is_available', 'total_sessions', 'completed_sessions',
            'created_at', 'updated_at', 'entrepreneurs'  # ← Ajout ici
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_total_sessions(self, obj):
        """Retourne le nombre total de sessions"""
        if callable(getattr(obj, "get_total_sessions", None)):
            return obj.get_total_sessions()
        return getattr(obj, "get_total_sessions", 0)

    def get_completed_sessions(self, obj):
        """Retourne le nombre de sessions terminées"""
        if callable(getattr(obj, "get_completed_sessions", None)):
            return obj.get_completed_sessions()
        return getattr(obj, "get_completed_sessions", 0)

    def get_entrepreneurs(self, obj):
        """Retourne la liste des entrepreneurs associés à ce coach"""
        # Supposons que CoachAssignment a un champ entrepreneur lié au profil Entrepreneur
        from apps.entrepreneurs.models import Entrepreneur
        # Récupérer tous les entrepreneurs assignés à ce coach via la table d'association
        assignments = CoachAssignment.objects.filter(coach=obj).select_related('entrepreneur')
        entrepreneurs = [assignment.entrepreneur for assignment in assignments if assignment.entrepreneur]
        return EntrepreneurSerializer(entrepreneurs, many=True).data

    def validate_max_entrepreneurs(self, value):
        """Valide le nombre maximum d'entrepreneurs"""
        if value < 1:
            raise serializers.ValidationError("Le nombre maximum d'entrepreneurs doit être au moins 1")
        if value > 50:
            raise serializers.ValidationError("Le nombre maximum d'entrepreneurs ne peut pas dépasser 50")
        return value


class CoachCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création de coaches"""
    phone = serializers.CharField(max_length=20, write_only=True)
    email = serializers.EmailField(required=False, allow_blank=True, write_only=True)
    password = serializers.CharField(write_only=True, min_length=6)
    password_confirm = serializers.CharField(write_only=True)
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), write_only=True)
    class Meta:
        model = Coach
        fields = [
            'user', 'organization', 'specialization', 'years_experience',
            'bio', 'skills', 'certifications', 'is_certified', 'is_active',
            'max_entrepreneurs', 'availability_schedule', 'preferred_contact_method'
        ]
    
    def validate_user(self, value):
        """Valide que l'utilisateur a le rôle coach"""
        if value.role != 'coach':
            raise serializers.ValidationError("L'utilisateur doit avoir le rôle coach")
        return value
    
    
    def validate_password(self, value):
        """Valide le mot de passe"""
        if len(value) < 6:
            raise serializers.ValidationError("Le mot de passe doit contenir au moins 6 caractères")
        return value
    def validate_password_confirm(self, value):
        """Valide le mot de passe de confirmation"""
        if value != self.initial_data.get('password'):
            raise serializers.ValidationError("Les mots de passe ne correspondent pas")
        return value
    
    def validate(self, attrs):
        """Valide les données"""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Les mots de passe ne correspondent pas")
        return attrs
    
    def create(self, validated_data):
        """Créer un nouvel utilisateur"""
        phone = validated_data.pop('phone')
        email = validated_data.pop('email', '')
        password = validated_data.pop('password')
        organization = validated_data.pop('organization')
        specialization = validated_data.pop('specialization')
        years_experience = validated_data.pop('years_experience')
        bio = validated_data.pop('bio')
        skills = validated_data.pop('skills')
        certifications = validated_data.pop('certifications')
        is_certified = validated_data.pop('is_certified')
        is_active = validated_data.pop('is_active')
        max_entrepreneurs = validated_data.pop('max_entrepreneurs')
        availability_schedule = validated_data.pop('availability_schedule')
        preferred_contact_method = validated_data.pop('preferred_contact_method')
        validated_data.pop('password_confirm')  # On ne garde pas la confirmation
        user = User.objects.create_user(phone=phone, email=email or None, password=password, role='coach')
        coach = Coach.objects.create(user=user.id, organization=organization, specialization=specialization, years_experience=years_experience, bio=bio, skills=skills, certifications=certifications, is_certified=is_certified, is_active=is_active, max_entrepreneurs=max_entrepreneurs, availability_schedule=availability_schedule, preferred_contact_method=preferred_contact_method)
        print("Coach created successfully", coach)
        return coach

class CoachAssignmentSerializer(serializers.ModelSerializer):
    """Serializer pour les assignations de coaches"""

    # Use PrimaryKeyRelatedField for coach and entrepreneur to avoid serialization issues
    coach = serializers.PrimaryKeyRelatedField(read_only=True)
    entrepreneur = serializers.PrimaryKeyRelatedField(read_only=True)
    entrepreneur_name = serializers.CharField(source='entrepreneur.full_name', read_only=True)
    duration_days = serializers.ReadOnlyField()
    is_active = serializers.ReadOnlyField()

    class Meta:
        model = CoachAssignment
        fields = [
            'id', 'coach', 'entrepreneur', 'status', 'start_date', 'end_date',
            'objectives', 'progress_notes', 'initial_assessment', 'final_assessment',
                'duration_days', 'is_active', 'entrepreneur_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_end_date(self, value):
        """Valide la date de fin"""
        start_date = self.initial_data.get('start_date')
        if start_date and value and value <= start_date:
            raise serializers.ValidationError(
                "La date de fin doit être postérieure à la date de début"
            )
        return value

    def validate_coach(self, value):
        """Valide que le coach peut accepter de nouveaux entrepreneurs"""
        if not value.is_available:
            raise serializers.ValidationError(
                "Ce coach n'a plus de places disponibles"
            )
        return value


class CoachingSessionSerializer(serializers.ModelSerializer):
    """Serializer pour les sessions de coaching"""

    # Use PrimaryKeyRelatedField for assignment, coach, and entrepreneur
    assignment = serializers.PrimaryKeyRelatedField(read_only=True)
    coach = serializers.PrimaryKeyRelatedField(source='assignment.coach', read_only=True)
    entrepreneur = serializers.PrimaryKeyRelatedField(source='assignment.entrepreneur', read_only=True)
    is_overdue = serializers.ReadOnlyField()
    actual_duration_minutes = serializers.ReadOnlyField()
    entrepreneur_name = serializers.CharField(source='entrepreneur.full_name', read_only=True)
    coach_name = serializers.ReadOnlyField(source='coach.name')

    class Meta:
        model = CoachingSession
        fields = [
            'id', 'assignment', 'coach', 'coach_name', 'entrepreneur', 'entrepreneur_name', 'session_type', 'status',
            'scheduled_date', 'duration_minutes', 'actual_start_time', 'actual_end_time',
            'agenda', 'notes', 'action_items', 'entrepreneur_rating', 'coach_rating',
            'feedback', 'is_overdue', 'actual_duration_minutes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'coach_name', 'entrepreneur_name', 'created_at', 'updated_at']

    def validate_scheduled_date(self, value):
        """Valide la date planifiée"""
        if value < timezone.now():
            raise serializers.ValidationError(
                "La date planifiée ne peut pas être dans le passé"
            )
        return value

    def validate_entrepreneur_rating(self, value):
        """Valide la note de l'entrepreneur"""
        if value and (value < 1 or value > 5):
            raise serializers.ValidationError("La note doit être entre 1 et 5")
        return value

    def validate_coach_rating(self, value):
        """Valide la note du coach"""
        if value and (value < 1 or value > 5):
            raise serializers.ValidationError("La note doit être entre 1 et 5")
        return value


class CoachCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création de coaches"""

    class Meta:
        model = Coach
        fields = [
            'user', 'organization', 'specialization', 'years_experience',
            'bio', 'skills', 'certifications', 'is_certified', 'is_active',
            'max_entrepreneurs', 'availability_schedule', 'preferred_contact_method'
        ]

    def validate_user(self, value):
        """Valide que l'utilisateur a le rôle coach"""
        if value.role != 'coach':
            raise serializers.ValidationError("L'utilisateur doit avoir le rôle coach")
        return value


class CoachAssignmentCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création d'assignations"""

    class Meta:
        model = CoachAssignment
        fields = [
            'coach', 'entrepreneur', 'start_date', 'end_date', 'objectives'
        ]

    def validate(self, data):
        """Validation personnalisée"""
        coach = data.get('coach')
        entrepreneur = data.get('entrepreneur')

        # Vérifier que l'entrepreneur n'est pas déjà assigné
        existing_assignment = CoachAssignment.objects.filter(
            entrepreneur=entrepreneur,
            status='active'
        ).first()

        if existing_assignment:
            raise serializers.ValidationError(
                "Cet entrepreneur est déjà assigné à un coach actif"
            )

        # Vérifier que le coach a des places disponibles
        if not coach.is_available:
            raise serializers.ValidationError(
                "Ce coach n'a plus de places disponibles"
            )

        return data


class CoachingSessionCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création de sessions"""

    class Meta:
        model = CoachingSession
        fields = [
            'assignment', 'session_type', 'scheduled_date', 'duration_minutes',
            'agenda'
        ]

    def validate_assignment(self, value):
        """Valide que l'assignation est active"""
        if value.status != 'active':
            raise serializers.ValidationError(
                "L'assignation doit être active pour créer une session"
            )
        return value


class CoachPerformanceSerializer(serializers.Serializer):
    """Serializer pour les données de performance d'un coach"""

    coach_id = serializers.CharField()
    coach_name = serializers.CharField()
    specialization = serializers.CharField()
    total_entrepreneurs = serializers.IntegerField()
    active_assignments = serializers.IntegerField()
    available_slots = serializers.IntegerField()
    total_sessions = serializers.IntegerField()
    completed_sessions = serializers.IntegerField()
    success_rate = serializers.FloatField()
    average_rating = serializers.FloatField()
    satisfaction_score = serializers.FloatField()
    is_certified = serializers.BooleanField()
    is_active = serializers.BooleanField()


class SessionActionSerializer(serializers.Serializer):
    """Serializer pour les actions sur les sessions"""

    action = serializers.ChoiceField(choices=['start', 'complete', 'cancel'])
    notes = serializers.CharField(required=False, allow_blank=True)
    entrepreneur_rating = serializers.IntegerField(required=False, min_value=1, max_value=5)
    feedback = serializers.CharField(required=False, allow_blank=True)

    def validate_action(self, value):
        """Valide l'action selon le statut actuel de la session"""
        session = self.context.get('session')
        if not session:
            return value

        if value == 'start' and session.status != 'scheduled':
            raise serializers.ValidationError("Seules les sessions planifiées peuvent être démarrées")
        elif value == 'complete' and session.status != 'in_progress':
            raise serializers.ValidationError("Seules les sessions en cours peuvent être terminées")

        return value

# Entrepreneurs d'un coach 

class EntrepreneursCoachSerializer(serializers.ModelSerializer):
    """Serializer pour les coaches, inclut les entrepreneurs associés"""
    
    # Ajout du champ entrepreneurs associés (liste sérialisée)
    entrepreneurs = serializers.SerializerMethodField()

    class Meta:
        model = Coach
        fields = [
            'entrepreneurs'  # ← Ajout ici
        ]
        read_only_fields = [ 'entrepreneurs']

    
    def get_entrepreneurs(self, obj):
        """Retourne la liste des entrepreneurs associés à ce coach"""
        # Supposons que CoachAssignment a un champ entrepreneur lié au profil Entrepreneur
        from apps.entrepreneurs.models import Entrepreneur
        # Récupérer tous les entrepreneurs assignés à ce coach via la table d'association
        assignments = CoachAssignment.objects.filter(coach=obj).select_related('entrepreneur')
        entrepreneurs = [assignment.entrepreneur for assignment in assignments if assignment.entrepreneur]
        return EntrepreneurSerializer(entrepreneurs, many=True).data

    def validate_max_entrepreneurs(self, value):
        """Valide le nombre maximum d'entrepreneurs"""
        if value < 1:
            raise serializers.ValidationError("Le nombre maximum d'entrepreneurs doit être au moins 1")
        if value > 50:
            raise serializers.ValidationError("Le nombre maximum d'entrepreneurs ne peut pas dépasser 50")
        return value

