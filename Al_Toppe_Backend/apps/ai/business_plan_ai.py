"""
Service de génération de Business Plans avec Gemini
Génère des plans d'affaires intelligents basés sur les réponses au questionnaire
"""
import os
import json
import logging
import re
from typing import Dict, List, Optional, Any
from django.utils import timezone
import google.generativeai as genai

from apps.entrepreneurs.models import Entrepreneur, Activity

logger = logging.getLogger(__name__)

# Configuration Gemini
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-1.5-flash')

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


class BusinessPlanAIService:
    """Service de génération de business plans avec IA"""
    
    # Secteurs supportés
    SECTORS = {
        'commerce': 'Commerce et vente au détail',
        'agriculture': 'Agriculture et élevage',
        'artisanat': 'Artisanat et production',
        'services': 'Services aux particuliers',
        'restauration': 'Restauration et alimentation',
        'transport': 'Transport et logistique',
        'technologie': 'Technologie et digital',
        'autre': 'Autre secteur'
    }
    
    def __init__(self):
        """Initialiser le service"""
        if not GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY non configurée")
        
        self.model = genai.GenerativeModel(GEMINI_MODEL)
        logger.info(f"✅ BusinessPlanAIService initialisé (modèle: {GEMINI_MODEL})")
    
    def generate_business_plan(
        self,
        entrepreneur: Entrepreneur,
        activity: Activity,
        sector: str,
        answers: Dict[str, Any],
        language: str = 'french'
    ) -> Dict[str, Any]:
        """
        Générer un business plan complet avec IA
        
        Args:
            entrepreneur: L'entrepreneur
            activity: L'activité concernée
            sector: Secteur d'activité
            answers: Réponses au questionnaire guidé
            language: Langue de génération ('french' ou 'wolof')
        
        Returns:
            Dict avec le plan généré
        """
        try:
            start_time = timezone.now()
            
            logger.info(f"📝 Génération business plan pour {entrepreneur.user.get_full_name()} ({sector})")
            
            # 1️⃣ CONSTRUIRE LE PROMPT
            prompt = self._build_business_plan_prompt(
                entrepreneur=entrepreneur,
                activity=activity,
                sector=sector,
                answers=answers,
                language=language
            )
            
            # 2️⃣ APPELER GEMINI
            logger.info(f"🔮 Appel Gemini pour business plan...")
            response = self.model.generate_content(
                prompt,
                generation_config={
                    'temperature': 0.7,
                    'max_output_tokens': 4000,  # Augmenté pour éviter les troncatures
                }
            )
            
            # 3️⃣ PARSER LA RÉPONSE
            plan_data = self._parse_business_plan_response(response.text)
            
            processing_time = int((timezone.now() - start_time).total_seconds() * 1000)
            
            logger.info(f"✅ Business plan généré en {processing_time}ms")
            logger.info(f"💰 Coût estimé: ~$0.00135")
            
            return {
                'success': True,
                'plan': plan_data,
                'processing_time_ms': processing_time,
                'ai_system': 'gemini_business_plan'
            }
            
        except Exception as e:
            logger.error(f"❌ Erreur génération business plan: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e)
            }
    
    def _build_business_plan_prompt(
        self,
        entrepreneur: Entrepreneur,
        activity: Activity,
        sector: str,
        answers: Dict[str, Any],
        language: str
    ) -> str:
        """Construire le prompt pour Gemini"""
        
        sector_name = self.SECTORS.get(sector, sector)
        
        prompt = f"""Tu es un expert en création de business plans pour entrepreneurs africains, spécialisé dans le secteur informel sénégalais.

Génère un business plan complet et professionnel.

═══════════════════════════════════════════
CONTEXTE
═══════════════════════════════════════════
Entrepreneur: {entrepreneur.user.get_full_name()}
Activité: {activity.title}
Secteur: {sector_name}
Localisation: Sénégal

═══════════════════════════════════════════
RÉPONSES AU QUESTIONNAIRE
═══════════════════════════════════════════
{json.dumps(answers, indent=2, ensure_ascii=False)}

═══════════════════════════════════════════
BUSINESS PLAN À GÉNÉRER
═══════════════════════════════════════════

Génère un business plan en JSON avec cette structure EXACTE :

{{
  "summary": "<résumé exécutif 200-300 mots>",
  "market_analysis": {{
    "target_market": "<marché cible détaillé>",
    "market_size": "<taille estimée>",
    "competition": "<analyse concurrence>",
    "positioning": "<positionnement stratégique>",
    "opportunities": ["<opportunité 1>", "<opportunité 2>"],
    "threats": ["<menace 1>", "<menace 2>"]
  }},
  "offer": {{
    "products_services": [
      {{
        "name": "<nom produit/service>",
        "description": "<description>",
        "target_price": <prix FCFA>,
        "unique_value": "<valeur unique>"
      }}
    ],
    "value_proposition": "<proposition de valeur>",
    "competitive_advantages": ["<avantage 1>", "<avantage 2>"]
  }},
  "business_model": {{
    "revenue_streams": [
      {{
        "source": "<source revenu>",
        "description": "<description>",
        "estimated_amount": <montant FCFA/mois>
      }}
    ],
    "cost_structure": [
      {{
        "category": "<catégorie>",
        "description": "<description>",
        "estimated_amount": <montant FCFA/mois>
      }}
    ],
    "key_partners": ["<partenaire 1>", "<partenaire 2>"],
    "key_resources": ["<ressource 1>", "<ressource 2>"]
  }},
  "financial_projections": {{
    "year_1": {{
      "revenue": <montant FCFA>,
      "expenses": <montant FCFA>,
      "profit": <montant FCFA>
    }},
    "year_2": {{
      "revenue": <montant FCFA>,
      "expenses": <montant FCFA>,
      "profit": <montant FCFA>
    }},
    "year_3": {{
      "revenue": <montant FCFA>,
      "expenses": <montant FCFA>,
      "profit": <montant FCFA>
    }},
    "break_even_months": <nombre mois>,
    "initial_investment": <montant FCFA>
  }},
  "implementation_plan": {{
    "milestones": [
      {{
        "month": <mois 1-12>,
        "title": "<titre étape>",
        "description": "<description>",
        "deliverables": ["<livrable 1>", "<livrable 2>"]
      }}
    ],
    "resources_needed": [
      {{
        "type": "<humain/matériel/financier>",
        "description": "<description>",
        "quantity": "<quantité>",
        "cost": <montant FCFA>
      }}
    ],
    "risks": [
      {{
        "risk": "<risque>",
        "mitigation": "<stratégie d'atténuation>"
      }}
    ]
  }}
}}

RÈGLES IMPORTANTES :
1. Adapte au contexte sénégalais (FCFA, marché local)
2. Sois réaliste dans les projections
3. Utilise les réponses fournies
4. Intègre des exemples concrets du secteur {sector_name}
5. Projections sur 3 ans
6. Réponds UNIQUEMENT en JSON valide (pas de markdown, pas de texte avant/après)
7. Échappe correctement tous les guillemets dans les chaînes avec \\"
8. Limite chaque description à 200 mots maximum pour éviter les troncatures
9. Assure-toi que toutes les chaînes JSON sont correctement fermées
10. Le JSON doit être complet et valide, sans troncature
"""
        return prompt
    
    def _parse_business_plan_response(self, response_text: str) -> Dict[str, Any]:
        """Parser la réponse JSON de Gemini avec gestion robuste des erreurs"""
        import re
        
        try:
            # Nettoyer la réponse
            cleaned = response_text.strip()
            
            # Enlever les markdown code blocks
            if cleaned.startswith('```json'):
                cleaned = cleaned[7:]
            elif cleaned.startswith('```'):
                cleaned = cleaned[3:]
            if cleaned.endswith('```'):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
            
            # Essayer d'extraire le JSON même s'il est tronqué
            # Chercher le premier { et le dernier }
            first_brace = cleaned.find('{')
            if first_brace == -1:
                raise ValueError("Aucun JSON trouvé dans la réponse")
            
            # Trouver le dernier } valide en comptant les accolades
            brace_count = 0
            last_brace = -1
            in_string = False
            escape_next = False
            
            for i in range(first_brace, len(cleaned)):
                char = cleaned[i]
                
                if escape_next:
                    escape_next = False
                    continue
                
                if char == '\\':
                    escape_next = True
                    continue
                
                if char == '"' and not escape_next:
                    in_string = not in_string
                    continue
                
                if not in_string:
                    if char == '{':
                        brace_count += 1
                    elif char == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            last_brace = i
                            break
            
            if last_brace == -1:
                # Si pas de } fermant trouvé, essayer de réparer
                logger.warning("JSON tronqué détecté, tentative de réparation...")
                # Chercher le dernier } disponible
                last_brace = cleaned.rfind('}')
                if last_brace == -1:
                    # Ajouter un } à la fin
                    cleaned = cleaned + '}'
                    last_brace = len(cleaned) - 1
                else:
                    # Extraire jusqu'au dernier }
                    cleaned = cleaned[:last_brace + 1]
            else:
                # Extraire le JSON valide
                cleaned = cleaned[first_brace:last_brace + 1]
            
            # Réparer les chaînes JSON mal formées
            cleaned = self._repair_json_strings(cleaned)
            
            # Parser le JSON
            plan = json.loads(cleaned)
            
            # Valider la structure (ajouter valeurs par défaut si manquantes)
            plan.setdefault('summary', '')
            plan.setdefault('market_analysis', {})
            plan.setdefault('offer', {})
            plan.setdefault('business_model', {})
            plan.setdefault('financial_projections', {})
            plan.setdefault('implementation_plan', {})
            
            return plan
            
        except json.JSONDecodeError as e:
            logger.error(f"❌ Erreur parsing JSON: {e}")
            logger.error(f"Position erreur: ligne {getattr(e, 'lineno', 'N/A')}, colonne {getattr(e, 'colno', 'N/A')}")
            logger.error(f"Réponse (premiers 2000 caractères): {response_text[:2000]}")
            if len(response_text) > 2000:
                logger.error(f"Réponse (derniers 500 caractères): {response_text[-500:]}")
            
            # Essayer de récupérer au moins le résumé même si le JSON est cassé
            summary = 'Erreur lors de la génération du plan. Veuillez réessayer.'
            try:
                # Chercher le résumé dans le texte brut (plusieurs patterns)
                patterns = [
                    r'"summary"\s*:\s*"([^"]*(?:\\.[^"]*)*)"',  # Pattern avec échappements
                    r'"summary"\s*:\s*"([^"]{50,500})"',  # Pattern simple (50-500 caractères)
                    r'summary["\']?\s*:\s*["\']([^"\']{50,500})["\']',  # Pattern avec guillemets simples
                ]
                for pattern in patterns:
                    summary_match = re.search(pattern, response_text, re.DOTALL | re.IGNORECASE)
                    if summary_match:
                        summary = summary_match.group(1)
                        # Nettoyer le résumé
                        summary = summary.replace('\\"', '"').replace('\\n', ' ').replace('\\r', ' ')
                        summary = summary.replace('\\t', ' ').strip()
                        # Limiter la longueur
                        if len(summary) > 1000:
                            summary = summary[:1000] + '...'
                        if len(summary) > 50:  # Si on a un résumé valide
                            break
            except Exception as parse_err:
                logger.warning(f"Impossible d'extraire le résumé: {parse_err}")
            
            return {
                'summary': summary if summary and len(summary) > 50 else 'Erreur lors de la génération du plan. Veuillez réessayer.',
                'market_analysis': {},
                'offer': {},
                'business_model': {},
                'financial_projections': {},
                'implementation_plan': {},
                'error': f'JSON parsing failed: {str(e)}'
            }
        except Exception as e:
            logger.error(f"❌ Erreur inattendue lors du parsing: {e}", exc_info=True)
            return {
                'summary': 'Erreur lors de la génération du plan',
                'market_analysis': {},
                'offer': {},
                'business_model': {},
                'financial_projections': {},
                'implementation_plan': {},
                'error': str(e)
            }
    
    def _repair_json_strings(self, json_str: str) -> str:
        """Réparer les chaînes JSON mal formées en tronquant proprement"""
        # Si le JSON est tronqué, trouver le dernier caractère valide
        # et fermer proprement les structures ouvertes
        
        # Compter les accolades et crochets ouverts
        open_braces = json_str.count('{') - json_str.count('}')
        open_brackets = json_str.count('[') - json_str.count(']')
        
        # Fermer les structures ouvertes
        if open_braces > 0:
            # Trouver le dernier objet ouvert et le fermer
            last_open = json_str.rfind('{')
            if last_open != -1:
                # Chercher si on est dans une chaîne
                before_last = json_str[:last_open]
                # Compter les guillemets non échappés avant
                quote_count = before_last.count('"') - before_last.count('\\"')
                if quote_count % 2 == 0:  # Pas dans une chaîne
                    # Fermer les objets et tableaux ouverts
                    json_str = json_str.rstrip()
                    # Enlever les virgules finales
                    json_str = re.sub(r',\s*$', '', json_str)
                    # Fermer les structures
                    json_str += '}' * open_braces
                    json_str += ']' * open_brackets
        
        return json_str


# Instance globale (singleton)
_business_plan_ai_service = None

def get_business_plan_ai_service() -> BusinessPlanAIService:
    """Obtenir l'instance du service (singleton)"""
    global _business_plan_ai_service
    if _business_plan_ai_service is None:
        _business_plan_ai_service = BusinessPlanAIService()
    return _business_plan_ai_service





