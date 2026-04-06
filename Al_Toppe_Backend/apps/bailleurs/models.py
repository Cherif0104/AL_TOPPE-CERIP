from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator
import uuid


class Bailleur(models.Model):
    """Modèle pour les profils de bailleurs de fonds"""
    
    ORGANIZATION_TYPE_CHOICES = [
        ('ong', 'ONG'),
        ('incubateur', 'Incubateur'),
        ('banque', 'Banque'),
        ('microfinance', 'Institution de microfinance'),
        ('fonds', 'Fonds d\'investissement'),
        ('gouvernement', 'Institution gouvernementale'),
        ('international', 'Organisation internationale'),
        ('prive', 'Secteur privé'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField('accounts.User', on_delete=models.CASCADE, 
                              related_name='bailleur', verbose_name="Utilisateur")
    
    # Informations organisationnelles
    organization_name = models.CharField(max_length=255, verbose_name="Nom de l'organisation")
    organization_type = models.CharField(max_length=50, choices=ORGANIZATION_TYPE_CHOICES, 
                                       verbose_name="Type d'organisation")
    
    # Contact
    contact_person = models.CharField(max_length=255, blank=True, verbose_name="Personne de contact")
    contact_position = models.CharField(max_length=100, blank=True, verbose_name="Poste du contact")
    website = models.URLField(blank=True, verbose_name="Site web")
    
    # Couverture géographique et sectorielle
    sectors_supported = models.JSONField(default=list, verbose_name="Secteurs soutenus")
    regions_covered = models.JSONField(default=list, verbose_name="Régions couvertes")
    
    # Capacité de financement
    funding_capacity = models.DecimalField(
        max_digits=15, decimal_places=2,
        null=True, blank=True, verbose_name="Capacité de financement (FCFA)"
    )
    
    # Statut et métriques
    is_active = models.BooleanField(default=True, verbose_name="Bailleur actif")
    total_funding_provided = models.DecimalField(
        max_digits=15, decimal_places=2,
        default=0, verbose_name="Total financé (FCFA)"
    )
    entrepreneurs_supported = models.PositiveIntegerField(
        default=0, verbose_name="Nombre d'entrepreneurs soutenus"
    )
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière modification")
    
    class Meta:
        verbose_name = "Bailleur"
        verbose_name_plural = "Bailleurs"
        db_table = 'bailleurs'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.organization_name} ({self.get_organization_type_display()})"
    
    @property
    def active_programs_count(self):
        """Retourne le nombre de programmes actifs"""
        return self.funding_programs.filter(status='active').count()
    
    @property
    def success_rate(self):
        """Calcule le taux de réussite des programmes"""
        total_programs = self.funding_programs.count()
        if total_programs == 0:
            return 0
        successful_programs = self.funding_programs.filter(status='completed').count()
        return (successful_programs / total_programs) * 100


class FundingProgram(models.Model):
    """Modèle pour les programmes de financement"""
    
    FUNDING_TYPE_CHOICES = [
        ('grant', 'Subvention'),
        ('loan', 'Prêt'),
        ('equity', 'Prise de participation'),
        ('hybrid', 'Financement hybride'),
        ('technical_assistance', 'Assistance technique'),
    ]
    
    STATUS_CHOICES = [
        ('draft', 'Brouillon'),
        ('active', 'Actif'),
        ('paused', 'En pause'),
        ('completed', 'Terminé'),
        ('cancelled', 'Annulé'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bailleur = models.ForeignKey(Bailleur, on_delete=models.CASCADE, 
                               related_name='funding_programs', verbose_name="Bailleur")
    
    # Informations de base
    program_name = models.CharField(max_length=255, verbose_name="Nom du programme")
    description = models.TextField(verbose_name="Description")
    funding_type = models.CharField(max_length=50, choices=FUNDING_TYPE_CHOICES, verbose_name="Type de financement")
    
    # Montants
    min_amount = models.DecimalField(
        max_digits=12, decimal_places=2,
        null=True, blank=True, verbose_name="Montant minimum (FCFA)"
    )
    max_amount = models.DecimalField(
        max_digits=12, decimal_places=2,
        null=True, blank=True, verbose_name="Montant maximum (FCFA)"
    )
    
    # Période
    start_date = models.DateField(verbose_name="Date de début")
    end_date = models.DateField(verbose_name="Date de fin")
    application_deadline = models.DateField(verbose_name="Date limite de candidature")
    
    # Cibles
    target_sectors = models.JSONField(default=list, verbose_name="Secteurs cibles")
    target_regions = models.JSONField(default=list, verbose_name="Régions cibles")
    
    # Critères et conditions
    eligibility_criteria = models.JSONField(default=list, verbose_name="Critères d'éligibilité")
    required_documents = models.JSONField(default=list, verbose_name="Documents requis")
    
    # Statut et métriques
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', verbose_name="Statut")
    total_applications = models.PositiveIntegerField(default=0, verbose_name="Total candidatures")
    approved_applications = models.PositiveIntegerField(default=0, verbose_name="Candidatures approuvées")
    total_funding_allocated = models.DecimalField(
        max_digits=15, decimal_places=2,
        default=0, verbose_name="Total financé (FCFA)"
    )
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière modification")
    
    class Meta:
        verbose_name = "Programme de financement"
        verbose_name_plural = "Programmes de financement"
        db_table = 'funding_programs'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.program_name} - {self.bailleur.organization_name}"
    
    @property
    def is_active(self):
        """Vérifie si le programme est actif"""
        today = timezone.now().date()
        return (self.status == 'active' and 
                self.start_date <= today <= self.end_date and
                today <= self.application_deadline)
    
    @property
    def is_accepting_applications(self):
        """Vérifie si le programme accepte encore des candidatures"""
        return self.is_active and timezone.now().date() <= self.application_deadline
    
    @property
    def approval_rate(self):
        """Calcule le taux d'approbation"""
        if self.total_applications == 0:
            return 0
        return (self.approved_applications / self.total_applications) * 100
    
    @property
    def remaining_budget(self):
        """Calcule le budget restant"""
        if not self.max_amount:
            return None
        return max(0, self.max_amount - self.total_funding_allocated)


class FundingApplication(models.Model):
    """Modèle pour les candidatures aux programmes de financement"""
    
    STATUS_CHOICES = [
        ('draft', 'Brouillon'),
        ('submitted', 'Soumise'),
        ('under_review', 'En cours d\'examen'),
        ('approved', 'Approuvée'),
        ('rejected', 'Rejetée'),
        ('withdrawn', 'Retirée'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    entrepreneur = models.ForeignKey('entrepreneurs.Entrepreneur', on_delete=models.CASCADE, 
                                   related_name='funding_applications', verbose_name="Entrepreneur")
    activity = models.ForeignKey('entrepreneurs.Activity', on_delete=models.CASCADE, 
                                related_name='funding_applications', verbose_name="Activité")
    program = models.ForeignKey(FundingProgram, on_delete=models.CASCADE, 
                              related_name='applications', verbose_name="Programme")
    
    # Informations de candidature
    requested_amount = models.DecimalField(
        max_digits=12, decimal_places=2,
        validators=[MinValueValidator(0)], verbose_name="Montant demandé (FCFA)"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', verbose_name="Statut")
    
    # Dates
    submitted_at = models.DateTimeField(null=True, blank=True, verbose_name="Date de soumission")
    review_date = models.DateTimeField(null=True, blank=True, verbose_name="Date d'examen")
    
    # Résultat
    approved_amount = models.DecimalField(
        max_digits=12, decimal_places=2,
        null=True, blank=True, verbose_name="Montant approuvé (FCFA)"
    )
    rejection_reason = models.TextField(blank=True, verbose_name="Raison du rejet")
    
    # Contenu de la candidature
    business_plan = models.ForeignKey('business_plans.BusinessPlan', on_delete=models.SET_NULL, 
                                    null=True, blank=True, verbose_name="Plan d'affaires")
    project_description = models.TextField(verbose_name="Description du projet")
    expected_impact = models.TextField(verbose_name="Impact attendu")
    implementation_timeline = models.JSONField(default=dict, verbose_name="Calendrier de mise en œuvre")
    
    # Documents et pièces jointes
    supporting_documents = models.JSONField(default=list, verbose_name="Documents de soutien")
    
    # Évaluation
    evaluation_score = models.DecimalField(
        max_digits=5, decimal_places=2,
        null=True, blank=True, verbose_name="Score d'évaluation"
    )
    evaluation_notes = models.TextField(blank=True, verbose_name="Notes d'évaluation")
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière modification")
    
    class Meta:
        verbose_name = "Candidature au financement"
        verbose_name_plural = "Candidatures au financement"
        db_table = 'funding_applications'
        ordering = ['-created_at']
        unique_together = ['entrepreneur', 'activity', 'program']
    
    def __str__(self):
        return f"{self.entrepreneur.full_name} - {self.program.program_name}"
    
    @property
    def is_approved(self):
        """Vérifie si la candidature est approuvée"""
        return self.status == 'approved'
    
    @property
    def is_rejected(self):
        """Vérifie si la candidature est rejetée"""
        return self.status == 'rejected'
    
    @property
    def approval_rate(self):
        """Calcule le taux d'approbation du montant demandé"""
        if not self.approved_amount or self.requested_amount == 0:
            return 0
        return (self.approved_amount / self.requested_amount) * 100
    
    def submit_application(self):
        """Soumet la candidature"""
        if self.status == 'draft':
            self.status = 'submitted'
            self.submitted_at = timezone.now()
            self.save()
            return True
        return False
    
    def approve_application(self, approved_amount, evaluation_notes=""):
        """Approuve la candidature"""
        if self.status in ['submitted', 'under_review']:
            self.status = 'approved'
            self.approved_amount = approved_amount
            self.evaluation_notes = evaluation_notes
            self.review_date = timezone.now()
            self.save()
            return True
        return False
    
    def reject_application(self, rejection_reason, evaluation_notes=""):
        """Rejette la candidature"""
        if self.status in ['submitted', 'under_review']:
            self.status = 'rejected'
            self.rejection_reason = rejection_reason
            self.evaluation_notes = evaluation_notes
            self.review_date = timezone.now()
            self.save()
            return True
        return False
