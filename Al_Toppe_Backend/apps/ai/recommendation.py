"""
Service de génération de recommandations IA avec Gemini
Génère des recommandations personnalisées basées sur les analyses financières
"""
import os
import json
import logging
from typing import Dict, List, Optional, Any
from django.utils import timezone
import google.generativeai as genai

from apps.entrepreneurs.models import Entrepreneur
from apps.alerts_ai.models import AIAnalysis, Recommendation

logger = logging.getLogger(__name__)

# Configuration Gemini
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-1.5-flash')

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


class RecommendationService:
    """Service de génération de recommandations IA"""
    
    def __init__(self):
        """Initialiser le service"""
        if not GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY non configurée")
        
        self.model = genai.GenerativeModel(GEMINI_MODEL)
        logger.info(f"✅ RecommendationService initialisé (modèle: {GEMINI_MODEL})")
    
    def generate_recommendations(
        self,
        entrepreneur: Entrepreneur,
        ai_analysis: AIAnalysis,
        num_recommendations: int = 5
    ) -> Dict[str, Any]:
        """
        Générer des recommandations basées sur une analyse IA
        
        Args:
            entrepreneur: L'entrepreneur
            ai_analysis: L'analyse financière source
            num_recommendations: Nombre de recommandations (défaut: 5)
        
        Returns:
            Dict avec recommandations générées
        """
        try:
            start_time = timezone.now()
            
            logger.info(f"🎯 Génération de {num_recommendations} recommandations pour {entrepreneur.user.get_full_name()}")
            
            # 1️⃣ CONSTRUIRE LE PROMPT
            prompt = self._build_recommendation_prompt(
                entrepreneur=entrepreneur,
                analysis_result=ai_analysis.analysis_result,
                num_recommendations=num_recommendations
            )
            
            # 2️⃣ APPELER GEMINI
            logger.info(f"🔮 Appel Gemini pour recommandations...")
            response = self.model.generate_content(
                prompt,
                generation_config={
                    'temperature': 0.5,
                    'max_output_tokens': 3500,  # Augmenté de 2000 à 3500
                }
            )
            
            # 3️⃣ PARSER LA RÉPONSE
            recommendations_data = self._parse_recommendations_response(response.text)
            
            # 4️⃣ SAUVEGARDER LES RECOMMANDATIONS
            created_recommendations = []
            
            for rec_data in recommendations_data:
                recommendation = Recommendation.objects.create(
                    title=rec_data.get('title', 'Recommandation'),
                    description=rec_data.get('description', ''),
                    recommendation_type=rec_data.get('category', 'financial'),
                    priority=rec_data.get('priority', 'medium'),
                    target_user=entrepreneur.user,
                    ai_analysis=ai_analysis,
                    action_items=rec_data.get('action_items', []),
                    expected_impact=rec_data.get('expected_impact', ''),
                    implementation_steps=rec_data.get('implementation_steps', []),
                    confidence_score=rec_data.get('confidence', 85),
                    is_implemented=False
                )
                created_recommendations.append(recommendation)
                logger.info(f"✅ Recommandation créée: {recommendation.title} (priorité: {recommendation.priority})")
            
            processing_time = int((timezone.now() - start_time).total_seconds() * 1000)
            logger.info(f"✅ {len(created_recommendations)} recommandations générées en {processing_time}ms")
            logger.info(f"💰 Coût estimé: ~$0.00099")
            
            return {
                'success': True,
                'count': len(created_recommendations),
                'recommendations': [
                    {
                        'id': str(rec.id),
                        'title': rec.title,
                        'priority': rec.priority,
                        'category': rec.recommendation_type,
                        'description': rec.description,
                        'expected_impact': rec.expected_impact
                    }
                    for rec in created_recommendations
                ],
                'processing_time_ms': processing_time
            }
            
        except Exception as e:
            logger.error(f"❌ Erreur génération recommandations: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e)
            }
    
    def _build_recommendation_prompt(
        self,
        entrepreneur: Entrepreneur,
        analysis_result: Dict[str, Any],
        num_recommendations: int
    ) -> str:
        """Construire le prompt pour Gemini"""
        
        activity = entrepreneur.activities.first()
        sector = activity.sector if activity else 'Non défini'
        
        prompt = f"""Tu es un conseiller d'affaires expert spécialisé dans l'accompagnement des entrepreneurs du secteur informel au Sénégal.

Génère {num_recommendations} recommandations personnalisées basées sur cette analyse financière.

═══════════════════════════════════════════
CONTEXTE ENTREPRENEUR
═══════════════════════════════════════════
Nom: {entrepreneur.user.get_full_name()}
Secteur: {sector}
Localisation: Sénégal

═══════════════════════════════════════════
ANALYSE FINANCIÈRE
═══════════════════════════════════════════
{json.dumps(analysis_result, indent=2, ensure_ascii=False)}

═══════════════════════════════════════════
RECOMMANDATIONS DEMANDÉES
═══════════════════════════════════════════

Génère {num_recommendations} recommandations en JSON avec cette structure EXACTE :

[
  {{
    "title": "<titre court et actionnable>",
    "description": "<description 2-3 phrases>",
    "category": "<financial/operational/strategic/risk_mitigation/growth/efficiency>",
    "priority": "<low/medium/high/urgent>",
    "action_items": [
      "<action concrète 1>",
      "<action concrète 2>",
      "<action concrète 3>"
    ],
    "implementation_steps": [
      {{
        "step": 1,
        "description": "<étape détaillée>",
        "duration": "<durée estimée>"
      }}
    ],
    "expected_impact": "<impact attendu sur l'entreprise>",
    "confidence": <score 0-100>
  }}
]

RÈGLES :
1. Sois TRÈS spécifique au contexte sénégalais
2. Priorise les actions à fort impact
3. Rends les actions CONCRÈTES et RÉALISABLES
4. Adapte au secteur d'activité
5. 3-4 action_items COURTS par recommandation (max 80 caractères chacun)
6. 2-3 étapes d'implémentation maximum
7. Garde les descriptions CONCISES (max 150 caractères)
8. Réponds UNIQUEMENT en JSON valide (pas de markdown)
"""
        return prompt
    
    def _parse_recommendations_response(self, response_text: str) -> List[Dict[str, Any]]:
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
            recommendations = json.loads(cleaned)
            
            if not isinstance(recommendations, list):
                return []
            
            # Valider chaque recommandation
            validated = []
            for rec in recommendations:
                if 'title' in rec and 'description' in rec:
                    # Valeurs par défaut si manquantes
                    rec.setdefault('category', 'financial')
                    rec.setdefault('priority', 'medium')
                    rec.setdefault('action_items', [])
                    rec.setdefault('implementation_steps', [])
                    rec.setdefault('expected_impact', '')
                    rec.setdefault('confidence', 85)
                    validated.append(rec)
            
            return validated
            
        except json.JSONDecodeError as e:
            logger.error(f"❌ Erreur parsing JSON: {e}\nRéponse: {response_text[:500]}")
            return []


# Instance globale (singleton)
_recommendation_service = None

def get_recommendation_service() -> RecommendationService:
    """Obtenir l'instance du service (singleton)"""
    global _recommendation_service
    if _recommendation_service is None:
        _recommendation_service = RecommendationService()
    return _recommendation_service

