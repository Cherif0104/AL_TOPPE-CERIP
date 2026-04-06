"""
Service de notifications pour les plans d'affaires
"""
import logging
from django.utils import timezone
from apps.alerts_ai.models import AlertType, Alert, Notification
from apps.entrepreneurs.models import Entrepreneur
from apps.coaches.models import CoachAssignment

logger = logging.getLogger(__name__)


def notify_business_plan_approved(business_plan):
    """
    Notifier l'entrepreneur quand son plan d'affaires est approuvé
    """
    try:
        entrepreneur = business_plan.entrepreneur
        user = entrepreneur.user
        
        # Récupérer ou créer le type d'alerte
        alert_type, _ = AlertType.objects.get_or_create(
            name='business_plan_approved',
            defaults={
                'category': 'operational',
                'description': 'Plan d\'affaires approuvé',
                'is_active': True
            }
        )
        
        # Créer l'alerte
        alert = Alert.objects.create(
            alert_type=alert_type,
            target_user=user,
            severity='medium',
            status='new',
            title=f'✅ Plan d\'affaires approuvé : {business_plan.title}',
            description=f'Félicitations ! Votre plan d\'affaires "{business_plan.title}" a été approuvé par votre coach.',
            related_entity_type='business_plan',
            related_entity_id=business_plan.id,
            context_data={
                'business_plan_id': str(business_plan.id),
                'business_plan_title': business_plan.title,
                'status': business_plan.status,
                'validated_by': business_plan.validated_by.phone if business_plan.validated_by else None,
            }
        )
        
        # Créer la notification
        notification = Notification.objects.create(
            alert=alert,
            notification_type='in_app',
            title=f'✅ Plan d\'affaires approuvé',
            message=f'Votre plan d\'affaires "{business_plan.title}" a été approuvé.',
            action_url=f'/business-plans/{business_plan.id}/',
            action_text='Voir le plan',
            recipient=user,
            delivery_status='pending'
        )
        
        logger.info(f"✅ Notification créée pour plan approuvé: {business_plan.id} → {user.phone}")
        return notification
        
    except Exception as e:
        logger.error(f"❌ Erreur notification plan approuvé: {e}", exc_info=True)
        return None


def notify_business_plan_created(business_plan):
    """
    Notifier le coach quand un entrepreneur crée un plan d'affaires
    """
    try:
        entrepreneur = business_plan.entrepreneur
        
        # Récupérer le coach assigné à l'entrepreneur
        assignment = CoachAssignment.objects.filter(
            entrepreneur=entrepreneur,
            status='active'
        ).select_related('coach', 'coach__user').first()
        
        if not assignment or not assignment.coach:
            logger.warning(f"⚠️ Aucun coach assigné pour entrepreneur {entrepreneur.id}")
            return None
        
        coach_user = assignment.coach.user
        
        # Récupérer ou créer le type d'alerte
        alert_type, _ = AlertType.objects.get_or_create(
            name='business_plan_created',
            defaults={
                'category': 'operational',
                'description': 'Nouveau plan d\'affaires créé',
                'is_active': True
            }
        )
        
        # Créer l'alerte
        alert = Alert.objects.create(
            alert_type=alert_type,
            target_user=coach_user,
            severity='low',
            status='new',
            title=f'📄 Nouveau plan d\'affaires : {business_plan.title}',
            description=f'{entrepreneur.full_name} a créé un nouveau plan d\'affaires "{business_plan.title}" qui nécessite votre révision.',
            related_entity_type='business_plan',
            related_entity_id=business_plan.id,
            context_data={
                'business_plan_id': str(business_plan.id),
                'business_plan_title': business_plan.title,
                'entrepreneur_id': str(entrepreneur.id),
                'entrepreneur_name': entrepreneur.full_name,
                'status': business_plan.status,
            }
        )
        
        # Créer la notification
        notification = Notification.objects.create(
            alert=alert,
            notification_type='in_app',
            title=f'📄 Nouveau plan d\'affaires',
            message=f'{entrepreneur.full_name} a créé un nouveau plan d\'affaires "{business_plan.title}".',
            action_url=f'/business-plans/{business_plan.id}/',
            action_text='Voir le plan',
            recipient=coach_user,
            delivery_status='pending'
        )
        
        logger.info(f"✅ Notification créée pour nouveau plan: {business_plan.id} → Coach {coach_user.phone}")
        return notification
        
    except Exception as e:
        logger.error(f"❌ Erreur notification plan créé: {e}", exc_info=True)
        return None


def notify_business_plan_submitted(business_plan):
    """
    Notifier le coach quand un entrepreneur soumet un plan d'affaires
    """
    try:
        entrepreneur = business_plan.entrepreneur
        
        # Récupérer le coach assigné à l'entrepreneur
        assignment = CoachAssignment.objects.filter(
            entrepreneur=entrepreneur,
            status='active'
        ).select_related('coach', 'coach__user').first()
        
        if not assignment or not assignment.coach:
            logger.warning(f"⚠️ Aucun coach assigné pour entrepreneur {entrepreneur.id}")
            return None
        
        coach_user = assignment.coach.user
        
        # Récupérer ou créer le type d'alerte
        alert_type, _ = AlertType.objects.get_or_create(
            name='business_plan_submitted',
            defaults={
                'category': 'operational',
                'description': 'Plan d\'affaires soumis pour validation',
                'is_active': True
            }
        )
        
        # Créer l'alerte
        alert = Alert.objects.create(
            alert_type=alert_type,
            target_user=coach_user,
            severity='medium',
            status='new',
            title=f'📤 Plan d\'affaires soumis : {business_plan.title}',
            description=f'{entrepreneur.full_name} a soumis son plan d\'affaires "{business_plan.title}" pour validation.',
            related_entity_type='business_plan',
            related_entity_id=business_plan.id,
            context_data={
                'business_plan_id': str(business_plan.id),
                'business_plan_title': business_plan.title,
                'entrepreneur_id': str(entrepreneur.id),
                'entrepreneur_name': entrepreneur.full_name,
                'status': business_plan.status,
            }
        )
        
        # Créer la notification
        notification = Notification.objects.create(
            alert=alert,
            notification_type='in_app',
            title=f'📤 Plan d\'affaires soumis',
            message=f'{entrepreneur.full_name} a soumis son plan d\'affaires "{business_plan.title}" pour validation.',
            action_url=f'/business-plans/{business_plan.id}/',
            action_text='Réviser le plan',
            recipient=coach_user,
            delivery_status='pending'
        )
        
        logger.info(f"✅ Notification créée pour plan soumis: {business_plan.id} → Coach {coach_user.phone}")
        return notification
        
    except Exception as e:
        logger.error(f"❌ Erreur notification plan soumis: {e}", exc_info=True)
        return None
