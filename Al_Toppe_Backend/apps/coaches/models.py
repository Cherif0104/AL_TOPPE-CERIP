from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


class Coach(models.Model):
    """Modèle pour les profils de coaches"""
    
    SPECIALIZATION_CHOICES = [
        ('business_development', 'Développement d\'entreprise'),
        ('financial_management', 'Gestion financière'),
        ('marketing', 'Marketing et vente'),
        ('operations', 'Opérations et production'),
        ('legal_compliance', 'Conformité légale'),
        ('digital_transformation', 'Transformation numérique'),
        ('sustainability', 'Développement durable'),
        ('general', 'Accompagnement général'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField('accounts.User', on_delete=models.CASCADE, 
                              related_name='coach', verbose_name="Utilisateur")
    
    # Informations professionnelles
    organization = models.CharField(max_length=255, blank=True, verbose_name="Organisation")
    specialization = models.CharField(max_length=50, choices=SPECIALIZATION_CHOICES, 
                                    default='general', verbose_name="Spécialisation")
    years_experience = models.PositiveIntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(50)],
        null=True, blank=True, verbose_name="Années d'expérience"
    )
    
    # Bio et compétences
    bio = models.TextField(blank=True, verbose_name="Biographie")
    skills = models.JSONField(default=list, verbose_name="Compétences")
    certifications = models.JSONField(default=list, verbose_name="Certifications")
    
    # Statut et capacités
    is_certified = models.BooleanField(default=False, verbose_name="Coach certifié")
    is_active = models.BooleanField(default=True, verbose_name="Coach actif")
    max_entrepreneurs = models.PositiveIntegerField(
        default=10, 
        validators=[MinValueValidator(1), MaxValueValidator(50)],
        verbose_name="Nombre max d'entrepreneurs"
    )
    
    # Contact et disponibilité
    availability_schedule = models.JSONField(default=dict, verbose_name="Planning de disponibilité")
    preferred_contact_method = models.CharField(
        max_length=20, 
        choices=[('phone', 'Téléphone'), ('whatsapp', 'WhatsApp'), ('email', 'Email')],
        default='whatsapp', verbose_name="Méthode de contact préférée"
    )
    
    # Métriques de performance
    success_rate = models.DecimalField(
        max_digits=5, decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        null=True, blank=True, verbose_name="Taux de réussite (%)"
    )
    average_rating = models.DecimalField(
        max_digits=3, decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(5)],
        null=True, blank=True, verbose_name="Note moyenne"
    )
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière modification")
    
    class Meta:
        verbose_name = "Coach"
        verbose_name_plural = "Coaches"
        db_table = 'coaches'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Coach {self.user.get_full_name()} - {self.get_specialization_display()}"
    
    @property
    def current_entrepreneurs_count(self):
        """Retourne le nombre d'entrepreneurs actuellement assignés"""
        return self.assignments.filter(status='active').count()
    
    @property
    def available_slots(self):
        """Retourne le nombre de places disponibles"""
        return max(0, self.max_entrepreneurs - self.current_entrepreneurs_count)
    
    @property
    def is_available(self):
        """Vérifie si le coach peut accepter de nouveaux entrepreneurs"""
        return self.is_active and self.available_slots > 0
    
    @property
    def sessions(self):
        return CoachingSession.objects.filter(assignment__coach=self)
    
    @property
    def get_total_sessions(self):
        """Retourne le nombre total de sessions réalisées"""
        return self.sessions.count()
    
    def get_completed_sessions(self):
        """Retourne le nombre de sessions terminées"""
        return self.sessions.filter(status='completed').count()
    
    def get_success_rate(self):
        """Calcule le taux de réussite basé sur les sessions"""
        total_sessions = self.get_total_sessions
        if total_sessions == 0:
            return 0
        completed_sessions = self.get_completed_sessions
        return (completed_sessions / total_sessions) * 100


