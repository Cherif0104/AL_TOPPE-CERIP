from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User


def _ensure_role_profile(user: User) -> None:
    """
    Assure la création du profil métier associé au rôle utilisateur.
    """
    role = getattr(user, 'role', None)
    if role == 'entrepreneur':
        from apps.entrepreneurs.models import Entrepreneur

        Entrepreneur.objects.get_or_create(
            user=user,
            defaults={
                'first_name': 'Prénom',
                'last_name': 'Nom',
                'civility': 'M',
                'address': 'À compléter',
                'whatsapp': user.phone,
            },
        )
    elif role == 'coach':
        from apps.coaches.models import Coach

        Coach.objects.get_or_create(
            user=user,
            defaults={
                'organization': 'Organisation à compléter',
                'specialization': 'general',
            },
        )
    elif role == 'bailleur':
        from apps.bailleurs.models import Bailleur

        Bailleur.objects.get_or_create(
            user=user,
            defaults={
                'organization_name': 'Organisation à compléter',
                'organization_type': 'ong',
            },
        )


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Créer automatiquement le profil correspondant lors de la création d'un utilisateur"""
    if created:
        _ensure_role_profile(instance)


@receiver(post_save, sender=User)
def update_user_profile(sender, instance, **kwargs):
    """Mettre à jour le profil lors de la modification de l'utilisateur"""
    _ensure_role_profile(instance)
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
