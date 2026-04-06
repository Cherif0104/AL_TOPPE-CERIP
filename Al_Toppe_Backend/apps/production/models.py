from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator
import uuid


class ProductionCycle(models.Model):
    """Modèle pour les cycles de production"""
    
    STATUS_CHOICES = [
        ('planned', 'Planifié'),
        ('in_progress', 'En cours'),
        ('completed', 'Terminé'),
        ('cancelled', 'Annulé'),
        ('delayed', 'En retard'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    activity = models.ForeignKey('entrepreneurs.Activity', on_delete=models.CASCADE, 
                               related_name='production_cycles', verbose_name="Activité")
    
    # Informations de base
    title = models.CharField(max_length=255, verbose_name="Titre du cycle")
    duration_days = models.PositiveIntegerField(validators=[MinValueValidator(1)], 
                                              verbose_name="Durée prévue (jours)")
    
    # Dates
    start_date = models.DateField(verbose_name="Date de début")
    expected_end_date = models.DateField(verbose_name="Date de fin prévue")
    actual_end_date = models.DateField(null=True, blank=True, verbose_name="Date de fin réelle")
    
    # Statut et quantités
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planned', verbose_name="Statut")
    target_quantity = models.PositiveIntegerField(null=True, blank=True, verbose_name="Quantité cible")
    actual_quantity = models.PositiveIntegerField(null=True, blank=True, verbose_name="Quantité réalisée")
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière modification")
    
    class Meta:
        verbose_name = "Cycle de production"
        verbose_name_plural = "Cycles de production"
        db_table = 'production_cycles'
        ordering = ['-start_date']
    
    def __str__(self):
        return f"{self.title} - {self.activity.title}"
    
    @property
    def is_delayed(self):
        """Vérifie si le cycle est en retard"""
        if self.status == 'in_progress' and self.expected_end_date < timezone.now().date():
            return True
        return False
    
    @property
    def progress_percentage(self):
        """Calcule le pourcentage de progression"""
        if self.status == 'completed':
            return 100
        elif self.status == 'planned':
            return 0
        
        total_days = (self.expected_end_date - self.start_date).days
        if total_days <= 0:
            return 0
        
        elapsed_days = (timezone.now().date() - self.start_date).days
        progress = min(100, max(0, (elapsed_days / total_days) * 100))
        return round(progress, 1)
    
    @property
    def completion_rate(self):
        """Calcule le taux de réalisation"""
        if not self.target_quantity or self.target_quantity == 0:
            return 0
        if not self.actual_quantity:
            return 0
        return min(100, (self.actual_quantity / self.target_quantity) * 100)
    
    def get_total_tasks(self):
        """Retourne le nombre total de tâches"""
        return self.tasks.count()
    
    def get_completed_tasks(self):
        """Retourne le nombre de tâches terminées"""
        return self.tasks.filter(status='completed').count()
    
    def get_tasks_progress(self):
        """Calcule la progression basée sur les tâches"""
        total_tasks = self.get_total_tasks()
        if total_tasks == 0:
            return 0
        completed_tasks = self.get_completed_tasks()
        return (completed_tasks / total_tasks) * 100


class ProductionTask(models.Model):
    """Modèle pour les tâches de production"""
    
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('in_progress', 'En cours'),
        ('completed', 'Terminé'),
        ('cancelled', 'Annulé'),
        ('blocked', 'Bloqué'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    production_cycle = models.ForeignKey(ProductionCycle, on_delete=models.CASCADE, 
                                       related_name='tasks', verbose_name="Cycle de production")
    
    # Informations de base
    name = models.CharField(max_length=255, verbose_name="Nom de la tâche")
    sequence_order = models.PositiveIntegerField(verbose_name="Ordre de séquence")
    
    # Statut et durée
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name="Statut")
    planned_duration_days = models.PositiveIntegerField(null=True, blank=True, verbose_name="Durée prévue (jours)")
    actual_duration_days = models.PositiveIntegerField(null=True, blank=True, verbose_name="Durée réelle (jours)")
    
    # Dépendances
    depends_on = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, 
                                 related_name='dependent_tasks', verbose_name="Dépend de")
    
    # Dates
    planned_start_date = models.DateField(null=True, blank=True, verbose_name="Date de début prévue")
    planned_end_date = models.DateField(null=True, blank=True, verbose_name="Date de fin prévue")
    actual_start_date = models.DateField(null=True, blank=True, verbose_name="Date de début réelle")
    actual_end_date = models.DateField(null=True, blank=True, verbose_name="Date de fin réelle")
    
    # Description et notes
    description = models.TextField(blank=True, verbose_name="Description")
    notes = models.TextField(blank=True, verbose_name="Notes")
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière modification")
    
    class Meta:
        verbose_name = "Tâche de production"
        verbose_name_plural = "Tâches de production"
        db_table = 'production_tasks'
        ordering = ['production_cycle', 'sequence_order']
        unique_together = ['production_cycle', 'sequence_order']
    
    def __str__(self):
        return f"{self.name} - {self.production_cycle.title}"
    
    @property
    def is_delayed(self):
        """Vérifie si la tâche est en retard"""
        if self.status == 'in_progress' and self.planned_end_date:
            if self.planned_end_date < timezone.now().date():
                return True
        return False
    
    @property
    def can_start(self):
        """Vérifie si la tâche peut démarrer"""
        if self.depends_on:
            return self.depends_on.status == 'completed'
        return True
    
    def start_task(self):
        """Démarre la tâche"""
        if self.can_start and self.status == 'pending':
            self.status = 'in_progress'
            self.actual_start_date = timezone.now().date()
            self.save()
            return True
        return False
    
    def complete_task(self):
        """Termine la tâche"""
        if self.status == 'in_progress':
            self.status = 'completed'
            self.actual_end_date = timezone.now().date()
            if self.actual_start_date:
                self.actual_duration_days = (self.actual_end_date - self.actual_start_date).days
            self.save()
            return True
        return False
    
    def get_dependent_tasks(self):
        """Retourne les tâches qui dépendent de celle-ci"""
        return self.dependent_tasks.all()
    
    def get_blocking_tasks(self):
        """Retourne les tâches qui bloquent celle-ci"""
        if self.depends_on:
            return [self.depends_on]
        return []