class CoachAssignment(models.Model):
    """Modèle pour l'assignation d'entrepreneurs aux coaches"""
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Terminée'),
        ('cancelled', 'Annulée'),
        ('paused', 'En pause'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    coach = models.ForeignKey(Coach, on_delete=models.CASCADE, 
                            related_name='assignments', verbose_name="Coach")
    entrepreneur = models.ForeignKey('entrepreneurs.Entrepreneur', on_delete=models.CASCADE, 
                                   related_name='coach_assignments', verbose_name="Entrepreneur")
    
    # Informations d'assignation
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active', verbose_name="Statut")
    start_date = models.DateField(verbose_name="Date de début")
    end_date = models.DateField(null=True, blank=True, verbose_name="Date de fin")
    
    # Objectifs et suivi
    objectives = models.JSONField(default=list, verbose_name="Objectifs")
    progress_notes = models.TextField(blank=True, verbose_name="Notes de progression")
    
    # Évaluation
    initial_assessment = models.JSONField(default=dict, verbose_name="Évaluation initiale")
    final_assessment = models.JSONField(default=dict, verbose_name="Évaluation finale")
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière modification")
    
    class Meta:
        verbose_name = "Assignation coach"
        verbose_name_plural = "Assignations coaches"
        db_table = 'coach_assignments'
        ordering = ['-created_at']
        unique_together = ['coach', 'entrepreneur']
    
    def __str__(self):
        return f"{self.coach} → {self.entrepreneur}"
    
    @property
    def duration_days(self):
        """Calcule la durée de l'assignation en jours"""
        if self.end_date:
            return (self.end_date - self.start_date).days
        return (timezone.now().date() - self.start_date).days
    
    @property
    def is_active(self):
        """Vérifie si l'assignation est active"""
        return self.status == 'active'
    
    def complete_assignment(self):
        """Termine l'assignation"""
        if self.status == 'active':
            self.status = 'completed'
            self.end_date = timezone.now().date()
            self.save()
            return True
        return False


class CoachingSession(models.Model):
    """Modèle pour les sessions de coaching"""
    
    STATUS_CHOICES = [
        ('scheduled', 'Planifiée'),
        ('in_progress', 'En cours'),
        ('completed', 'Terminée'),
        ('cancelled', 'Annulée'),
        ('no_show', 'Absence'),
        ('evaluation_completed', 'Évaluation terminée par l\'entrepreneur'),
    ]
    
    SESSION_TYPES = [
        ('initial', 'Session initiale'),
        ('follow_up', 'Suivi'),
        ('milestone', 'Étape importante'),
        ('final', 'Session finale'),
        ('emergency', 'Urgence'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assignment = models.ForeignKey(CoachAssignment, on_delete=models.CASCADE, 
                                 related_name='sessions', verbose_name="Assignation")
    
    # Informations de session
    session_type = models.CharField(max_length=20, choices=SESSION_TYPES, verbose_name="Type de session")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled', verbose_name="Statut")
    
    # Planification
    scheduled_date = models.DateTimeField(verbose_name="Date planifiée")
    duration_minutes = models.PositiveIntegerField(default=60, verbose_name="Durée (minutes)")
    actual_start_time = models.DateTimeField(null=True, blank=True, verbose_name="Début réel")
    actual_end_time = models.DateTimeField(null=True, blank=True, verbose_name="Fin réelle")
    
    # Contenu et suivi
    agenda = models.TextField(blank=True, verbose_name="Ordre du jour")
    notes = models.TextField(blank=True, verbose_name="Notes de session")
    action_items = models.JSONField(default=list, verbose_name="Actions à suivre")
    
    # Évaluation
    entrepreneur_rating = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True, blank=True, verbose_name="Note entrepreneur (1-5)"
    )
    coach_rating = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True, blank=True, verbose_name="Note coach (1-5)"
    )
    feedback = models.TextField(blank=True, verbose_name="Retour d'expérience")
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière modification")
    
    class Meta:
        verbose_name = "Session de coaching"
        verbose_name_plural = "Sessions de coaching"
        db_table = 'coaching_sessions'
        ordering = ['-scheduled_date']
    
    def __str__(self):
        return f"Session {self.get_session_type_display()} - {self.assignment}"
    
    @property
    def coach(self):
        """Retourne le coach de la session"""
        return self.assignment.coach
    
    @property
    def entrepreneur(self):
        """Retourne l'entrepreneur de la session"""
        return self.assignment.entrepreneur
    
    @property
    def is_overdue(self):
        """Vérifie si la session est en retard"""
        if self.status == 'scheduled' and self.scheduled_date < timezone.now():
            return True
        return False
    
    @property
    def actual_duration_minutes(self):
        """Calcule la durée réelle de la session"""
        if self.actual_start_time and self.actual_end_time:
            duration = self.actual_end_time - self.actual_start_time
            return int(duration.total_seconds() / 60)
        return 0
    
    def start_session(self):
        """Démarre la session"""
        if self.status == 'scheduled':
            self.status = 'in_progress'
            self.actual_start_time = timezone.now()
            self.save()
            return True
        return False
    
    def complete_session(self, notes="", action_items=None, entrepreneur_rating=None):
        """Termine la session"""
        if self.status == 'in_progress':
            self.status = 'completed'
            self.actual_end_time = timezone.now()
            self.notes = notes
            if action_items:
                self.action_items = action_items
            if entrepreneur_rating:
                self.entrepreneur_rating = entrepreneur_rating
            self.save()
            return True
        return False

    def evaluation_completed(self, coach_rating):
        """Termine l'évaluation"""
        if self.status == 'completed':
            self.status = 'evaluation_completed'
            self.coach_rating = coach_rating
            self.evaluation_completed = True
            self.save()
            return True
        return False