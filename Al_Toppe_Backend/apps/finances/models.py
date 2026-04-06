from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator
import uuid


class Category(models.Model):
    """Modèle pour les catégories de revenus et dépenses"""
    
    # Types de catégories
    TYPE_CHOICES = [
        ('income', 'Revenu'),
        ('expense', 'Dépense'),
        ('both', 'Revenu et Dépense'),
    ]
    
    # Champs principaux
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True, verbose_name="Nom de la catégorie")
    description = models.TextField(blank=True, verbose_name="Description")
    type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='both', verbose_name="Type")
    
    # Icône et couleur pour l'interface
    icon = models.CharField(max_length=50, blank=True, verbose_name="Icône (classe CSS)")
    color = models.CharField(max_length=7, blank=True, verbose_name="Couleur (hex)")
    
    # Hiérarchie (catégories parent/enfant)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, 
                              related_name='subcategories', 
                              null=True, blank=True,
                              verbose_name="Catégorie parente")
    
    # Ordre d'affichage
    order = models.IntegerField(default=0, verbose_name="Ordre d'affichage")
    
    # Statut
    is_active = models.BooleanField(default=True, verbose_name="Catégorie active")
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière modification")
    
    class Meta:
        verbose_name = "Catégorie"
        verbose_name_plural = "Catégories"
        db_table = 'categories'
        ordering = ['order', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.get_type_display()})"
    
    def get_full_name(self):
        """Retourne le nom complet avec la hiérarchie"""
        if self.parent:
            return f"{self.parent.name} → {self.name}"
        return self.name
    
    @property
    def total_amount(self):
        """Calcule le montant total de la catégorie"""
        if self.type == 'income':
            return self.cashflow_entries.filter(type='income').aggregate(
                total=models.Sum('amount'))['total'] or 0
        elif self.type == 'expense':
            return self.cashflow_entries.filter(type='expense').aggregate(
                total=models.Sum('amount'))['total'] or 0
        else:
            return 0


class CashflowEntry(models.Model):
    """Modèle pour les entrées de trésorerie (revenus et dépenses)"""
    
    # Types d'entrées
    TYPE_CHOICES = [
        ('income', 'Revenu'),
        ('expense', 'Dépense'),
    ]
    
    # Fréquences de paiement
    FREQUENCY_CHOICES = [
        ('one_time', 'Ponctuel'),
        ('daily', 'Quotidien'),
        ('weekly', 'Hebdomadaire'),
        ('monthly', 'Mensuel'),
        ('quarterly', 'Trimestriel'),
        ('yearly', 'Annuel'),
    ]
    
    # Statuts de paiement
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('paid', 'Payé'),
        ('overdue', 'En retard'),
        ('cancelled', 'Annulé'),
    ]
    
    # Champs principaux
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    entrepreneur = models.ForeignKey('entrepreneurs.Entrepreneur', on_delete=models.CASCADE, 
                                   related_name='cashflow_entries', verbose_name="Entrepreneur")
    activity = models.ForeignKey('entrepreneurs.Activity', on_delete=models.CASCADE, 
                                related_name='cashflow_entries', verbose_name="Activité")
    
    # Informations de base
    title = models.CharField(max_length=255, verbose_name="Titre de l'entrée")
    description = models.TextField(blank=True, verbose_name="Description")
    type = models.CharField(max_length=10, choices=TYPE_CHOICES, verbose_name="Type")
    amount = models.DecimalField(max_digits=12, decimal_places=2, 
                               validators=[MinValueValidator(0)], verbose_name="Montant (FCFA)")
    
    # Catégorisation
    category = models.ForeignKey(Category, on_delete=models.PROTECT, 
                               related_name='cashflow_entries', verbose_name="Catégorie")
    
    # Dates et fréquence
    date = models.DateField(verbose_name="Date de l'entrée")
    due_date = models.DateField(null=True, blank=True, verbose_name="Date d'échéance")
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, 
                               default='one_time', verbose_name="Fréquence")
    
    # Statut de paiement
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, 
                                    default='pending', verbose_name="Statut de paiement")
    
    # Informations de paiement
    payment_method = models.CharField(max_length=50, blank=True, verbose_name="Méthode de paiement")
    reference = models.CharField(max_length=100, blank=True, verbose_name="Référence")
    
    # Champs pour compatibilité template compte de résultat
    invoice_number = models.CharField(max_length=100, blank=True, verbose_name="Numéro de facture/pièce")
    client_supplier = models.CharField(max_length=255, blank=True, verbose_name="Fournisseur/Client")
    has_invoice = models.BooleanField(default=False, verbose_name="Facture disponible")
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière modification")
    
    class Meta:
        verbose_name = "Entrée de trésorerie"
        verbose_name_plural = "Entrées de trésorerie"
        db_table = 'cashflow_entries'
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['date', 'type']),
            models.Index(fields=['entrepreneur', 'type']),
            models.Index(fields=['category', 'type']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.amount} FCFA ({self.get_type_display()})"
    
    @property
    def is_overdue(self):
        """Vérifie si l'entrée est en retard"""
        if self.due_date and self.payment_status == 'pending':
            return timezone.now().date() > self.due_date
        return False
    
    @property
    def days_overdue(self):
        """Calcule le nombre de jours de retard"""
        if self.is_overdue:
            return (timezone.now().date() - self.due_date).days
        return 0
    
    def save(self, *args, **kwargs):
        """Mise à jour automatique du statut de paiement"""
        if self.payment_status == 'pending' and self.due_date:
            if timezone.now().date() > self.due_date:
                self.payment_status = 'overdue'
        super().save(*args, **kwargs)


