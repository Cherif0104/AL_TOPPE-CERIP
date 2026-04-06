from apps.alerts_ai.models import Alert, AlertType
from apps.finances.models import CashflowEntry
from django.db import models



def trigger_expense_revenue_alert(entrepreneur, user):
    """Déclenche une alerte si les dépenses dépassent les revenus pour un utilisateur"""
    revenus = CashflowEntry.objects.filter(entrepreneur=entrepreneur, type="income").aggregate(total=models.Sum("amount"))["total"] or 0
    depenses = CashflowEntry.objects.filter(entrepreneur=entrepreneur, type="expense").aggregate(total=models.Sum("amount"))["total"] or 0

    if depenses > revenus:  
        severity = "high"
        description = f"⚠️ Dépenses ({depenses} FCFA) dépassent les revenus ({revenus} FCFA)"
    else:
        severity = "low"
        description = f"✅ Revenus ({revenus} FCFA) couvrent encore les dépenses ({depenses} FCFA)"

    alert_type, _ = AlertType.objects.get_or_create(name="dépenses/revenus")

    alert = Alert.objects.create(
        alert_type=alert_type,
        title="Surveillance Revenus/Dépenses",
        description=description,
        severity=severity,
        status="new",
        target_user=user
    )
    return alert
