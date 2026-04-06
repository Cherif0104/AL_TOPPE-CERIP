"""
Service d'analyse financière avec Gemini
Analyse la santé financière des entrepreneurs en continu
"""
import os
import json
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from django.utils import timezone
from django.db import transaction as db_transaction
import google.generativeai as genai

from apps.finances.models import CashflowEntry, Category
from apps.entrepreneurs.models import Entrepreneur
from apps.alerts_ai.models import AIAnalysis, Alert, AlertType, Recommendation, AIModel

logger = logging.getLogger(__name__)

# Configuration Gemini
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-1.5-flash')

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


class FinancialAnalysisService:
    """Service d'analyse financière avec IA Gemini"""
    
    def __init__(self):
        """Initialiser le service"""
        if not GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY non configurée")
        
        self.model = genai.GenerativeModel(GEMINI_MODEL)
        logger.info(f"✅ FinancialAnalysisService initialisé (modèle: {GEMINI_MODEL})")
    
    def _get_or_create_ai_model(self) -> AIModel:
        """Obtenir ou créer le modèle IA Gemini"""
        ai_model, created = AIModel.objects.get_or_create(
            name='Google Gemini',
            defaults={
                'model_type': 'nlp',
                'provider': 'google',
                'model_version': GEMINI_MODEL,
                'is_active': True,
                'parameters': {
                    'temperature': 0.3,
                    'max_tokens': 4096
                }
            }
        )
        if created:
            logger.info("✅ AIModel 'Google Gemini' créé")
        return ai_model
    
    def analyze_financial_health(
        self, 
        entrepreneur: Entrepreneur, 
        period_days: int = 30
    ) -> Dict[str, Any]:
        """
        Analyser la santé financière d'un entrepreneur
        
        Args:
            entrepreneur: L'entrepreneur à analyser
            period_days: Période d'analyse en jours (défaut: 30)
        
        Returns:
            Dict avec analyse complète
        """
        try:
            start_time = timezone.now()
            
            # 1️⃣ COLLECTER LES DONNÉES
            logger.info(f"📊 Analyse financière pour {entrepreneur.user.get_full_name()} ({period_days}j)")
            
            end_date = timezone.now().date()
            start_date = end_date - timedelta(days=period_days)
            
            # Récupérer les entrées de trésorerie
            cashflows = CashflowEntry.objects.filter(
                entrepreneur=entrepreneur,
                date__gte=start_date,
                date__lte=end_date
            ).select_related('category').order_by('date')
            
            if cashflows.count() < 5:
                return {
                    'success': False,
                    'error': 'Pas assez de données',
                    'message': f'Au moins 5 entrées nécessaires (actuellement: {cashflows.count()})'
                }
            
            # Calculer les métriques
            total_income = sum(float(cf.amount) for cf in cashflows if cf.type == 'income')
            total_expense = sum(float(cf.amount) for cf in cashflows if cf.type == 'expense')
            balance = total_income - total_expense
            
            # Grouper par catégorie
            income_by_category = {}
            expense_by_category = {}
            
            for cf in cashflows:
                cat_name = cf.category.name if cf.category else 'divers'
                if cf.type == 'income':
                    income_by_category[cat_name] = income_by_category.get(cat_name, 0) + float(cf.amount)
                else:
                    expense_by_category[cat_name] = expense_by_category.get(cat_name, 0) + float(cf.amount)
            
            # 2️⃣ CONSTRUIRE LE PROMPT GEMINI
            prompt = self._build_analysis_prompt(
                entrepreneur=entrepreneur,
                period_days=period_days,
                total_income=total_income,
                total_expense=total_expense,
                balance=balance,
                income_by_category=income_by_category,
                expense_by_category=expense_by_category,
                num_entries=cashflows.count()
            )
            
            # 3️⃣ APPELER GEMINI
            logger.info(f"🔮 Appel Gemini pour analyse financière...")
            response = self.model.generate_content(
                prompt,
                generation_config={
                    'temperature': 0.3,
                    'max_output_tokens': 2500,  # Augmenté de 1500 à 2500
                }
            )
            
            # 4️⃣ PARSER LA RÉPONSE
            analysis_result = self._parse_analysis_response(response.text)
            
            # 5️⃣ SAUVEGARDER L'ANALYSE
            processing_time = int((timezone.now() - start_time).total_seconds() * 1000)
            
            # Obtenir le modèle IA
            ai_model = self._get_or_create_ai_model()
            
            ai_analysis = AIAnalysis.objects.create(
                analysis_type='financial_health',
                ai_model=ai_model,
                target_user=entrepreneur.user,
                related_entity_type='entrepreneur',
                related_entity_id=entrepreneur.id,
                input_data={
                    'period_days': period_days,
                    'total_income': total_income,
                    'total_expense': total_expense,
                    'balance': balance,
                },
                analysis_result=analysis_result,
                confidence_score=analysis_result.get('confidence_score', 85),
                processing_time_ms=processing_time,
                is_successful=True
            )
            
            # Marquer comme terminé
            ai_analysis.mark_as_completed(
                analysis_result, 
                analysis_result.get('confidence_score', 85),
                processing_time
            )
            
            logger.info(f"✅ Analyse terminée: Score santé = {analysis_result.get('health_score')}/100")
            logger.info(f"💰 Coût estimé: ~$0.00075")
            
            return {
                'success': True,
                'analysis_id': str(ai_analysis.id),
                'health_score': analysis_result.get('health_score'),
                'risk_level': analysis_result.get('risk_level'),
                'insights': analysis_result.get('insights', []),
                'recommendations': analysis_result.get('recommendations', []),
                'financial_indicators': analysis_result.get('financial_indicators', {}),
                'metrics': {
                    'total_income': total_income,
                    'total_expense': total_expense,
                    'balance': balance,
                    'profit_margin': round((balance / total_income * 100) if total_income > 0 else 0, 2)
                },
                'processing_time_ms': processing_time
            }
            
        except Exception as e:
            logger.error(f"❌ Erreur analyse financière: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e)
            }
    
    def _build_analysis_prompt(
        self,
        entrepreneur: Entrepreneur,
        period_days: int,
        total_income: float,
        total_expense: float,
        balance: float,
        income_by_category: Dict[str, float],
        expense_by_category: Dict[str, float],
        num_entries: int
    ) -> str:
        """Construire le prompt pour Gemini"""
        
        activity = entrepreneur.activities.first()
        sector = activity.sector if activity else 'Non défini'
        
        prompt = f"""Tu es un expert financier spécialisé dans l'accompagnement des entrepreneurs du secteur informel au Sénégal.

Analyse ce compte de résultat et génère un rapport détaillé.

═══════════════════════════════════════════
CONTEXTE ENTREPRENEUR
═══════════════════════════════════════════
Nom: {entrepreneur.user.get_full_name()}
Secteur d'activité: {sector}
Période analysée: {period_days} jours
Nombre d'opérations: {num_entries}

═══════════════════════════════════════════
DONNÉES FINANCIÈRES
═══════════════════════════════════════════
Revenus totaux: {total_income:,.0f} FCFA
Dépenses totales: {total_expense:,.0f} FCFA
Solde: {balance:,.0f} FCFA
Marge: {(balance / total_income * 100) if total_income > 0 else 0:.1f}%

Revenus par catégorie:
{self._format_categories(income_by_category)}

Dépenses par catégorie:
{self._format_categories(expense_by_category)}

═══════════════════════════════════════════
ANALYSE DEMANDÉE
═══════════════════════════════════════════

Génère une analyse JSON avec cette structure EXACTE :

{{
  "health_score": <score 0-100>,
  "risk_level": "<low/medium/high/critical>",
  "confidence_score": <score 0-100>,
  "insights": [
    {{
      "type": "<positive/warning/critical>",
      "title": "<titre court>",
      "description": "<explication 1-2 phrases>",
      "impact": "<impact attendu>"
    }}
  ],
  "recommendations": [
    {{
      "priority": "<low/medium/high/urgent>",
      "category": "<financial/operational/strategic>",
      "title": "<titre action>",
      "description": "<description courte>",
      "expected_benefit": "<bénéfice attendu>"
    }}
  ],
  "financial_indicators": {{
    "revenue_trend": "<growing/stable/declining>",
    "expense_control": "<good/moderate/poor>",
    "profitability": "<profitable/breakeven/loss>",
    "cash_flow_health": "<healthy/concerning/critical>"
  }}
}}

RÈGLES :
1. Sois précis et actionnable
2. Adapte au contexte sénégalais
3. 3 insights maximum
4. 3 recommandations maximum
5. Utilise les données fournies
6. Réponds UNIQUEMENT en JSON valide (pas de markdown)
"""
        return prompt
    
    def _format_categories(self, categories: Dict[str, float]) -> str:
        """Formater les catégories pour le prompt"""
        if not categories:
            return "  Aucune"
        
        lines = []
        for cat, amount in sorted(categories.items(), key=lambda x: x[1], reverse=True):
            lines.append(f"  - {cat}: {amount:,.0f} FCFA")
        return "\n".join(lines)
    
    def _parse_analysis_response(self, response_text: str) -> Dict[str, Any]:
        """Parser la réponse JSON de Gemini"""
        try:
            # Nettoyer la réponse (enlever markdown si présent)
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
            if 'health_score' not in result:
                result['health_score'] = 70
            if 'risk_level' not in result:
                result['risk_level'] = 'medium'
            if 'confidence_score' not in result:
                result['confidence_score'] = 85
            if 'insights' not in result:
                result['insights'] = []
            if 'recommendations' not in result:
                result['recommendations'] = []
            if 'financial_indicators' not in result:
                result['financial_indicators'] = {}
            
            return result
            
        except json.JSONDecodeError as e:
            logger.error(f"❌ Erreur parsing JSON: {e}\nRéponse: {response_text[:500]}")
            return {
                'health_score': 70,
                'risk_level': 'medium',
                'confidence_score': 50,
                'insights': [
                    {
                        'type': 'warning',
                        'title': 'Erreur d\'analyse',
                        'description': 'Impossible de parser la réponse IA',
                        'impact': 'Analyse manuelle recommandée'
                    }
                ],
                'recommendations': [],
                'financial_indicators': {},
                'error': 'JSON parsing failed'
            }


# Instance globale (singleton)
_financial_analysis_service = None

def get_financial_analysis_service() -> FinancialAnalysisService:
    """Obtenir l'instance du service (singleton)"""
    global _financial_analysis_service
    if _financial_analysis_service is None:
        _financial_analysis_service = FinancialAnalysisService()
    return _financial_analysis_service

