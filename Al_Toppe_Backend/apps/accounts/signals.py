from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from .models import User


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Créer automatiquement le profil correspondant lors de la création d'un utilisateur"""
    if created:
        # En fonction du rôle, créer le profil approprié
        if instance.role == 'entrepreneur':
            # Créer le profil entrepreneur (sera implémenté plus tard)
            pass
        elif instance.role == 'coach':
            # Créer le profil coach (sera implémenté plus tard)
            pass
        elif instance.role == 'bailleur':
            # Créer le profil bailleur (sera implémenté plus tard)
            pass


@receiver(post_save, sender=User)
def update_user_profile(sender, instance, **kwargs):
    """Mettre à jour le profil lors de la modification de l'utilisateur"""
    if not instance.is_active:
        # Désactiver les profils associés si l'utilisateur est désactivé
        pass


#@receiver(post_save, sender=User)
#def log_user_activity(sender, instance, **kwargs):
    """Logger l'activité de l'utilisateur"""
#    # En production, logger les actions importantes
#    if hasattr(instance, '_state') and instance._state.adding:
#        print(f"Nouvel utilisateur créé: {instance.phone} ({instance.role})")
#    else:
#        print(f"Utilisateur mis à jour: {instance.phone}")
