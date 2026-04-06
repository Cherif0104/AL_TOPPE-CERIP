# apps/ai/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.alerts_ai.models import AIAnalysis, Alert
from apps.finances.models import CashflowEntry

@receiver(post_save, sender=CashflowEntry)
def analyze_financial_pattern(sender, instance, created, **kwargs):
    """Analyser les patterns financiers après chaque nouvelle entrée"""
    return None
    # if created:
    #     # # Lancer une analyse IA asynchrone
    #     AIAnalysis.objects.create(
    #         analysis_type='financial_health',
    #         target_user=instance.entrepreneur.user,
    #         related_entity_type='cashflow_entry',
    #         related_entity_id=instance.id,
    #         input_data={
    #             'amount': float(instance.amount),
    #             'type': instance.type,
    #             'category': instance.category.name,
    #             'date': instance.date.isoformat(),
    #             'confidence_score': "4"
    #         }
    #     )
