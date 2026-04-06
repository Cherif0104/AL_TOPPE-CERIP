from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


class BusinessPlanTemplate(models.Model):
    """Template de plan d'affaires par secteur d'activité"""
    
    SECTOR_CHOICES = [
        ('commerce', 'Commerce'),
        ('service', 'Service'),
        ('artisanat', 'Artisanat'),
        ('agriculture', 'Agriculture'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(_('Nom du template'), max_length=255)
    sector = models.CharField(_('Secteur'), max_length=50, choices=SECTOR_CHOICES)
    description = models.TextField(_('Description'), blank=True)
    
    # Structure du plan en JSON
    structure = models.JSONField(_('Structure du plan'), default=dict)
    
    # Métadonnées
    is_active = models.BooleanField(_('Actif'), default=True)
    version = models.PositiveIntegerField(_('Version'), default=1)
    created_at = models.DateTimeField(_('Créé le'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Modifié le'), auto_now=True)
    
    class Meta:
        verbose_name = _('Template de plan d\'affaires')
        verbose_name_plural = _('Templates de plans d\'affaires')
        ordering = ['sector', 'name']
        unique_together = ['sector', 'version']
    
    def __str__(self):
        return f"{self.name} - {self.get_sector_display()} v{self.version}"


class BusinessPlan(models.Model):
    """Plan d'affaires d'un entrepreneur"""
    
    STATUS_CHOICES = [
        ('draft', 'Brouillon'),
        ('submitted', 'Soumis'),
        ('under_review', 'En cours de révision'),
        ('approved', 'Approuvé'),
        ('rejected', 'Rejeté'),
        ('archived', 'Archivé'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Relations
    entrepreneur = models.ForeignKey(
        'entrepreneurs.Entrepreneur',
        on_delete=models.CASCADE,
        verbose_name=_('Entrepreneur'),
        related_name='business_plans'
    )
    activity = models.ForeignKey(
        'entrepreneurs.Activity',
        on_delete=models.CASCADE,
        verbose_name=_('Activité'),
        related_name='business_plans'
    )
    template = models.ForeignKey(
        BusinessPlanTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name=_('Template utilisé')
    )
    
    # Informations de base
    title = models.CharField(_('Titre'), max_length=255)
    summary = models.TextField(_('Résumé exécutif'), blank=True)
    
    # Contenu structuré du plan
    market_analysis = models.JSONField(_('Analyse de marché'), default=dict)
    offer = models.JSONField(_('Offre et services'), default=dict)
    business_model = models.JSONField(_('Modèle économique'), default=dict)
    financial_projections = models.JSONField(_('Projections financières'), default=dict)
    implementation_plan = models.JSONField(_('Plan de mise en œuvre'), default=dict)
    
    # Métadonnées
    status = models.CharField(_('Statut'), max_length=20, choices=STATUS_CHOICES, default='draft')
    version = models.PositiveIntegerField(_('Version'), default=1)
    
    # Fichier PDF généré
    pdf_file = models.FileField(
        _('Fichier PDF'),
        upload_to='business_plans/pdfs/',
        null=True,
        blank=True,
        help_text=_('PDF généré du plan d\'affaires')
    )
    pdf_generated_at = models.DateTimeField(_('PDF généré le'), null=True, blank=True)
    
    # Validation
    is_validated = models.BooleanField(_('Validé'), default=False)
    validation_date = models.DateTimeField(_('Date de validation'), null=True, blank=True)
    validated_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name=_('Validé par'),
        related_name='validated_business_plans'
    )
    
    # Timestamps
    created_at = models.DateTimeField(_('Créé le'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Modifié le'), auto_now=True)
    
    class Meta:
        verbose_name = _('Plan d\'affaires')
        verbose_name_plural = _('Plans d\'affaires')
        ordering = ['-created_at']
        unique_together = ['entrepreneur', 'activity', 'version']
    
    def __str__(self):
        return f"{self.title} - {self.entrepreneur.full_name} v{self.version}"
    
    @property
    def entrepreneur_name(self):
        return self.entrepreneur.full_name
    
    @property
    def activity_title(self):
        return self.activity.title
    
    @property
    def sector(self):
        return self.activity.sector if self.activity else None
    
    @property
    def sector_display(self):
        if self.activity:
            return self.activity.get_sector_display()
        return None
    
    def get_status_display(self):
        return dict(self.STATUS_CHOICES).get(self.status, self.status)
    
    @property
    def is_approved(self):
        """Vérifie si le plan est approuvé"""
        return self.status == 'approved' or self.is_validated
    
    def can_be_validated(self):
        """Vérifie si le plan peut être validé (soumis ou en révision)"""
        return self.status in ['submitted', 'under_review']
    
    def approve(self, validator):
        """Approuve le plan d'affaires"""
        self.status = 'approved'
        self.is_validated = True
        self.validation_date = timezone.now()
        self.validated_by = validator
        self.save()
    
    def reject(self, validator=None):
        """Rejette le plan d'affaires"""
        self.status = 'rejected'
        self.save()


class BusinessPlanValidation(models.Model):
    """Historique des validations de plans d'affaires"""
    
    VALIDATION_TYPE_CHOICES = [
        ('coach', 'Coach'),
        ('bailleur', 'Bailleur'),
        ('admin', 'Administrateur'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Relations
    business_plan = models.ForeignKey(
        BusinessPlan,
        on_delete=models.CASCADE,
        verbose_name=_('Plan d\'affaires'),
        related_name='validations'
    )
    validator = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        verbose_name=_('Validateur'),
        related_name='business_plan_validations'
    )
    
    # Détails de validation
    validation_type = models.CharField(_('Type de validation'), max_length=20, choices=VALIDATION_TYPE_CHOICES)
    is_approved = models.BooleanField(_('Approuvé'))
    comments = models.TextField(_('Commentaires'), blank=True)
    score = models.PositiveIntegerField(
        _('Score'),
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        null=True,
        blank=True
    )
    
    # Timestamps
    created_at = models.DateTimeField(_('Créé le'), auto_now_add=True)
    
    class Meta:
        verbose_name = _('Validation de plan d\'affaires')
        verbose_name_plural = _('Validations de plans d\'affaires')
        ordering = ['-created_at']
    
    def __str__(self):
        status = "Approuvé" if self.is_approved else "Rejeté"
        return f"Validation {self.business_plan.title} - {status} par {self.validator.phone}"


class BusinessPlanComment(models.Model):
    """Commentaires et feedback sur les plans d'affaires"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Relations
    business_plan = models.ForeignKey(
        BusinessPlan,
        on_delete=models.CASCADE,
        verbose_name=_('Plan d\'affaires'),
        related_name='comments'
    )
    author = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        verbose_name=_('Auteur'),
        related_name='business_plan_comments'
    )
    
    # Contenu
    content = models.TextField(_('Contenu'))
    section = models.CharField(_('Section concernée'), max_length=100, blank=True)
    
    # Métadonnées
    is_internal = models.BooleanField(_('Commentaire interne'), default=False)
    created_at = models.DateTimeField(_('Créé le'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Modifié le'), auto_now=True)
    
    class Meta:
        verbose_name = _('Commentaire de plan d\'affaires')
        verbose_name_plural = _('Commentaires de plans d\'affaires')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Commentaire de {self.author.phone} sur {self.business_plan.title}"
