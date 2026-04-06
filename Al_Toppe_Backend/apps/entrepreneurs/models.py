from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


class Entrepreneur(models.Model):
    """Modèle pour les profils d'entrepreneurs"""
    
    # Choix pour la civilité
    CIVILITY_CHOICES = [
        ('M', 'Monsieur'),
        ('Mme', 'Madame'),
    ]
    
    # Champs principaux
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField('accounts.User', on_delete=models.CASCADE, related_name='entrepreneur')
    
    # Informations personnelles
    first_name = models.CharField(max_length=100, verbose_name="Prénom")
    last_name = models.CharField(max_length=100, verbose_name="Nom de famille")
    civility = models.CharField(max_length=4, choices=CIVILITY_CHOICES, verbose_name="Civilité")
    cni_number = models.CharField(
        max_length=50,
        unique=True,
        null=True,
        blank=True,
        verbose_name="Numéro CNI",
    )
    
    # Coordonnées
    address = models.TextField(verbose_name="Adresse complète")
    whatsapp = models.CharField(max_length=20, blank=True, verbose_name="Numéro WhatsApp")
    birth_date = models.DateField(null=True, blank=True, verbose_name="Date de naissance")
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière modification")
    
    class Meta:
        verbose_name = "Entrepreneur"
        verbose_name_plural = "Entrepreneurs"
        db_table = 'entrepreneurs'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.user.phone})"
    
    @property
    def full_name(self):
        """Retourne le nom complet de l'entrepreneur"""
        return f"{self.first_name} {self.last_name}"
    
    @property
    def age(self):
        """Calcule l'âge de l'entrepreneur"""
        if self.birth_date:
            today = timezone.now().date()
            return today.year - self.birth_date.year - ((today.month, today.day) < (self.birth_date.month, self.birth_date.day))
        return None
    
    def get_activities_count(self):
        """Retourne le nombre d'activités de l'entrepreneur"""
        return self.activities.count()
    
    def get_total_revenue(self):
        """Calcule le revenu total de toutes les activités"""
        total = 0
        for activity in self.activities.all():
            total += activity.get_total_revenue()
        return total


