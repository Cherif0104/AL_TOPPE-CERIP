from django.db import models
from django.utils import timezone
import uuid


class Report(models.Model):
    """Modèle pour la génération automatisée de rapports"""
    
    REPORT_TYPES = [
        ('daily', 'Quotidien'),
        ('weekly', 'Hebdomadaire'),
        ('monthly', 'Mensuel'),
        ('quarterly', 'Trimestriel'),
        ('annual', 'Annuel'),
        ('custom', 'Personnalisé'),
    ]
    
    FORMAT_CHOICES = [
        ('pdf', 'PDF'),
        ('excel', 'Excel'),
        ('csv', 'CSV'),
        ('json', 'JSON'),
        ('html', 'HTML'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255, verbose_name="Titre du rapport")
    description = models.TextField(blank=True, verbose_name="Description")
    
    # Configuration
    report_type = models.CharField(max_length=20, choices=REPORT_TYPES, verbose_name="Type de rapport")
    format = models.CharField(max_length=10, choices=FORMAT_CHOICES, default='pdf', verbose_name="Format")
    
    # Cible
    target_user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, 
                                  related_name='reports', verbose_name="Utilisateur cible")
    activity = models.ForeignKey('entrepreneurs.Activity', on_delete=models.CASCADE, 
                                related_name='reports', verbose_name="Activité")
    
    # Période
    period_start = models.DateField(verbose_name="Début de période")
    period_end = models.DateField(verbose_name="Fin de période")
    
    # Contenu
    data = models.JSONField(verbose_name="Données du rapport")
    template_config = models.JSONField(default=dict, verbose_name="Configuration du template")
    
    # Statut
    is_generated = models.BooleanField(default=False, verbose_name="Rapport généré")
    file_path = models.CharField(max_length=500, blank=True, verbose_name="Chemin du fichier")
    file_size = models.PositiveIntegerField(null=True, blank=True, verbose_name="Taille du fichier (bytes)")
    
    # Métadonnées
    generated_at = models.DateTimeField(null=True, blank=True, verbose_name="Date de génération")
    generation_duration = models.PositiveIntegerField(null=True, blank=True, verbose_name="Durée de génération (secondes)")
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière modification")
    
    class Meta:
        verbose_name = "Rapport"
        verbose_name_plural = "Rapports"
        db_table = 'reports'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} ({self.period_start} - {self.period_end})"
    
    @property
    def is_overdue(self):
        """Vérifie si le rapport est en retard"""
        if self.report_type == 'daily':
            expected_date = timezone.now().date() - timezone.timedelta(days=1)
        elif self.report_type == 'weekly':
            expected_date = timezone.now().date() - timezone.timedelta(weeks=1)
        elif self.report_type == 'monthly':
            expected_date = timezone.now().date() - timezone.timedelta(days=30)
        else:
            return False
        
        return self.period_end <= expected_date and not self.is_generated