class Budget(models.Model):
    """Modèle pour la planification budgétaire"""
    
    # Périodes budgétaires
    PERIOD_CHOICES = [
        ('monthly', 'Mensuel'),
        ('quarterly', 'Trimestriel'),
        ('yearly', 'Annuel'),
    ]
    
    # Statuts du budget
    STATUS_CHOICES = [
        ('draft', 'Brouillon'),
        ('active', 'Actif'),
        ('completed', 'Terminé'),
        ('cancelled', 'Annulé'),
    ]
    
    # Champs principaux
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    entrepreneur = models.ForeignKey('entrepreneurs.Entrepreneur', on_delete=models.CASCADE, 
                                   related_name='budgets', verbose_name="Entrepreneur")
    activity = models.ForeignKey('entrepreneurs.Activity', on_delete=models.CASCADE, 
                                related_name='budgets', verbose_name="Activité")
    
    # Informations de base
    name = models.CharField(max_length=255, verbose_name="Nom du budget")
    description = models.TextField(blank=True, verbose_name="Description")
    period = models.CharField(max_length=20, choices=PERIOD_CHOICES, default='monthly', verbose_name="Période")
    
    # Période budgétaire
    start_date = models.DateField(verbose_name="Date de début")
    end_date = models.DateField(verbose_name="Date de fin")
    
    # Montants
    total_income_budget = models.DecimalField(max_digits=12, decimal_places=2, 
                                            validators=[MinValueValidator(0)], verbose_name="Budget revenus (FCFA)")
    total_expense_budget = models.DecimalField(max_digits=12, decimal_places=2, 
                                             validators=[MinValueValidator(0)], verbose_name="Budget dépenses (FCFA)")
    
    # Statut
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', verbose_name="Statut")
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière modification")
    
    class Meta:
        verbose_name = "Budget"
        verbose_name_plural = "Budgets"
        db_table = 'budgets'
        ordering = ['-start_date', '-created_at']
    
    def __str__(self):
        return f"{self.name} - {self.start_date} à {self.end_date}"
    
    @property
    def net_budget(self):
        """Calcule le budget net (revenus - dépenses)"""
        return self.total_income_budget - self.total_expense_budget
    
    @property
    def progress_percentage(self):
        """Calcule le pourcentage de progression de la période"""
        total_days = (self.end_date - self.start_date).days
        elapsed_days = (timezone.now().date() - self.start_date).days
        
        if total_days > 0:
            progress = min(max(elapsed_days / total_days * 100, 0), 100)
            return round(progress, 1)
        return 0
    
    @property
    def actual_income(self):
        """Calcule les revenus réels de la période"""
        # Utiliser CashflowEntry pour filtrer les entrées liées à ce budget
        return CashflowEntry.objects.filter(
            entrepreneur=self.entrepreneur,
            activity=self.activity,
            type='income',
            date__gte=self.start_date,
            date__lte=self.end_date
        ).aggregate(total=models.Sum('amount'))['total'] or 0
    
    @property
    def actual_expenses(self):
        """Calcule les dépenses réelles de la période"""
        return CashflowEntry.objects.filter(
            entrepreneur=self.entrepreneur,
            activity=self.activity,
            type='expense',
            date__gte=self.start_date,
            date__lte=self.end_date
        ).aggregate(total=models.Sum('amount'))['total'] or 0
    
    @property
    def actual_net(self):
        """Calcule le résultat net réel"""
        return self.actual_income - self.actual_expenses
    
    @property
    def variance_income(self):
        """Calcule l'écart sur les revenus"""
        return self.actual_income - self.total_income_budget
    
    @property
    def variance_expenses(self):
        """Calcule l'écart sur les dépenses"""
        return self.actual_expenses - self.total_expense_budget
    
    @property
    def variance_net(self):
        """Calcule l'écart net"""
        return self.actual_net - self.net_budget


class BudgetItem(models.Model):
    """Modèle pour les éléments détaillés du budget"""
    
    # Champs principaux
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    budget = models.ForeignKey(Budget, on_delete=models.CASCADE, 
                             related_name='budget_items', verbose_name="Budget")
    category = models.ForeignKey(Category, on_delete=models.PROTECT, 
                               related_name='budget_items', verbose_name="Catégorie")
    
    # Montants budgétés
    budgeted_amount = models.DecimalField(max_digits=12, decimal_places=2, 
                                        validators=[MinValueValidator(0)], verbose_name="Montant budgété (FCFA)")
    
    # Notes
    notes = models.TextField(blank=True, verbose_name="Notes")
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière modification")
    
    class Meta:
        verbose_name = "Élément de budget"
        verbose_name_plural = "Éléments de budget"
        db_table = 'budget_items'
        ordering = ['category__name']
        unique_together = ['budget', 'category']
    
    def __str__(self):
        return f"{self.category.name} - {self.budgeted_amount} FCFA"
    
    @property
    def actual_amount(self):
        """Calcule le montant réel de la catégorie pour la période du budget"""
        # Utiliser CashflowEntry pour filtrer les entrées liées à ce budget (même entrepreneur, activité, période, catégorie)
        return CashflowEntry.objects.filter(
            entrepreneur=self.budget.entrepreneur,
            activity=self.budget.activity,
            category=self.category,
            date__gte=self.budget.start_date,
            date__lte=self.budget.end_date
        ).aggregate(total=models.Sum('amount'))['total'] or 0
    
    @property
    def variance(self):
        """Calcule l'écart entre le budget et le réel"""
        return self.actual_amount - self.budgeted_amount
    
    @property
    def variance_percentage(self):
        """Calcule le pourcentage d'écart"""
        if self.budgeted_amount != 0:
            return (self.variance / self.budgeted_amount) * 100
        return 0

