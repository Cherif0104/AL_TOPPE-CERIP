#!/usr/bin/env python3
"""
📱 MODULE ALERTS & IA - SIGNAUX
================================

Gestion des signaux Django pour automatiser les actions
et maintenir la cohérence des données
"""

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.utils import timezone
from .models import Alert, Notification, AIAnalysis, Recommendation


@receiver(post_save, sender=Alert)
def alert_created_updated(sender, instance, created, **kwargs):
    """Signal déclenché lors de la création/modification d'une alerte"""
    if created:
        print(f"🚨 Nouvelle alerte créée: {instance.title}")
        print(f"   Type: {instance.alert_type.name}")
        print(f"   Sévérité: {instance.get_severity_display()}")
        print(f"   Utilisateur: {instance.target_user.phone}")
        print(f"   Confiance IA: {instance.ai_confidence}%")
        
        # Créer automatiquement une notification dans l'application
        if instance.status == 'new':
            Notification.objects.create(
                alert=instance,
                notification_type='in_app',
                title=instance.title,
                message=instance.description,
                recipient=instance.target_user
            )
            print(f"   📱 Notification créée automatiquement")
    else:
        print(f"📝 Alerte mise à jour: {instance.title}")
        print(f"   Nouveau statut: {instance.get_status_display()}")
        
        # Mettre à jour les notifications existantes
        if instance.status in ['acknowledged', 'resolved', 'dismissed']:
            notifications = Notification.objects.filter(alert=instance)
            for notification in notifications:
                if instance.status == 'acknowledged':
                    notification.delivery_status = 'delivered'
                    notification.delivered_at = timezone.now()
                    notification.save()
                    print(f"   ✅ Notification marquée comme livrée")
                elif instance.status == 'resolved':
                    notification.action_text = "Voir la résolution"
                    notification.save()
                    print(f"   🔧 Notification mise à jour avec action")


@receiver(post_save, sender=Notification)
def notification_created_updated(sender, instance, created, **kwargs):
    """Signal déclenché lors de la création/modification d'une notification"""
    if created:
        print(f"📱 Nouvelle notification créée:")
        print(f"   Type: {instance.get_notification_type_display()}")
        print(f"   Destinataire: {instance.recipient.phone}")
        print(f"   Titre: {instance.title}")
        
        # Simuler l'envoi selon le type
        if instance.notification_type == 'sms':
            print(f"   📲 Envoi SMS simulé à {instance.recipient.phone}")
            instance.mark_as_sent()
        elif instance.notification_type == 'push':
            print(f"   🔔 Notification push envoyée")
            instance.mark_as_sent()
        elif instance.notification_type == 'email':
            print(f"   📧 Email envoyé à {instance.recipient.phone}")
            instance.mark_as_sent()
    else:
        print(f"📝 Notification mise à jour: {instance.title}")
        print(f"   Nouveau statut: {instance.get_delivery_status_display()}")


@receiver(post_save, sender=AIAnalysis)
def ai_analysis_created_updated(sender, instance, created, **kwargs):
    """Signal déclenché lors de la création/modification d'une analyse IA"""
    if created:
        print(f"🤖 Nouvelle analyse IA créée:")
        print(f"   Type: {instance.get_analysis_type_display()}")
        print(f"   Modèle: {instance.ai_model.name}")
        print(f"   Utilisateur: {instance.target_user.phone}")
        print(f"   Score de confiance: {instance.confidence_score}%")
        
        # Vérifier si l'analyse a réussi
        if instance.is_successful and instance.confidence_score >= 80:
            print(f"   ✅ Analyse réussie avec haute confiance")
        elif instance.is_successful:
            print(f"   ⚠️ Analyse réussie mais confiance modérée")
        else:
            print(f"   ❌ Analyse échouée: {instance.error_message}")
    else:
        print(f"📝 Analyse IA mise à jour: {instance.get_analysis_type_display()}")
        if instance.completed_at:
            print(f"   Terminée le: {instance.completed_at}")
            print(f"   Temps de traitement: {instance.processing_time_ms}ms")