class ReportTemplate(models.Model):
    """Modèle pour les templates de rapports"""
    
    TEMPLATE_CATEGORIES = [
        ('financial', 'Financier'),
        ('operational', 'Opérationnel'),
        ('performance', 'Performance'),
        ('compliance', 'Conformité'),
        ('custom', 'Personnalisé'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, verbose_name="Nom du template")
    description = models.TextField(blank=True, verbose_name="Description")
    
    # Classification
    category = models.CharField(max_length=20, choices=TEMPLATE_CATEGORIES, verbose_name="Catégorie")
    is_system = models.BooleanField(default=False, verbose_name="Template système")
    
    # Configuration
    template_config = models.JSONField(default=dict, verbose_name="Configuration du template")
    sections = models.JSONField(default=list, verbose_name="Sections du rapport")
    charts_config = models.JSONField(default=list, verbose_name="Configuration des graphiques")
    
    # Paramètres
    default_format = models.CharField(max_length=10, choices=Report.FORMAT_CHOICES, default='pdf', verbose_name="Format par défaut")
    is_active = models.BooleanField(default=True, verbose_name="Template actif")
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière modification")
    
    class Meta:
        verbose_name = "Template de rapport"
        verbose_name_plural = "Templates de rapports"
        db_table = 'report_templates'
        ordering = ['category', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"


class ReportSchedule(models.Model):
    """Modèle pour la planification des rapports"""
    
    FREQUENCY_CHOICES = [
        ('daily', 'Quotidien'),
        ('weekly', 'Hebdomadaire'),
        ('monthly', 'Mensuel'),
        ('quarterly', 'Trimestriel'),
        ('annual', 'Annuel'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Actif'),
        ('paused', 'En pause'),
        ('cancelled', 'Annulé'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, verbose_name="Nom de la planification")
    description = models.TextField(blank=True, verbose_name="Description")
    
    # Configuration
    template = models.ForeignKey(ReportTemplate, on_delete=models.CASCADE, 
                               related_name='schedules', verbose_name="Template")
    target_user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, 
                                  related_name='report_schedules', verbose_name="Utilisateur cible")
    
    # Planification
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, verbose_name="Fréquence")
    start_date = models.DateField(verbose_name="Date de début")
    end_date = models.DateField(null=True, blank=True, verbose_name="Date de fin")
    
    # Paramètres de génération
    generation_time = models.TimeField(verbose_name="Heure de génération")
    auto_send = models.BooleanField(default=False, verbose_name="Envoi automatique")
    recipients = models.JSONField(default=list, verbose_name="Destinataires")
    
    # Statut
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active', verbose_name="Statut")
    last_generated = models.DateTimeField(null=True, blank=True, verbose_name="Dernière génération")
    next_generation = models.DateTimeField(null=True, blank=True, verbose_name="Prochaine génération")
    
    # Métriques
    total_generated = models.PositiveIntegerField(default=0, verbose_name="Total généré")
    success_rate = models.DecimalField(
        max_digits=5, decimal_places=2,
        null=True, blank=True, verbose_name="Taux de réussite (%)"
    )
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière modification")
    
    class Meta:
        verbose_name = "Planification de rapport"
        verbose_name_plural = "Planifications de rapports"
        db_table = 'report_schedules'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.get_frequency_display()})"
    
    @property
    def is_active(self):
        """Vérifie si la planification est active"""
        today = timezone.now().date()
        return (self.status == 'active' and 
                self.start_date <= today and 
                (not self.end_date or today <= self.end_date))
    
    def calculate_next_generation(self):
        """Calcule la prochaine date de génération"""
        if not self.last_generated:
            return timezone.now()
        
        if self.frequency == 'daily':
            return self.last_generated + timezone.timedelta(days=1)
        elif self.frequency == 'weekly':
            return self.last_generated + timezone.timedelta(weeks=1)
        elif self.frequency == 'monthly':
            return self.last_generated + timezone.timedelta(days=30)
        elif self.frequency == 'quarterly':
            return self.last_generated + timezone.timedelta(days=90)
        elif self.frequency == 'annual':
            return self.last_generated + timezone.timedelta(days=365)
        
        return self.last_generated


class ReportDistribution(models.Model):
    """Modèle pour la distribution des rapports"""
    
    DELIVERY_METHODS = [
        ('email', 'Email'),
        ('sms', 'SMS'),
        ('whatsapp', 'WhatsApp'),
        ('push', 'Notification push'),
        ('download', 'Téléchargement'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('sent', 'Envoyé'),
        ('delivered', 'Livré'),
        ('failed', 'Échec'),
        ('cancelled', 'Annulé'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    report = models.ForeignKey(Report, on_delete=models.CASCADE, 
                             related_name='distributions', verbose_name="Rapport")
    
    # Destinataire
    recipient = models.ForeignKey('accounts.User', on_delete=models.CASCADE, 
                                related_name='report_distributions', verbose_name="Destinataire")
    delivery_method = models.CharField(max_length=20, choices=DELIVERY_METHODS, verbose_name="Méthode de livraison")
    
    # Statut
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name="Statut")
    
    # Tentatives
    attempts = models.PositiveIntegerField(default=0, verbose_name="Nombre de tentatives")
    max_attempts = models.PositiveIntegerField(default=3, verbose_name="Nombre max de tentatives")
    
    # Métadonnées
    sent_at = models.DateTimeField(null=True, blank=True, verbose_name="Date d'envoi")
    delivered_at = models.DateTimeField(null=True, blank=True, verbose_name="Date de livraison")
    error_message = models.TextField(blank=True, verbose_name="Message d'erreur")
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière modification")
    
    class Meta:
        verbose_name = "Distribution de rapport"
        verbose_name_plural = "Distributions de rapports"
        db_table = 'report_distributions'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Distribution {self.report.title} → {self.recipient}"
    
    @property
    def can_retry(self):
        """Vérifie si on peut réessayer l'envoi"""
        return self.status == 'failed' and self.attempts < self.max_attempts
    
    def mark_as_sent(self):
        """Marque la distribution comme envoyée"""
        self.status = 'sent'
        self.sent_at = timezone.now()
        self.attempts += 1
        self.save()
    
    def mark_as_delivered(self):
        """Marque la distribution comme livrée"""
        self.status = 'delivered'
        self.delivered_at = timezone.now()
        self.save()
    
    def mark_as_failed(self, error_message=""):
        """Marque la distribution comme échouée"""
        self.status = 'failed'
        self.error_message = error_message
        self.attempts += 1
        self.save()
