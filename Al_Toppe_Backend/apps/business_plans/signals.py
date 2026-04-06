from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.utils import timezone
from .models import BusinessPlan, BusinessPlanValidation, BusinessPlanComment


@receiver(post_save, sender=BusinessPlan)
def business_plan_updated(sender, instance, created, **kwargs):
    """Signal déclenché lors de la création/modification d'un plan d'affaires"""
    if created:
        print(f"✅ Nouveau plan d'affaires créé: {instance.title}")
        print(f"   Entrepreneur: {instance.entrepreneur.full_name}")
        print(f"   Activité: {instance.activity.title}")
        print(f"   Statut: {instance.get_status_display()}")
    else:
        print(f"📝 Plan d'affaires mis à jour: {instance.title}")
        print(f"   Nouveau statut: {instance.get_status_display()}")
        print(f"   Validé: {instance.is_validated}")


@receiver(post_save, sender=BusinessPlanValidation)
def business_plan_validation_updated(sender, instance, created, **kwargs):
    """Signal déclenché lors de la création/modification d'une validation"""
    if created:
        status = "✅ Approuvé" if instance.is_approved else "❌ Rejeté"
        print(f"🔍 Nouvelle validation de plan d'affaires:")
        print(f"   Plan: {instance.business_plan.title}")
        print(f"   Validateur: {instance.validator.phone}")
        print(f"   Type: {instance.get_validation_type_display()}")
        print(f"   Résultat: {status}")
        if instance.score:
            print(f"   Score: {instance.score}/10")
        
        # Mettre à jour le statut du plan d'affaires si approuvé
        if instance.is_approved:
            business_plan = instance.business_plan
            business_plan.is_validated = True
            business_plan.validation_date = timezone.now()
            business_plan.validated_by = instance.validator
            business_plan.save()
            print(f"   🎯 Plan d'affaires validé automatiquement")


@receiver(post_save, sender=BusinessPlanComment)
def business_plan_comment_updated(sender, instance, created, **kwargs):
    """Signal déclenché lors de la création/modification d'un commentaire"""
    if created:
        print(f"💬 Nouveau commentaire sur le plan d'affaires:")
        print(f"   Plan: {instance.business_plan.title}")
        print(f"   Auteur: {instance.author.phone}")
        print(f"   Section: {instance.section or 'Général'}")
        print(f"   Interne: {'Oui' if instance.is_internal else 'Non'}")


@receiver(post_delete, sender=BusinessPlan)
def business_plan_deleted(sender, instance, **kwargs):
    """Signal déclenché lors de la suppression d'un plan d'affaires"""
    print(f"🗑️ Plan d'affaires supprimé: {instance.title}")
    print(f"   Entrepreneur: {instance.entrepreneur.full_name}")


@receiver(post_delete, sender=BusinessPlanValidation)
def business_plan_validation_deleted(sender, instance, **kwargs):
    """Signal déclenché lors de la suppression d'une validation"""
    print(f"🗑️ Validation supprimée pour: {instance.business_plan.title}")


@receiver(post_delete, sender=BusinessPlanComment)
def business_plan_comment_deleted(sender, instance, **kwargs):
    """Signal déclenché lors de la suppression d'un commentaire"""
    print(f"🗑️ Commentaire supprimé sur: {instance.business_plan.title}")