class Location(models.Model):
    """Modèle pour les localisations des entrepreneurs"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    entrepreneur = models.ForeignKey(Entrepreneur, on_delete=models.CASCADE, related_name='locations')
    
    # Adresse
    address = models.TextField(verbose_name="Adresse complète")
    region = models.CharField(max_length=100, verbose_name="Région")
    city = models.CharField(max_length=100, verbose_name="Ville")
    
    # Géolocalisation
    lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, verbose_name="Latitude")
    lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, verbose_name="Longitude")
    
    # Statut
    is_primary = models.BooleanField(default=False, verbose_name="Adresse principale")
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now, verbose_name="Date de création")
    
    class Meta:
        verbose_name = "Localisation"
        verbose_name_plural = "Localisations"
        db_table = 'locations'
        ordering = ['-is_primary', '-created_at']
    
    def __str__(self):
        return f"{self.address}, {self.city}, {self.region}"
    
    def save(self, *args, **kwargs):
        """S'assurer qu'une seule adresse est marquée comme principale"""
        if self.is_primary:
            # Désactiver les autres adresses principales
            Location.objects.filter(entrepreneur=self.entrepreneur, is_primary=True).update(is_primary=False)
        super().save(*args, **kwargs)
    
    @property
    def coordinates(self):
        """Retourne les coordonnées sous forme de tuple"""
        if self.lat and self.lng:
            return (float(self.lat), float(self.lng))
        return None


class Activity(models.Model):
    """Modèle pour les activités d'entreprise des entrepreneurs"""
    
    # Choix pour les secteurs d'activité
    SECTOR_CHOICES = [
        ('commerce', 'Commerce'),
        ('service', 'Service'),
        ('artisanat', 'Artisanat'),
        ('agriculture', 'Agriculture'),
        
    ]
    
    # Choix pour les formes juridiques
    LEGAL_FORM_CHOICES = [
        ('Informel', 'Informel'),
        ('EI', 'Entreprise Individuelle'),
        ('EURL', 'EURL'),
        ('SARL', 'SARL'),
        ('SA', 'SA'),
        ('GIE', 'GIE'),
        ('Association', 'Association'),
    ]
    
    # Choix pour les régimes fiscaux
    TAX_REGIME_CHOICES = [
        ('Non imposable', 'Non imposable'),
        ('Régime simplifié', 'Régime simplifié'),
        ('Régime réel', 'Régime réel'),
    ]
    
    # Choix pour les statuts
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('suspended', 'Suspendue'),
        ('closed', 'Fermée'),
    ]
    
    # Choix pour la fréquence d'activité
    FREQUENCY_CHOICES = [
        ('daily', 'Quotidienne'),
        ('weekly', 'Hebdomadaire'),
        ('monthly', 'Mensuelle'),
        ('quarterly', 'Trimestrielle'),
        ('yearly', 'Annuelle'),
    ]
    
    # Champs principaux
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    entrepreneur = models.ForeignKey(Entrepreneur, on_delete=models.CASCADE, related_name='activities')
    location = models.ForeignKey(Location, on_delete=models.SET_NULL, null=True, blank=True, related_name='activities')
    
    # Informations de base
    title = models.CharField(max_length=255, verbose_name="Nom de l'activité")
    sector = models.CharField(max_length=50, choices=SECTOR_CHOICES, verbose_name="Secteur d'activité")
    description = models.TextField(blank=True, verbose_name="Description de l'activité")
    
    # Informations légales
    creation_date = models.DateField(verbose_name="Date de création")
    legal_form = models.CharField(max_length=50, choices=LEGAL_FORM_CHOICES, default='Informel', verbose_name="Forme juridique")
    tax_regime = models.CharField(max_length=50, choices=TAX_REGIME_CHOICES, blank=True, verbose_name="Régime fiscal")
    
    # Fréquence d'activité
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, default='monthly', verbose_name="Fréquence")
    frequency_day = models.PositiveIntegerField(
        null=True, 
        blank=True, 
        validators=[MinValueValidator(1), MaxValueValidator(31)],
        verbose_name="Jour du mois",
        help_text="Pour les activités mensuelles, le jour du mois où l'activité se déroule"
    )
    
    # Statut
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active', verbose_name="Statut")
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière modification")
    
    class Meta:
        verbose_name = "Activité"
        verbose_name_plural = "Activités"
        db_table = 'activities'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} - {self.entrepreneur.full_name}"
    
    @property
    def is_active(self):
        """Vérifie si l'activité est active"""
        return self.status == 'active'
    
    @property
    def age_in_days(self):
        """Calcule l'âge de l'activité en jours"""
        return (timezone.now().date() - self.creation_date).days
    
    def get_total_revenue(self):
        """Calcule le revenu total de l'activité"""
        from apps.finances.models import CashflowEntry
        total = CashflowEntry.objects.filter(
            activity=self,
            type='income'
        ).aggregate(total=models.Sum('amount'))['total']
        return total or 0
    
    def get_total_expenses(self):
        """Calcule le total des dépenses de l'activité"""
        from apps.finances.models import CashflowEntry
        total = CashflowEntry.objects.filter(
            activity=self,
            type='expense'
        ).aggregate(total=models.Sum('amount'))['total']
        return total or 0
    
    def get_profit(self):
        """Calcule le bénéfice de l'activité"""
        return self.get_total_revenue() - self.get_total_expenses()
    
    def get_activity_summary(self):
        """Retourne un résumé de l'activité"""
        return {
            'title': self.title,
            'sector': self.get_sector_display(),
            'status': self.get_status_display(),
            '   ': self.get_frequency_display(),
            'age_days': self.age_in_days,
            'total_revenue': self.get_total_revenue(),
            'total_expenses': self.get_total_expenses(),
            'profit': self.get_profit(),
        }