@receiver(post_save, sender=Recommendation)
def recommendation_created_updated(sender, instance, created, **kwargs):
    """Signal déclenché lors de la création/modification d'une recommandation"""
    if created:
        print(f"💡 Nouvelle recommandation créée:")
        print(f"   Titre: {instance.title}")
        print(f"   Type: {instance.get_recommendation_type_display()}")
        print(f"   Priorité: {instance.get_priority_display()}")
        print(f"   Utilisateur: {instance.target_user.phone}")
        print(f"   Confiance: {instance.confidence_score}%")
        
        # Créer automatiquement une alerte pour les recommandations urgentes
        if instance.priority == 'urgent':
            from .models import AlertType, Alert
            try:
                alert_type = AlertType.objects.get(category='opportunity')
                Alert.objects.create(
                    title=f"Recommandation urgente: {instance.title}",
                    description=f"Une recommandation urgente nécessite votre attention: {instance.description}",
                    alert_type=alert_type,
                    severity='high',
                    target_user=instance.target_user,
                    related_entity_type='recommendation',
                    related_entity_id=instance.id,
                    context_data={'recommendation_id': str(instance.id)},
                    ai_confidence=instance.confidence_score,
                    ai_reasoning=f"Recommandation générée automatiquement avec priorité urgente"
                )
                print(f"   🚨 Alerte urgente créée automatiquement")
            except AlertType.DoesNotExist:
                print(f"   ⚠️ Type d'alerte 'opportunity' non trouvé")
    else:
        print(f"📝 Recommandation mise à jour: {instance.title}")
        if instance.is_implemented:
            print(f"   ✅ Marquée comme implémentée")
            print(f"   Notes: {instance.implementation_notes}")


@receiver(post_delete, sender=Alert)
def alert_deleted(sender, instance, **kwargs):
    """Signal déclenché lors de la suppression d'une alerte"""
    print(f"🗑️ Alerte supprimée: {instance.title}")
    print(f"   Type: {instance.alert_type.name}")
    print(f"   Utilisateur: {instance.target_user.phone}")


@receiver(post_delete, sender=Notification)
def notification_deleted(sender, instance, **kwargs):
    """Signal déclenché lors de la suppression d'une notification"""
    print(f"🗑️ Notification supprimée: {instance.title}")
    print(f"   Type: {instance.get_notification_type_display()}")
    print(f"   Destinataire: {instance.recipient.phone}")


@receiver(post_delete, sender=AIAnalysis)
def ai_analysis_deleted(sender, instance, **kwargs):
    """Signal déclenché lors de la suppression d'une analyse IA"""
    print(f"🗑️ Analyse IA supprimée: {instance.get_analysis_type_display()}")
    print(f"   Modèle: {instance.ai_model.name}")
    print(f"   Utilisateur: {instance.target_user.phone}")


@receiver(post_delete, sender=Recommendation)
def recommendation_deleted(sender, instance, **kwargs):
    """Signal déclenché lors de la suppression d'une recommandation"""
    print(f"🗑️ Recommandation supprimée: {instance.title}")
    print(f"   Type: {instance.get_recommendation_type_display()}")
    print(f"   Utilisateur: {instance.target_user.phone}")


# Signaux pour la maintenance automatique
@receiver(post_save, sender=Alert)
def auto_escalate_critical_alerts(sender, instance, created, **kwargs):
    """Escalade automatique des alertes critiques non traitées"""
    if created and instance.severity == 'critical':
        # Vérifier si l'alerte n'est pas traitée dans les 2 heures
        from django.utils import timezone
        from datetime import timedelta
        
        escalation_time = instance.triggered_at + timedelta(hours=2)
        if timezone.now() > escalation_time and instance.status == 'new':
            print(f"🚨 ESCALADE AUTOMATIQUE: Alerte critique non traitée")
            print(f"   Alerte: {instance.title}")
            print(f"   Utilisateur: {instance.target_user.phone}")
            print(f"   Temps écoulé: Plus de 2 heures")
            
            # Marquer comme escaladée
            instance.status = 'escalated'
            instance.save()
            print(f"   ✅ Statut mis à jour: Escaladée")


@receiver(post_save, sender=Notification)
def auto_retry_failed_notifications(sender, instance, created, **kwargs):
    """Nouvelle tentative automatique pour les notifications échouées"""
    if not created and instance.delivery_status == 'failed':
        # Vérifier si c'est la première tentative d'échec
        if not hasattr(instance, '_retry_count'):
            instance._retry_count = 0
        
        if instance._retry_count < 3:
            instance._retry_count += 1
            print(f"🔄 Nouvelle tentative de notification (tentative {instance._retry_count}/3)")
            print(f"   Notification: {instance.title}")
            print(f"   Destinataire: {instance.recipient.phone}")
            
            # Simuler une nouvelle tentative
            if instance.notification_type == 'sms':
                print(f"   📲 Nouvelle tentative SMS...")
                # Ici, on pourrait implémenter la logique de retry
            elif instance.notification_type == 'push':
                print(f"   🔔 Nouvelle tentative push...")
            
            # Réinitialiser le statut pour une nouvelle tentative
            instance.delivery_status = 'pending'
            instance.delivery_error = ''
            instance.save()
        else:
            print(f"❌ Nombre maximum de tentatives atteint pour: {instance.title}")
            print(f"   Destinataire: {instance.recipient.phone}")
            print(f"   Erreur finale: {instance.delivery_error}")
