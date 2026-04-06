from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Category, CashflowEntry, Budget, BudgetItem


@receiver(post_save, sender=Category)
def category_created(sender, instance, created, **kwargs):
    """Signal émis lors de la création d'une catégorie"""
    if created:
        print(f"Nouvelle catégorie créée: {instance.name} ({instance.get_type_display()})")


@receiver(post_save, sender=Category)
def category_updated(sender, instance, created, **kwargs):
    """Signal émis lors de la mise à jour d'une catégorie"""
    if not created:
        print(f"Catégorie mise à jour: {instance.name}")


@receiver(post_save, sender=CashflowEntry)
def cashflow_entry_created(sender, instance, created, **kwargs):
    """Signal émis lors de la création d'une entrée de trésorerie"""
    if created:
        print(f"Nouvelle entrée de trésorerie: {instance.title} - {instance.amount} FCFA "
              f"({instance.get_type_display()}) pour {instance.entrepreneur.full_name}")


@receiver(post_save, sender=CashflowEntry)
def cashflow_entry_updated(sender, instance, created, **kwargs):
    """Signal émis lors de la mise à jour d'une entrée de trésorerie"""
    if not created:
        print(f"Entrée de trésorerie mise à jour: {instance.title} - {instance.amount} FCFA")


@receiver(post_save, sender=Budget)
def budget_created(sender, instance, created, **kwargs):
    """Signal émis lors de la création d'un budget"""
    if created:
        print(f"Nouveau budget créé: {instance.name} ({instance.get_period_display()}) "
              f"pour {instance.entrepreneur.full_name}")


@receiver(post_save, sender=Budget)
def budget_updated(sender, instance, created, **kwargs):
    """Signal émis lors de la mise à jour d'un budget"""
    if not created:
        print(f"Budget mis à jour: {instance.name}")


@receiver(post_save, sender=BudgetItem)
def budget_item_created(sender, instance, created, **kwargs):
    """Signal émis lors de la création d'un élément de budget"""
    if created:
        print(f"Nouvel élément de budget: {instance.category.name} - "
              f"{instance.budgeted_amount} FCFA pour le budget {instance.budget.name}")


@receiver(post_save, sender=BudgetItem)
def budget_item_updated(sender, instance, created, **kwargs):
    """Signal émis lors de la mise à jour d'un élément de budget"""
    if not created:
        print(f"Élément de budget mis à jour: {instance.category.name} - "
              f"{instance.budgeted_amount} FCFA")


@receiver(post_delete, sender=Category)
def category_deleted(sender, instance, **kwargs):
    """Signal émis lors de la suppression d'une catégorie"""
    print(f"Catégorie supprimée: {instance.name}")


@receiver(post_delete, sender=CashflowEntry)
def cashflow_entry_deleted(sender, instance, **kwargs):
    """Signal émis lors de la suppression d'une entrée de trésorerie"""
    print(f"Entrée de trésorerie supprimée: {instance.title} - {instance.amount} FCFA")


@receiver(post_delete, sender=Budget)
def budget_deleted(sender, instance, **kwargs):
    """Signal émis lors de la suppression d'un budget"""
    print(f"Budget supprimé: {instance.name}")


@receiver(post_delete, sender=BudgetItem)
def budget_item_deleted(sender, instance, **kwargs):
    """Signal émis lors de la suppression d'un élément de budget"""
    print(f"Élément de budget supprimé: {instance.category.name} - {instance.budgeted_amount} FCFA")
