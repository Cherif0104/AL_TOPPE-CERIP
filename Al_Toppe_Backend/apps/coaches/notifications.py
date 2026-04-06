"""
Service de notifications pour les sessions de coaching
"""
import logging
from django.utils import timezone
from apps.alerts_ai.models import AlertType, Alert, Notification
from apps.coaches.models import CoachingSession, CoachAssignment

logger = logging.getLogger(__name__)


def notify_session_created(session):
    """
    Notifier le coach et l'entrepreneur quand une session est créée
    """
    notifications = []
    
    try:
        # Récupérer le coach et l'entrepreneur
        assignment = session.assignment
        if not assignment:
            logger.warning(f"⚠️ Session {session.id} sans assignation")
            return notifications
        
        coach_user = assignment.coach.user
        entrepreneur_user = assignment.entrepreneur.user
        
        # Récupérer ou créer le type d'alerte
        alert_type, _ = AlertType.objects.get_or_create(
            name='coaching_session_created',
            defaults={
                'category': 'operational',
                'description': 'Nouvelle session de coaching créée',
                'is_active': True
            }
        )
        
        # Notification pour le coach
        try:
            alert_coach = Alert.objects.create(
                alert_type=alert_type,
                target_user=coach_user,
                severity='low',
                status='new',
                title=f'📅 Nouvelle session planifiée',
                description=f'Session de coaching planifiée avec {assignment.entrepreneur.full_name} le {session.scheduled_date.strftime("%d/%m/%Y à %H:%M")}.',
                related_entity_type='coaching_session',
                related_entity_id=session.id,
                context_data={
                    'session_id': str(session.id),
                    'entrepreneur_id': str(assignment.entrepreneur.id),
                    'entrepreneur_name': assignment.entrepreneur.full_name,
                    'scheduled_date': session.scheduled_date.isoformat() if session.scheduled_date else None,
                    'session_type': session.session_type,
                }
            )
            
            notification_coach = Notification.objects.create(
                alert=alert_coach,
                notification_type='in_app',
                title=f'📅 Nouvelle session planifiée',
                message=f'Session avec {assignment.entrepreneur.full_name} le {session.scheduled_date.strftime("%d/%m/%Y à %H:%M") if session.scheduled_date else "date à définir"}.',
                action_url=f'/sessions/{session.id}/',
                action_text='Voir la session',
                recipient=coach_user,
                delivery_status='pending'
            )
            notifications.append(notification_coach)
            logger.info(f"✅ Notification créée pour coach: Session {session.id} → {coach_user.phone}")
        except Exception as e:
            logger.error(f"❌ Erreur notification coach: {e}", exc_info=True)
        
        # Notification pour l'entrepreneur
        try:
            alert_entrepreneur = Alert.objects.create(
                alert_type=alert_type,
                target_user=entrepreneur_user,
                severity='low',
                status='new',
                title=f'📅 Session de coaching planifiée',
                description=f'Une session de coaching a été planifiée avec votre coach le {session.scheduled_date.strftime("%d/%m/%Y à %H:%M") if session.scheduled_date else "date à définir"}.',
                related_entity_type='coaching_session',
                related_entity_id=session.id,
                context_data={
                    'session_id': str(session.id),
                    'coach_id': str(assignment.coach.id),
                    'scheduled_date': session.scheduled_date.isoformat() if session.scheduled_date else None,
                    'session_type': session.session_type,
                }
            )
            
            notification_entrepreneur = Notification.objects.create(
                alert=alert_entrepreneur,
                notification_type='in_app',
                title=f'📅 Session de coaching planifiée',
                message=f'Session avec votre coach le {session.scheduled_date.strftime("%d/%m/%Y à %H:%M") if session.scheduled_date else "date à définir"}.',
                action_url=f'/sessions/{session.id}/',
                action_text='Voir la session',
                recipient=entrepreneur_user,
                delivery_status='pending'
            )
            notifications.append(notification_entrepreneur)
            logger.info(f"✅ Notification créée pour entrepreneur: Session {session.id} → {entrepreneur_user.phone}")
        except Exception as e:
            logger.error(f"❌ Erreur notification entrepreneur: {e}", exc_info=True)
        
        return notifications
        
    except Exception as e:
        logger.error(f"❌ Erreur notification session créée: {e}", exc_info=True)
        return notifications
