# apps/ai/gemini_nlp.py
"""
Service NLP basé sur Google Gemini Pro pour compréhension parfaite du français et du wolof.
Remplace le système manuel (mots-clés + regex) par une vraie intelligence artificielle.
"""

import os
import json
import logging
from typing import Dict, List, Optional
from datetime import datetime
from django.conf import settings
from django.utils import timezone

try:
    import google.generativeai as genai
except ImportError:
    raise ImportError(
        "google-generativeai n'est pas installé. "
        "Exécutez: pip install google-generativeai"
    )

logger = logging.getLogger(__name__)


class GeminiNLPService:
    """
    Service NLP basé sur Google Gemini pour français et wolof
    
    Features:
    - Compréhension naturelle du français ET du wolof
    - Détection d'intent avec confiance réelle
    - Extraction d'entités contextuelles
    - Génération de réponses personnalisées
    - Support du code-switching (wolof + français)
    """
    
    def __init__(self):
        """Initialiser le service Gemini"""
        
        # Récupérer la clé API
        api_key = getattr(settings, 'GEMINI_API_KEY', None) or os.getenv('GEMINI_API_KEY')
        if not api_key:
            raise ValueError(
                "GEMINI_API_KEY non configurée. "
                "Ajoutez-la dans settings.py ou .env"
            )
        
        # Configurer Gemini
        genai.configure(api_key=api_key)
        
        # Configurer le modèle (IMPORTANT : utiliser gemini-1.5-flash pour le free tier)
        model_name = getattr(settings, 'GEMINI_MODEL', None) or os.getenv('GEMINI_MODEL', 'gemini-1.5-flash')
        
        # Forcer gemini-1.5-flash si le modèle n'est pas supporté par le free tier
        if 'tts' in model_name or '2.5' in model_name or model_name == 'gemini-pro':
            logger.warning(f"⚠️ Modèle {model_name} n'existe plus ou nécessite un plan payant. Utilisation de gemini-1.5-flash à la place.")
            model_name = 'gemini-1.5-flash'
        
        temperature = float(getattr(settings, 'GEMINI_TEMPERATURE', None) or os.getenv('GEMINI_TEMPERATURE', 0.3))
        max_tokens = int(getattr(settings, 'GEMINI_MAX_TOKENS', None) or os.getenv('GEMINI_MAX_TOKENS', 4096))  # Augmenté pour phrases complexes
        
        self.model = genai.GenerativeModel(
            model_name=model_name,
            generation_config={
                "temperature": temperature,
                "max_output_tokens": max_tokens,
                "top_p": 0.95,
                "top_k": 40,
            },
            safety_settings=[
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
            ]
        )
        
        # Prompt système
        self.system_prompt = self._build_system_prompt()
        
        logger.info(f"✅ GeminiNLPService initialisé (modèle: {model_name})")
    
    def _build_system_prompt(self) -> str:
        """Construire le prompt système pour Gemini"""
        return """Tu es **AL-TOPPE AI**, un assistant financier intelligent pour les entrepreneurs sénégalais.

═══════════════════════════════════════════════════════════════
                         TON RÔLE
═══════════════════════════════════════════════════════════════

Tu aides les entrepreneurs du secteur informel au Sénégal à gérer leurs finances en comprenant parfaitement :
- Le **français** (langue officielle)
- Le **wolof** (langue locale la plus parlée)
- Le **code-switching** (mélange des deux langues)

Tu es capable de :
1. Comprendre les intentions (intents) de l'utilisateur
2. Extraire les informations importantes (entités)
3. Gérer le contexte et les nuances
4. Générer des réponses naturelles et amicales

═══════════════════════════════════════════════════════════════
        🚨 RÈGLE D'OR POUR LE FORMAT JSON 🚨
═══════════════════════════════════════════════════════════════

⚠️ **ATTENTION CRITIQUE** ⚠️

Quand intent = "mixed_transactions" :
→ Tu DOIS créer le champ "transactions" (liste) AU NIVEAU RACINE
→ NE PAS utiliser "entities" pour mixed_transactions
→ Chaque objet dans "transactions" doit avoir : type, amount, category, item

Exemple CORRECT :
{
  "intent": "mixed_transactions",
  "transactions": [
    {"type": "expense", "amount": 2000, "item": "pomme"},
    {"type": "income", "amount": 3000, "item": "banane"}
  ],
  "voice_response": "..."
}

Exemple INCORRECT :
{
  "intent": "mixed_transactions",
  "entities": {...},  ← NON ! Utilise "transactions" !
  "voice_response": "..."
}

═══════════════════════════════════════════════════════════════
                     INTENTS DISPONIBLES
═══════════════════════════════════════════════════════════════

**declare_income** : L'utilisateur déclare un revenu/vente
Exemples : "J'ai vendu 5000", "Dama jaay na ceeb", "Mon client m'a payé"

**declare_expense** : L'utilisateur déclare une dépense
Exemples : "J'ai acheté du riz", "Dama jënd essence", "Payé le loyer"

**mixed_transactions** ⚠️ : L'utilisateur fait PLUSIEURS DÉCLARATIONS de TYPES DIFFÉRENTS (à la fois dépense ET revenu)
Exemples : "J'ai acheté pomme 2000 et vendu banane 3000", "Jënd essence 5000, jaay riz 15000"
RÈGLE CRITIQUE : Utilise UNIQUEMENT si la phrase contient à la fois des mots d'ACHAT (jënd, acheté, payé) ET de VENTE (jaay, vendu, gagné) !
Format spécial : Crée un champ "transactions" (liste) au lieu de "entities"

**check_balance** : L'utilisateur veut son solde actuel
Exemples : "Combien j'ai ?", "Xàllis bi ñaata la?", "Mon solde"

**expense_balance** : L'utilisateur veut ses dépenses totales
Exemples : "Combien j'ai dépensé ?", "Mes dépenses", "Total dépenses"

**income_balance** : L'utilisateur veut ses revenus totaux
Exemples : "Combien j'ai gagné ?", "Mes revenus", "Total ventes"

**ask_advice** : L'utilisateur demande un conseil
Exemples : "Que faire ?", "Aide-moi", "Conseil"

**merci** : L'utilisateur remercie
Exemples : "Merci", "Jërejëf", "Thanks"

**unknown** : Tu ne comprends pas l'intention
Utilise cet intent si la confiance < 0.5

═══════════════════════════════════════════════════════════════
                    CATÉGORIES FINANCIÈRES
═══════════════════════════════════════════════════════════════

**logement** : loyer, eau, électricité, gaz, charges

**transport** : essence, taxi, bus, réparation véhicule, assurance

**services** : plombier, maçon, électricien, menuisier, peintre, etc.

**salaires** : paiement employés, primes, bonus, commissions

**alimentation** : nourriture, marché, restaurant, riz, pain, viande

**santé** : médicaments, consultation médicale, pharmacie, hôpital

**communication** : téléphone, internet, forfait, recharge

**habillement** : vêtements, chaussures, bijoux, mode

**éducation** : école, formation, livres, fournitures

**impôts** : taxes, TVA, contributions fiscales

**divers** : autres (utilise si aucune catégorie ne correspond)

═══════════════════════════════════════════════════════════════
                   ENTITÉS À EXTRAIRE
═══════════════════════════════════════════════════════════════

**amount** (number) : Montant en FCFA
- Cherche les nombres suivis de "f", "fcfa", "franc"
- Si plusieurs montants, extrais-les tous
- Si pas de montant : null

**category** (string) : Catégorie de la transaction
- Utilise les catégories ci-dessus
- Par défaut : "divers"

**item** (string) : Item spécifique
- Ex: "riz", "essence", "maçon", "loyer", "forfait"
- Sois précis et utilise le mot exact de l'utilisateur

**description** (string) : Description COURTE (5 mots max)
- Ce que l'utilisateur veut vraiment dire
- Ex: "Réparation fuite", "Achat pain"

**date** (string) : Quand (si mentionné)
- "aujourd'hui", "hier", "ce mois", "la semaine dernière"
- Par défaut : "aujourd'hui"

**period** (string) : Période (pour check_balance)
- "ce mois", "cette semaine", "ce jour", "cette année"
- Null si non mentionné

═══════════════════════════════════════════════════════════════
                   FORMAT DE RÉPONSE
═══════════════════════════════════════════════════════════════

Tu dois TOUJOURS répondre en JSON valide avec cette structure :

**FORMAT STANDARD (declare_expense, declare_income, check_balance, etc.)** :
{
  "intent": "declare_expense",
  "confidence": 0.95,
  "entities": {
    "amount": 25000,
    "category": "services",
    "item": "maçon",
    "description": "Paiement maçon pour travaux",
    "date": "aujourd'hui"
  },
  "language": "french",
  "voice_response": "D'accord, j'ai enregistré une dépense de 25 000 FCFA pour le maçon."
}

**FORMAT SPÉCIAL POUR mixed_transactions UNIQUEMENT** :
⚠️ IMPORTANT : Quand intent = "mixed_transactions", tu DOIS créer un champ "transactions" (liste) AU NIVEAU RACINE, PAS dans "entities" !

{
  "intent": "mixed_transactions",
  "confidence": 0.98,
  "transactions": [
    {"type": "expense", "amount": 2000, "category": "transport", "item": "essence"},
    {"type": "income", "amount": 300, "category": "alimentation", "item": "banane"}
  ],
  "language": "french",
  "voice_response": "Enregistré : dépenses 2000 FCFA et ventes 300 FCFA."
}

**RÈGLE CRITIQUE** :
- Si intent = "mixed_transactions" → Utilise le champ "transactions" (liste d'objets)
- Sinon → Utilise le champ "entities" (dictionnaire)

**CHAMPS OBLIGATOIRES** :
- `intent` : Un des intents ci-dessus
- `confidence` : Entre 0.0 et 1.0 (0.95 = 95% sûr)
- `entities` : Dictionnaire (peut être vide {}) - SAUF pour mixed_transactions
- `transactions` : Liste d'objets - UNIQUEMENT pour mixed_transactions
- `voice_response` : Réponse à dire à l'utilisateur

**CHAMPS OPTIONNELS** :
- `language` : "french" ou "wolof" (langue de réponse)
- `original_language` : Langue de l'input utilisateur
- `explanation` : Explication pour debug

═══════════════════════════════════════════════════════════════
                   RÈGLES IMPORTANTES
═══════════════════════════════════════════════════════════════

1. **Montants** : Extrais tous les montants (sans espaces dans le JSON)
2. **Catégories** : Utilise les catégories ci-dessus (services, transport, etc.)
3. **Confiance** : 0-1 (0.9+ = très sûr, <0.5 = unknown)
4. **Wolof** : "Dama jaay" = vendu, "Dama jënd" = dépensé, "Xàllis" = argent
5. **Réponses** : COURTES (10 mots max)
6. **JSON** : Compact, descriptions courtes (5 mots max)

7. **TRANSACTIONS MULTIPLES** : ⚠️ RÈGLES CRITIQUES ⚠️
   
   a) **UN SEUL TYPE** (plusieurs dépenses OU plusieurs revenus) :
      → Utilise l'intent simple : "declare_expense" ou "declare_income"
      → Mets les montants/items dans "amount" et "item" (tableaux)
      
      Exemple : "Jaay 3 banane 200 ak 4 pomme 500"
      {
        "intent": "declare_income",
        "entities": {
          "amount": [600, 2000],
          "item": ["banane", "pomme"],
          "category": "alimentation"
        }
      }
   
   b) **DEUX TYPES** (dépense ET revenu dans la même phrase) :
      → Utilise l'intent MIXTE : "mixed_transactions"
      → Crée le champ "transactions" au NIVEAU RACINE (pas dans entities)
      
      Exemple : "Jënd essence 2000, jaay 3 banane 100"
      {
        "intent": "mixed_transactions",
        "entities": {},
        "transactions": [
          {"type": "expense", "amount": 2000, "category": "transport", "item": "essence"},
          {"type": "income", "amount": 300, "category": "alimentation", "item": "banane"}
        ]
      }
   
   c) **CALCULS** : "3 bananes à 100" = 300 (pas 100 !)
   
   d) **MOTS-CLÉS** :
      - "jënd" / "acheté" / "payé" → expense
      - "jaay" / "vendu" / "gagné" → income

═══════════════════════════════════════════════════════════════
                        EXEMPLES
═══════════════════════════════════════════════════════════════

**Exemple 1** : "J'ai payé le plombier 15000"
{"intent": "declare_expense", "confidence": 0.98, "entities": {"amount": 15000, "category": "services", "item": "plombier"}, "voice_response": "Dépense 15000 FCFA plombier enregistrée."}

**Exemple 2** : "Dama jaay na ceeb 2000"
{"intent": "declare_income", "confidence": 0.95, "entities": {"amount": 2000, "category": "alimentation", "item": "riz"}, "language": "wolof", "voice_response": "Jërejëf! 2000 FCFA ceeb."}

**Exemple 3** : "Combien j'ai dépensé en transport ?"
{"intent": "expense_balance", "confidence": 0.94, "entities": {"category": "transport"}, "voice_response": "Dépenses transport calculées."}

**Exemple 4 - PLUSIEURS REVENUS (MÊME TYPE)** : "Jaay 3 banane 200 ak 4 pomme 500"
{
  "intent": "declare_income",
  "confidence": 0.98,
  "entities": {
    "amount": [600, 2000],
    "category": "alimentation",
    "item": ["banane", "pomme"]
  },
  "language": "wolof",
  "voice_response": "Jërejëf! Enregistré na banane 600 ak pomme 2000."
}

**Exemple 5 - TRANSACTIONS MIXTES (DÉPENSES + REVENUS)** : "Jënd essence 2000, jaay 3 banane 100, jaay 4 orange 200"
⚠️ ATTENTION : Contient "jënd" ET "jaay" → mixed_transactions → Utilise "transactions" (PAS "entities") !
{
  "intent": "mixed_transactions",
  "confidence": 0.98,
  "transactions": [
    {"type": "expense", "amount": 2000, "category": "transport", "item": "essence"},
    {"type": "income", "amount": 300, "category": "alimentation", "item": "banane"},
    {"type": "income", "amount": 800, "category": "alimentation", "item": "orange"}
  ],
  "language": "wolof",
  "voice_response": "Enregistré : dépenses 2000 FCFA et ventes 1100 FCFA. Jërejëf!"
}

**Exemple 6 - TRANSACTIONS MIXTES (Français)** : "Achat de pomme 2000 et vente de banane 3000"
⚠️ ATTENTION : Contient "achat" ET "vente" → mixed_transactions → Utilise "transactions" (PAS "entities") !
{
  "intent": "mixed_transactions",
  "confidence": 0.98,
  "transactions": [
    {"type": "expense", "amount": 2000, "category": "alimentation", "item": "pomme"},
    {"type": "income", "amount": 3000, "category": "alimentation", "item": "banane"}
  ],
  "language": "french",
  "voice_response": "Enregistré : dépenses 2000 FCFA et ventes 3000 FCFA. Merci !"
}

═══════════════════════════════════════════════════════════════
                     IMPORTANT FINAL
═══════════════════════════════════════════════════════════════

- Réponds UNIQUEMENT en JSON
- Pas de texte avant ou après le JSON
- Pas de markdown (```json)
- JSON valide uniquement
- Sois précis et confiant
- Privilégie l'expérience utilisateur

Maintenant, analyse l'input utilisateur qui suit.
"""

    def analyze_text(self, text: str, context: Optional[Dict] = None) -> Dict:
        """
        Analyser un texte en français ou wolof avec Gemini
        
        Args:
            text: Texte à analyser (français, wolof, ou mixte)
            context: Contexte optionnel (user_id, historique, etc.)
        
        Returns:
            Dict avec:
            - intent: L'intention détectée
            - confidence: Confiance (0-1)
            - entities: Entités extraites
            - voice_response: Réponse vocale
            - language: Langue de réponse
        """
        if not text or not text.strip():
            return self._unknown_response("Texte vide")
        
        try:
            logger.info(f"📝 Analyse Gemini : '{text}'")
            start_time = timezone.now()
            
            # Construire le prompt complet
            prompt = self._build_analysis_prompt(text, context)
            
            # Appeler Gemini
            response = self.model.generate_content(prompt)
            
            # Parser la réponse JSON
            result = self._parse_gemini_response(response.text)
            
            # Enrichir avec métadonnées
            result['original_text'] = text
            result['processing_time_ms'] = int((timezone.now() - start_time).total_seconds() * 1000)
            
            logger.info(
                f"✅ Intent: {result.get('intent')} "
                f"(confiance: {result.get('confidence', 0):.2f}, "
                f"temps: {result.get('processing_time_ms')}ms)"
            )
            
            return result
            
        except Exception as e:
            error_msg = str(e)
            
            # Détecter les erreurs de quota
            if '429' in error_msg or 'quota' in error_msg.lower():
                logger.error(f"❌ Quota Gemini dépassé: {e}")
                return self._error_response(
                    "Quota Gemini dépassé. Solutions:\n"
                    "1. Attendez quelques secondes\n"
                    "2. Utilisez une nouvelle clé API\n"
                    "3. Changez GEMINI_MODEL=gemini-pro dans .env"
                )
            
            logger.error(f"❌ Erreur Gemini: {e}", exc_info=True)
            return self._error_response(str(e))
    
    def analyze_audio(self, audio_data: bytes, context: Optional[Dict] = None) -> Dict:
        """
        Analyser directement un fichier audio avec Gemini (français ET wolof)
        
        Args:
            audio_data: Données audio en bytes (WAV, MP3, M4A, AAC, etc.)
            context: Contexte optionnel (user_id, historique, etc.)
        
        Returns:
            Dict avec:
            - intent: L'intention détectée
            - confidence: Confiance (0-1)
            - entities: Entités extraites
            - voice_response: Réponse vocale
            - transcribed_text: Transcription de l'audio
            - language: Langue détectée
        
        Note: Cette méthode est **meilleure** que la transcription texte pour le Wolof
              car Gemini peut comprendre directement l'accent et l'intonation.
        """
        if not audio_data or len(audio_data) < 100:
            return self._unknown_response("Audio vide ou trop court")
        
        try:
            import tempfile
            import base64
            
            logger.info(f"🎤 Analyse audio Gemini : {len(audio_data)} bytes")
            start_time = timezone.now()
            
            # Sauvegarder temporairement l'audio
            with tempfile.NamedTemporaryFile(suffix='.m4a', delete=False) as temp_audio:
                temp_audio.write(audio_data)
                temp_path = temp_audio.name
            
            try:
                # Uploader l'audio vers Gemini
                logger.info(f"📤 Upload audio vers Gemini...")
                audio_file = genai.upload_file(temp_path)
                logger.info(f"✅ Audio uploadé: {audio_file.name}")
                
                # Construire le prompt pour l'analyse audio
                audio_prompt = self._build_audio_analysis_prompt(context)
                
                # Appeler Gemini avec l'audio
                logger.info(f"🧠 Analyse Gemini de l'audio...")
                response = self.model.generate_content([audio_prompt, audio_file])
                
                # Parser la réponse JSON
                result = self._parse_gemini_response(response.text)
                
                # Enrichir avec métadonnées
                result['processing_time_ms'] = int((timezone.now() - start_time).total_seconds() * 1000)
                result['audio_size_bytes'] = len(audio_data)
                result['audio_analysis_method'] = 'gemini_direct'
                
                logger.info(
                    f"✅ Audio analysé: Intent={result.get('intent')}, "
                    f"Confiance={result.get('confidence', 0):.2f}, "
                    f"Temps={result.get('processing_time_ms')}ms"
                )
                
                # Supprimer le fichier de Gemini
                try:
                    audio_file.delete()
                except:
                    pass
                
                return result
                
            finally:
                # Supprimer le fichier temporaire avec retry pour Windows
                try:
                    # Fermer explicitement le fichier s'il est encore ouvert
                    import time
                    time.sleep(0.1)  # Petit délai pour laisser le système libérer le fichier
                    
                    if os.path.exists(temp_path):
                        os.unlink(temp_path)
                except PermissionError as e:
                    # Sur Windows, le fichier peut être encore utilisé
                    logger.warning(f"Impossible de supprimer temporairement {temp_path}: {e}. Le fichier sera supprimé automatiquement.")
                except OSError as e:
                    # Autres erreurs OS (fichier déjà supprimé, etc.)
                    if e.errno != 2:  # Ignorer "file not found"
                        logger.warning(f"Erreur suppression fichier temporaire {temp_path}: {e}")
                except Exception as e:
                    logger.warning(f"Erreur inattendue suppression fichier temporaire {temp_path}: {e}")
            
        except Exception as e:
            error_msg = str(e)
            
            # Détecter les erreurs de quota
            if '429' in error_msg or 'quota' in error_msg.lower():
                logger.error(f"❌ Quota Gemini dépassé: {e}")
                return self._error_response(
                    "Quota Gemini dépassé. Utilisez la transcription texte comme fallback."
                )
            
            logger.error(f"❌ Erreur analyse audio Gemini: {e}", exc_info=True)
            return self._error_response(str(e))
    
    def _build_audio_analysis_prompt(self, context: Optional[Dict]) -> str:
        """Construire le prompt pour l'analyse audio"""
        prompt = f"{self.system_prompt}\n\n"
        
        # Ajouter des instructions spécifiques pour l'audio
        prompt += "═══════════════════════════════════════════════════════════════\n"
        prompt += "              INSTRUCTIONS SPÉCIALES POUR L'AUDIO\n"
        prompt += "═══════════════════════════════════════════════════════════════\n\n"
        prompt += "1. Écoute attentivement l'audio et transcris-le exactement\n"
        prompt += "2. Détecte la langue (français, wolof, ou mixte)\n"
        prompt += "3. Comprends l'intention même si l'accent est fort\n"
        prompt += "4. Extrais TOUS les montants et items mentionnés\n"
        prompt += "5. Génère une réponse dans la même langue que l'audio\n\n"
        
        # Ajouter le contexte utilisateur si disponible
        if context:
            prompt += "═══════════════════════════════════════════════════════════════\n"
            prompt += "                   CONTEXTE UTILISATEUR\n"
            prompt += "═══════════════════════════════════════════════════════════════\n\n"
            prompt += f"{json.dumps(context, indent=2, ensure_ascii=False)}\n\n"
        
        # Demander la réponse
        prompt += "═══════════════════════════════════════════════════════════════\n"
        prompt += "                 TA RÉPONSE (JSON uniquement)\n"
        prompt += "═══════════════════════════════════════════════════════════════\n\n"
        prompt += "Analyse l'audio et retourne un JSON avec:\n"
        prompt += "- transcribed_text: La transcription exacte de l'audio\n"
        prompt += "- intent: L'intention détectée\n"
        prompt += "- confidence: Ta confiance (0-1)\n"
        prompt += "- entities: Les entités extraites\n"
        prompt += "- voice_response: Une réponse vocale appropriée\n"
        prompt += "- language: La langue détectée\n"
        
        return prompt
    
    def _build_analysis_prompt(self, text: str, context: Optional[Dict]) -> str:
        """Construire le prompt d'analyse complet"""
        prompt = f"{self.system_prompt}\n\n"
        
        # Ajouter le contexte utilisateur si disponible
        if context:
            prompt += "═══════════════════════════════════════════════════════════════\n"
            prompt += "                   CONTEXTE UTILISATEUR\n"
            prompt += "═══════════════════════════════════════════════════════════════\n\n"
            prompt += f"{json.dumps(context, indent=2, ensure_ascii=False)}\n\n"
        
        # Ajouter l'input utilisateur
        prompt += "═══════════════════════════════════════════════════════════════\n"
        prompt += "                     INPUT UTILISATEUR\n"
        prompt += "═══════════════════════════════════════════════════════════════\n\n"
        prompt += f'"{text}"\n\n'
        
        # Demander la réponse
        prompt += "═══════════════════════════════════════════════════════════════\n"
        prompt += "                 TA RÉPONSE (JSON uniquement)\n"
        prompt += "═══════════════════════════════════════════════════════════════\n\n"
        
        return prompt
    
    def _parse_gemini_response(self, response_text: str) -> Dict:
        """Parser la réponse JSON de Gemini"""
        try:
            # Nettoyer la réponse
            cleaned = response_text.strip()
            
            # Enlever les balises markdown si présentes
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            elif cleaned.startswith("```"):
                cleaned = cleaned[3:]
            
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            
            cleaned = cleaned.strip()
            
            # Parser le JSON
            result = json.loads(cleaned)
            
            # Valider et normaliser la structure
            result = self._validate_and_normalize(result)
            
            return result
            
        except json.JSONDecodeError as e:
            logger.error(f"❌ Erreur parsing JSON: {e}\nRéponse brute: {response_text}")
            return self._error_response(f"JSON invalide: {e}")
        except Exception as e:
            logger.error(f"❌ Erreur inattendue: {e}")
            return self._error_response(str(e))
    
    def _validate_and_normalize(self, result: Dict) -> Dict:
        """Valider et normaliser la structure de la réponse"""
        # Champs obligatoires
        if 'intent' not in result or not result['intent']:
            result['intent'] = 'unknown'
        
        if 'confidence' not in result or not isinstance(result['confidence'], (int, float)):
            result['confidence'] = 0.5
        else:
            # Limiter entre 0 et 1
            result['confidence'] = max(0.0, min(1.0, float(result['confidence'])))
        
        if 'entities' not in result or not isinstance(result['entities'], dict):
            result['entities'] = {}
        
        # ✅ NOUVEAU : Gérer les transactions mixtes
        if result['intent'] == 'mixed_transactions':
            # Si transactions est au niveau racine (comme demandé dans le prompt)
            if 'transactions' in result and isinstance(result['transactions'], list):
                # Les garder au niveau racine pour le backend
                pass
            # Si Gemini les a mis dans entities (format alternatif)
            elif 'transactions' in result['entities'] and isinstance(result['entities']['transactions'], list):
                # Les remonter au niveau racine
                result['transactions'] = result['entities']['transactions']
            else:
                # Aucune transaction trouvée
                result['transactions'] = []
                logger.warning("⚠️ Intent mixed_transactions mais pas de transactions trouvées")
        
        if 'voice_response' not in result or not result['voice_response']:
            result['voice_response'] = "Je t'écoute."
        
        # Champs optionnels avec valeurs par défaut
        if 'language' not in result:
            result['language'] = 'french'
        
        if 'original_language' not in result:
            result['original_language'] = 'french'
        
        # ✅ NOUVEAU : Ajouter transcribed_text si manquant
        if 'transcribed_text' not in result:
            result['transcribed_text'] = ''
        
        # Normaliser les montants (enlever espaces si présents)
        if 'amount' in result['entities'] and isinstance(result['entities']['amount'], str):
            try:
                result['entities']['amount'] = int(result['entities']['amount'].replace(' ', '').replace(',', ''))
            except ValueError:
                pass
        
        return result
    
    def _unknown_response(self, reason: str = "") -> Dict:
        """Réponse par défaut pour intent inconnu"""
        return {
            'intent': 'unknown',
            'confidence': 0.0,
            'entities': {},
            'voice_response': "Je n'ai pas compris, peux-tu répéter ?",
            'language': 'french',
            'error': reason or 'Intent non reconnu'
        }
    
    def _error_response(self, error: str) -> Dict:
        """Réponse par défaut en cas d'erreur"""
        return {
            'intent': 'unknown',
            'confidence': 0.0,
            'entities': {},
            'voice_response': "Désolé, j'ai eu un problème. Peux-tu réessayer ?",
            'language': 'french',
            'error': error
        }
    
    def generate_response(
        self, 
        intent: str, 
        entities: Dict, 
        result: Dict, 
        language: str = 'french'
    ) -> str:
        """
        Générer une réponse vocale personnalisée basée sur le contexte
        
        Args:
            intent: Intent détecté
            entities: Entités extraites
            result: Résultat de l'action exécutée
            language: 'french' ou 'wolof'
        
        Returns:
            Texte de la réponse vocale
        """
        try:
            prompt = f"""Génère une réponse vocale naturelle et amicale.

CONTEXTE :
- Intent : {intent}
- Entités : {json.dumps(entities, indent=2, ensure_ascii=False)}
- Résultat : {json.dumps(result, indent=2, ensure_ascii=False)}
- Langue : {language}

RÈGLES :
- Sois naturel et conversationnel
- Confirme clairement l'action réalisée
- Si montant, utilise le format avec espaces : "15 000 FCFA"
- Si langue wolof, utilise du wolof authentique
- Sois bref (1-2 phrases maximum)
- Sois encourageant et positif

RÉPONSE (texte seulement, pas de JSON) :"""

            response = self.model.generate_content(prompt)
            return response.text.strip()
            
        except Exception as e:
            logger.error(f"❌ Erreur génération réponse: {e}")
            # Fallback simple
            if intent == 'declare_expense':
                amount = entities.get('amount', 0)
                return f"Dépense de {amount:,} FCFA enregistrée.".replace(',', ' ')
            elif intent == 'declare_income':
                amount = entities.get('amount', 0)
                return f"Revenu de {amount:,} FCFA enregistré.".replace(',', ' ')
            elif intent == 'check_balance':
                balance = result.get('balance', 0)
                return f"Votre solde est de {balance:,} FCFA.".replace(',', ' ')
            else:
                return "Opération effectuée avec succès."


# Instance globale (singleton)
_gemini_service = None

def get_gemini_service() -> GeminiNLPService:
    """
    Récupérer l'instance singleton du service Gemini
    
    Returns:
        GeminiNLPService: Instance du service
    """
    global _gemini_service
    if _gemini_service is None:
        _gemini_service = GeminiNLPService()
    return _gemini_service

