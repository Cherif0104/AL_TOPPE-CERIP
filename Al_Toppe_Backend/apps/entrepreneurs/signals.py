from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Entrepreneur, Location, Activity


@receiver(post_save, sender=Entrepreneur)
def entrepreneur_created(sender, instance, created, **kwargs):
    """Signal émis lors de la création d'un entrepreneur"""
    if created:
        print(f"Nouvel entrepreneur créé: {instance.full_name} ({instance.user.phone})")


@receiver(post_save, sender=Entrepreneur)
def entrepreneur_updated(sender, instance, created, **kwargs):
    """Signal émis lors de la mise à jour d'un entrepreneur"""
    if not created:
        print(f"Entrepreneur mis à jour: {instance.full_name}")


@receiver(post_save, sender=Location)
def location_created(sender, instance, created, **kwargs):
    """Signal émis lors de la création d'une localisation"""
    if created:
        print(f"Nouvelle localisation créée pour {instance.entrepreneur.full_name}: {instance.address}")


@receiver(post_save, sender=Activity)
def activity_created(sender, instance, created, **kwargs):
    """Signal émis lors de la création d'une activité"""
    if created:
        print(f"Nouvelle activité créée: {instance.title} par {instance.entrepreneur.full_name}")


@receiver(post_save, sender=Activity)
def activity_updated(sender, instance, created, **kwargs):
    """Signal émis lors de la mise à jour d'une activité"""
    if not created:
        print(f"Activité mise à jour: {instance.title}")


@receiver(post_delete, sender=Entrepreneur)
def entrepreneur_deleted(sender, instance, **kwargs):
    """Signal émis lors de la suppression d'un entrepreneur"""
    print(f"Entrepreneur supprimé: {instance.full_name}")


@receiver(post_delete, sender=Location)
def location_deleted(sender, instance, **kwargs):
    """Signal émis lors de la suppression d'une localisation"""
    print(f"Localisation supprimée: {instance.address}")


@receiver(post_delete, sender=Activity)
def activity_deleted(sender, instance, **kwargs):
    """Signal émis lors de la suppression d'une activité"""
    print(f"Activité supprimée: {instance.title}")
