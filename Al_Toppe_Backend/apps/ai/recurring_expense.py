"""
Service de détection et rappel de dépenses récurrentes avec Gemini
Analyse les patterns de dépenses et génère des rappels intelligents
"""
import os
import json
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from django.utils import timezone
from collections import defaultdict
import google.generativeai as genai

from apps.finances.models import CashflowEntry, Category
from apps.entrepreneurs.models import Entrepreneur
from apps.alerts_ai.models import Alert, AlertType

logger = logging.getLogger(__name__)

# Configuration Gemini
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-1.5-flash')

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


class RecurringExpenseService:
    """Service de détection de dépenses récurrentes et rappels IA"""
    
    def __init__(self):
        """Initialiser le service"""
        if not GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY non configurée")
        
        self.model = genai.GenerativeModel(GEMINI_MODEL)
        logger.info(f"✅ RecurringExpenseService initialisé (modèle: {GEMINI_MODEL})")
    
    def detect_recurring_expenses(
        self,
        entrepreneur: Entrepreneur,
        lookback_days: int = 90
    ) -> Dict[str, Any]:
        """
        Détecter les dépenses récurrentes d'un entrepreneur
        
        Args:
            entrepreneur: L'entrepreneur à analyser
            lookback_days: Période d'analyse en jours (défaut: 90)
        
        Returns:
            Dict avec dépenses récurrentes détectées et rappels
        """
        try:
            start_time = timezone.now()
            
            logger.info(f"🔍 Détection dépenses récurrentes pour {entrepreneur.user.get_full_name()} ({lookback_days}j)")
            
            # 1️⃣ COLLECTER LES DONNÉES
            end_date = timezone.now().date()
            start_date = end_date - timedelta(days=lookback_days)
            
            expenses = CashflowEntry.objects.filter(
                entrepreneur=entrepreneur,
                type='expense',
                date__gte=start_date,
                date__lte=end_date
            ).select_related('category').order_by('date')
            
            if expenses.count() < 3:
                return {
                    'success': False,
                    'error': 'Pas assez de données',
                    'message': f'Au moins 3 dépenses nécessaires (actuellement: {expenses.count()})'
                }
            
            # 2️⃣ GROUPER LES DÉPENSES PAR CATÉGORIE
            expenses_by_category = defaultdict(list)
            
            for expense in expenses:
                cat_name = expense.category.name if expense.category else 'divers'
                expenses_by_category[cat_name].append({
                    'date': expense.date.isoformat(),
                    'amount': float(expense.amount),
                    'title': expense.title,
                    'description': expense.description or ''
                })
            
            # 3️⃣ PRÉPARER LES DONNÉES POUR GEMINI
            expense_patterns = {}
            
            for category, items in expenses_by_category.items():
                if len(items) >= 2:  # Au moins 2 occurrences
                    expense_patterns[category] = {
                        'count': len(items),
                        'total_amount': sum(item['amount'] for item in items),
                        'average_amount': sum(item['amount'] for item in items) / len(items),
                        'items': items
                    }
            
            if not expense_patterns:
                return {
                    'success': False,
                    'error': 'Aucun pattern détecté',
                    'message': 'Pas de dépenses récurrentes identifiées'
                }
            
            # 4️⃣ CONSTRUIRE LE PROMPT GEMINI
            prompt = self._build_detection_prompt(
                entrepreneur=entrepreneur,
                expense_patterns=expense_patterns,
                lookback_days=lookback_days
            )
            
            # 5️⃣ APPELER GEMINI
            logger.info(f"🔮 Appel Gemini pour détection patterns...")
            response = self.model.generate_content(
                prompt,
                generation_config={
                    'temperature': 0.3,
                    'max_output_tokens': 3000,  # Augmenté de 2000 à 3000
                }
            )
            
            # 6️⃣ PARSER LA RÉPONSE
            recurring_data = self._parse_recurring_response(response.text)
            
            # 7️⃣ CRÉER LES ALERTES/RAPPELS
            created_alerts = []
            
            for recurring in recurring_data.get('recurring_expenses', []):
                if recurring.get('is_recurring', False):
                    alert = self._create_reminder_alert(
                        entrepreneur=entrepreneur,
                        recurring_expense=recurring
                    )
                    if alert:
                        created_alerts.append(alert)
            
            processing_time = int((timezone.now() - start_time).total_seconds() * 1000)
            
            logger.info(f"✅ Détection terminée: {len(recurring_data.get('recurring_expenses', []))} patterns trouvés")
            logger.info(f"📢 {len(created_alerts)} alertes créées")
            logger.info(f"💰 Coût estimé: ~$0.00099")
            
            return {
                'success': True,
                'recurring_expenses': recurring_data.get('recurring_expenses', []),
                'total_monthly_estimate': recurring_data.get('total_monthly_estimate', 0),
                'alerts_created': len(created_alerts),
                'processing_time_ms': processing_time
            }
            
        except Exception as e:
            logger.error(f"❌ Erreur détection récurrence: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e)
            }
    
    def _build_detection_prompt(
        self,
        entrepreneur: Entrepreneur,
        expense_patterns: Dict[str, Any],
        lookback_days: int
    ) -> str:
        """Construire le prompt pour Gemini"""
        
        prompt = f"""Tu es un expert en analyse financière pour entrepreneurs africains.

Analyse ces dépenses et détecte les patterns récurrents (loyer, salaires, abonnements, etc.).

═══════════════════════════════════════════
CONTEXTE
═══════════════════════════════════════════
Entrepreneur: {entrepreneur.user.get_full_name()}
Période: {lookback_days} jours
Nombre de catégories: {len(expense_patterns)}

═══════════════════════════════════════════
DONNÉES DÉPENSES
═══════════════════════════════════════════
{json.dumps(expense_patterns, indent=2, ensure_ascii=False)}

═══════════════════════════════════════════
ANALYSE DEMANDÉE
═══════════════════════════════════════════

Génère une analyse JSON avec cette structure EXACTE :

{{
  "recurring_expenses": [
    {{
      "category": "<catégorie>",
      "is_recurring": <true/false>,
      "frequency": "<monthly/weekly/biweekly/quarterly/yearly/irregular>",
      "average_amount": <montant FCFA>,
      "confidence": <score 0-100>,
      "pattern_description": "<description du pattern détecté>",
      "next_expected_date": "<YYYY-MM-DD>",
      "reminder_message": "<message de rappel personnalisé en français>",
      "recommendations": ["<recommandation courte 1>", "<recommandation courte 2>"]
    }}
  ],
  "total_monthly_estimate": <total FCFA/mois>,
  "insights": [
    "<insight 1>",
    "<insight 2>"
  ]
}}

RÈGLES :
1. Ne marque "is_recurring: true" QUE si tu détectes un vrai pattern régulier
2. Calcule "next_expected_date" basé sur le pattern
3. "reminder_message" doit être personnalisé et contextualisé (max 1 phrase)
4. Donne 2 recommandations COURTES maximum (1 ligne chacune)
5. Sois conservateur sur "confidence" (ne dépasse pas 95%)
6. Adapte au contexte sénégalais
7. Réponds UNIQUEMENT en JSON valide (pas de markdown)
8. Garde les réponses CONCISES pour éviter la troncature
"""
        return prompt
    
    def _parse_recurring_response(self, response_text: str) -> Dict[str, Any]:
        """Parser la réponse JSON de Gemini"""
        try:
            # Nettoyer la réponse
            cleaned = response_text.strip()
            if cleaned.startswith('```json'):
                cleaned = cleaned[7:]
            if cleaned.startswith('```'):
                cleaned = cleaned[3:]
            if cleaned.endswith('```'):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
            
            # Parser le JSON
            result = json.loads(cleaned)
            
            # Valider la structure
            result.setdefault('recurring_expenses', [])
            result.setdefault('total_monthly_estimate', 0)
            result.setdefault('insights', [])
            
            return result
            
        except json.JSONDecodeError as e:
            logger.error(f"❌ Erreur parsing JSON: {e}\nRéponse: {response_text[:500]}")
            return {
                'recurring_expenses': [],
                'total_monthly_estimate': 0,
                'insights': [],
                'error': 'JSON parsing failed'
            }
    
    def _create_reminder_alert(
        self,
        entrepreneur: Entrepreneur,
        recurring_expense: Dict[str, Any]
    ) -> Optional[Alert]:
        """Créer une alerte de rappel pour une dépense récurrente"""
        try:
            # Vérifier si une alerte similaire existe déjà (dernière semaine)
            one_week_ago = timezone.now() - timedelta(days=7)
            existing = Alert.objects.filter(
                target_user=entrepreneur.user,
                alert_type__name__icontains=recurring_expense.get('category', ''),
                triggered_at__gte=one_week_ago
            ).exists()
            
            if existing:
                logger.info(f"⏭️ Alerte déjà existante pour {recurring_expense.get('category')}")
                return None
            
            # Récupérer ou créer l'AlertType
            alert_type, _ = AlertType.objects.get_or_create(
                name=f"rappel_depense_{recurring_expense.get('category', 'divers')}",
                defaults={
                    'category': 'financial',
                    'description': f"Rappel de dépense récurrente : {recurring_expense.get('category')}",
                    'severity_levels': ['low'],
                    'is_active': True
                }
            )
            
            # Créer l'alerte
            alert = Alert.objects.create(
                alert_type=alert_type,
                target_user=entrepreneur.user,
                severity='low',
                status='new',
                title=f"Rappel : {recurring_expense.get('category', 'Dépense récurrente')}",
                description=recurring_expense.get('reminder_message', 
                    f"N'oubliez pas votre dépense : {recurring_expense.get('category')}"),
                context_data={
                    'category': recurring_expense.get('category'),
                    'average_amount': recurring_expense.get('average_amount'),
                    'frequency': recurring_expense.get('frequency'),
                    'next_expected_date': recurring_expense.get('next_expected_date'),
                    'confidence': recurring_expense.get('confidence'),
                    'recommendations': recurring_expense.get('recommendations', [])
                },
                ai_confidence=recurring_expense.get('confidence', 85)
            )
            
            logger.info(f"✅ Alerte créée: {alert.title}")
            return alert
            
        except Exception as e:
            logger.error(f"❌ Erreur création alerte: {e}", exc_info=True)
            return None


# Instance globale (singleton)
_recurring_expense_service = None

def get_recurring_expense_service() -> RecurringExpenseService:
    """Obtenir l'instance du service (singleton)"""
    global _recurring_expense_service
    if _recurring_expense_service is None:
        _recurring_expense_service = RecurringExpenseService()
    return _recurring_expense_service

