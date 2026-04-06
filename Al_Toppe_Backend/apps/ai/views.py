# apps/ai/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .gemini_nlp import GeminiNLPService  # ✅ NOUVEAU : Gemini
from .integration import WolofNLPService  # ❌ ANCIEN : Fallback
import uuid
import os
import re
import logging
from django.utils import timezone
from apps.alerts_ai.services import trigger_expense_revenue_alert

# Feature flag pour activer/désactiver Gemini
USE_GEMINI = os.getenv('USE_GEMINI', 'true').lower() == 'true'

# Mode "Gemini uniquement" pour la phase initiale (collecte de données)
# Si activé, TOUTES les requêtes audio utilisent Gemini (pas de fallback Regex)
# Utile pour collecter les types d'entrées utilisateurs et bien paramétrer le système
USE_GEMINI_ONLY_FOR_AUDIO = os.getenv('USE_GEMINI_ONLY_FOR_AUDIO', 'false').lower() == 'true'

# Logger
logger = logging.getLogger(__name__)


class VoiceAnalyzeAPIView(APIView):
    """API pour analyser les commandes vocales SANS les exécuter (approche hybride)"""
    
    permission_classes = [permissions.IsAuthenticated]

    def __init__(self):
        super().__init__()
        # 🎯 APPROCHE HYBRIDE : Initialiser les 2 services
        self.legacy_service = WolofNLPService()  # Toujours disponible (Regex - gratuit)
        
        if USE_GEMINI:
            try:
                self.gemini_service = GeminiNLPService()  # Disponible si configuré
                self.gemini_available = True
                logger.info("✅ Approche hybride activée (Regex + Gemini)")
            except Exception as e:
                logger.warning(f"⚠️ Gemini non disponible: {e}")
                self.gemini_service = None
                self.gemini_available = False
        else:
            self.gemini_service = None
            self.gemini_available = False
            logger.info("⚡ Mode Regex uniquement (Gemini désactivé)")
    
    def _should_use_gemini(self, text: str) -> tuple:
        """
        🎯 Décider intelligemment entre Gemini (payant) et Regex (gratuit)
        
        Returns:
            (bool, str): (utiliser_gemini, raison)
        """
        text_lower = text.lower()
        
        # ✅ CAS 1 : Wolof détecté → GEMINI
        wolof_keywords = ['dama', 'jaay', 'jënd', 'xàllis', 'ñaata', 'wax', 'na', 'ci', 'bi', 'nga', 'ceeb', 'takk']
        if any(keyword in text_lower for keyword in wolof_keywords):
            return (True, "wolof_detected")
        
        # ✅ CAS 2 : Multiples montants → GEMINI
        # Détecter les montants suivis de "franc", "f", "fcfa" (même petits montants)
        amount_pattern = r'(\d+)\s*(?:franc|f|fcfa)'
        amounts = re.findall(amount_pattern, text_lower)
        if len(amounts) > 1:
            return (True, f"multiple_amounts_{len(amounts)}")
        
        # ✅ CAS 2b : Mot "et" avec montants → GEMINI (transactions multiples)
        # Exemple: "café à 50 francs et sucre à 1800 francs"
        if ' et ' in text_lower or ' et de ' in text_lower or ' et du ' in text_lower:
            # Vérifier qu'il y a au moins un montant avec "franc/fcfa" avant et après "et"
            parts = re.split(r'\s+et\s+(?:de|du)?\s+', text_lower)
            if len(parts) >= 2:
                has_amount_before = bool(re.search(amount_pattern, parts[0]))
                has_amount_after = bool(re.search(amount_pattern, parts[1]))
                if has_amount_before and has_amount_after:
                    return (True, "multiple_transactions_with_et")
        
        # ✅ CAS 3 : Mixed transactions (achat ET vente) → GEMINI
        has_expense = any(word in text_lower for word in ['achat', 'acheté', 'payé', 'dépense', 'dépensé', 'payer'])
        has_income = any(word in text_lower for word in ['vente', 'vendu', 'gagné', 'revenu', 'encaissé', 'vendre'])
        if has_expense and has_income:
            return (True, "mixed_transactions")
        
        # ✅ CAS 4 : Transcription floue ou trop courte → GEMINI
        if len(text.strip()) < 10:
            return (True, "transcription_floue")
        
        # ❌ CAS SIMPLE : Français simple, 1 montant → REGEX (gratuit)
        return (False, "simple_pattern")
    
    def post(self, request):
        audio_file = request.FILES.get('audio')
        user_id = request.user.id
        
        if not audio_file:
            return Response({'error': 'Audio file required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            audio_bytes = audio_file.read()
            audio_name = getattr(audio_file, 'name', 'audio')
            
            if self.gemini_available:
                # 🎯 APPROCHE HYBRIDE : Transcription → Décision → Regex OU Gemini
                context = {
                    'user_id': str(user_id),
                    'timestamp': str(timezone.now())
                }
                
                try:
                    # 📝 ÉTAPE 1 : Transcription audio (GRATUIT avec speech_recognition)
                    transcribed_text = self.legacy_service.transcribe_audio(audio_bytes, audio_name)
                    logger.info(f"📝 Transcription: '{transcribed_text}'")
                    
                    # 🎯 ÉTAPE 2 : Décision intelligente
                    # Si USE_GEMINI_ONLY_FOR_AUDIO est activé, forcer Gemini pour toutes les requêtes
                    if USE_GEMINI_ONLY_FOR_AUDIO:
                        # 🔬 MODE COLLECTE : Utiliser Gemini pour TOUTES les requêtes
                        # Permet de collecter les types d'entrées utilisateurs et bien paramétrer le système
                        use_gemini = True
                        reason = "gemini_only_mode_data_collection"
                        logger.info(f"🔬 Mode Gemini uniquement activé (collecte de données)")
                        logger.info(f"📊 Toutes les requêtes utiliseront Gemini pour analyser les patterns utilisateurs")
                    else:
                        # Mode hybride normal : décision intelligente
                        use_gemini, reason = self._should_use_gemini(transcribed_text)
                    
                    if use_gemini:
                        # ✅ CAS COMPLEXE ou MODE COLLECTE : Utiliser Gemini
                        logger.info(f"🔮 Gemini utilisé (raison: {reason})")
                        logger.info(f"💰 Coût estimé: ~$0.001")
                        analysis = self.gemini_service.analyze_text(transcribed_text, context)
                        ai_system = f"gemini_{reason}"
                    else:
                        # ✅ CAS SIMPLE : Utiliser Regex (gratuit)
                        logger.info(f"⚡ Regex utilisé (raison: {reason})")
                        logger.info(f"💰 Coût: $0")
                        analysis = self.legacy_service.extract_intent(transcribed_text)
                        
                        # Ajouter les champs manquants pour compatibilité
                        analysis['transcribed_text'] = transcribed_text
                        analysis['voice_response'] = self.legacy_service._generate_voice_response(
                            {'amount': analysis['entities'].get('amount', 0)},
                            analysis['intent']
                        )
                        analysis['processing_time_ms'] = 50  # Regex est très rapide
                        ai_system = f"regex_hybrid_{reason}"
                    
                    # 📤 Retourner la réponse au mobile
                    response_data = {
                        'success': analysis.get('intent') != 'unknown',
                        # IMPORTANT: si Gemini renvoie transcribed_text="" (vide), on doit fallback
                        # vers la transcription locale (speech_recognition).
                        'transcribed_text': (analysis.get('transcribed_text') or transcribed_text),
                        'intent': analysis.get('intent'),
                        'confidence': analysis.get('confidence', 0.0),
                        'entities': analysis.get('entities', {}),
                        'voice_response': analysis.get('voice_response', ''),
                        'requires_confirmation': analysis.get('intent') in ['declare_income', 'declare_expense'],
                        'language': analysis.get('language', 'french'),
                        'processing_time_ms': analysis.get('processing_time_ms', 0),
                        'ai_system': ai_system,  # 🔍 Pour tracking des coûts
                        'audio_analysis_method': 'hybrid'
                    }
                    
                    # ✅ Inclure transactions si mixed_transactions
                    if analysis.get('intent') == 'mixed_transactions' and 'transactions' in analysis:
                        response_data['transactions'] = analysis.get('transactions', [])
                        logger.info(f"📤 Retour au mobile avec {len(analysis.get('transactions', []))} transactions")
                    
                    return Response(response_data)
                    
                except Exception as e:
                    logger.error(f"❌ Erreur analyse hybride: {e}")
                    return Response({
                        'success': False,
                        'error': str(e),
                        'voice_response': 'Am na jàpp. Nelaw tambali.'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            else:
                # ⚡ Fallback : Regex uniquement (Gemini désactivé)
                transcribed_text = self.legacy_service.transcribe_audio(audio_bytes, audio_name)
                logger.info(f"📝 Transcription (Regex only): '{transcribed_text}'")
                logger.info(f"💰 Coût: $0")
                
                analysis = self.legacy_service.extract_intent(transcribed_text)
                voice_response = self.legacy_service._generate_voice_response(
                    {'amount': analysis['entities'].get('amount', 0)}, 
                    analysis['intent']
                )
                
                return Response({
                    'success': True,
                    'transcribed_text': transcribed_text,
                    'intent': analysis['intent'],
                    'confidence': analysis['confidence'],
                    'entities': analysis['entities'],
                    'voice_response': voice_response,
                    'requires_confirmation': analysis['intent'] in ['declare_income', 'declare_expense'],
                    'ai_system': 'regex_only',  # Gemini désactivé
                    'audio_analysis_method': 'regex'
                })
                
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
                'voice_response': 'Am na jàpp. Nelaw tambali.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VoiceExecuteAPIView(APIView):
    """API pour exécuter une action confirmée par l'utilisateur"""
    
    permission_classes = [permissions.IsAuthenticated]

    def __init__(self):
        super().__init__()
        self.nlp_service = WolofNLPService()
    
    def post(self, request):
        intent = request.data.get('intent')
        entities = request.data.get('entities', {})
        user_id = request.user.id
        
        # ✅ NOUVEAU : Récupérer les transactions pour mixed_transactions
        if intent == 'mixed_transactions':
            transactions = request.data.get('transactions', [])
            if transactions:
                entities['transactions'] = transactions
        
        if not intent:
            return Response({'error': 'Intent required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Exécuter l'action confirmée (ajout revenu/dépense, etc.)
            result = self.nlp_service._execute_action(intent, entities, user_id)
            voice_response = self.nlp_service._generate_voice_response(result, intent)

            response_data = {
                'success': True,
                'intent': intent,
                'result': result,
                'voice_response': voice_response
            }

            # 🔔 Déclencher une alerte automatique si revenu/dépense
            if intent in ['declare_expense', 'declare_income']:
                entrepreneur = request.user.entrepreneur  # ⚠️ adapte selon ton modèle
                alert = trigger_expense_revenue_alert(entrepreneur, request.user)
                response_data['alert_id'] = alert.id
                response_data['alert_message'] = alert.description
                response_data['alert_severity'] = alert.severity

            return Response(response_data)

        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
                'voice_response': 'Am na jàpp ci execution.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class VoiceCommandAPIView(APIView):
    """API pour recevoir et traiter les commandes vocales (ancien comportement)"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def __init__(self):
        super().__init__()
        self.nlp_service = WolofNLPService()
    
    def post(self, request):
        audio_file = request.FILES.get('audio')
        user_id = request.user.id
        
        if not audio_file:
            return Response({'error': 'Audio file required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            audio_bytes = audio_file.read()
            audio_name = getattr(audio_file, 'name', 'audio')
            result = self.nlp_service.process_voice_command(audio_bytes, user_id, audio_name)
            return Response(result)
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
                'voice_response': 'Am na jàpp. Nelaw tambali.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TextAnalyzeAPIView(APIView):
    """API pour analyser du texte SANS l'exécuter (avec Gemini)"""
    permission_classes = [permissions.IsAuthenticated]

    def __init__(self):
        super().__init__()
        # Utiliser Gemini ou fallback
        if USE_GEMINI:
            try:
                self.nlp_service = GeminiNLPService()
                self.use_gemini = True
            except Exception as e:
                print(f"⚠️ Gemini non disponible, fallback: {e}")
                self.nlp_service = WolofNLPService()
                self.use_gemini = False
        else:
            self.nlp_service = WolofNLPService()
            self.use_gemini = False

    def post(self, request):
        text = request.data.get('text', '')
        if not text:
            return Response({'error': 'text required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            if self.use_gemini:
                # ✅ GEMINI : Analyse moderne
                context = {
                    'user_id': str(request.user.id),
                    'timestamp': str(timezone.now())
                }
                analysis = self.nlp_service.analyze_text(text, context)

                return Response({
                    'success': analysis.get('intent') != 'unknown',
                    # Pour cohérence avec /voice/analyze/ : si transcribed_text est vide, fallback sur text
                    'transcribed_text': (analysis.get('transcribed_text') or text),
                    'intent': analysis.get('intent'),
                    'confidence': analysis.get('confidence', 0.0),
                    'entities': analysis.get('entities', {}),
                    'voice_response': analysis.get('voice_response', ''),
                    'requires_confirmation': analysis.get('intent') in ['declare_income', 'declare_expense'],
                    'language': analysis.get('language', 'french'),
                    'processing_time_ms': analysis.get('processing_time_ms', 0),
                    'ai_system': 'gemini'
                })
            else:
                # ❌ ANCIEN : Fallback
                analysis = self.nlp_service.extract_intent(text)
                voice_response = self.nlp_service._generate_voice_response(
                    {'amount': analysis['entities'].get('amount', 0)}, 
                    analysis['intent']
                )

                return Response({
                    'success': True,
                    'transcribed_text': text,
                    'intent': analysis['intent'],
                    'confidence': analysis['confidence'],
                    'entities': analysis['entities'],
                    'voice_response': voice_response,
                    'requires_confirmation': analysis['intent'] in ['declare_income', 'declare_expense'],
                    'ai_system': 'legacy'
                })
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
                'voice_response': 'Am na jàpp ci analysis.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TextCommandAPIView(APIView):
    """API de debug: texte -> intent -> DB (ancien comportement)"""
    permission_classes = [permissions.IsAuthenticated]

    def __init__(self):
        super().__init__()
        self.nlp_service = WolofNLPService()

    def post(self, request):
        text = request.data.get('text', '')
        if not text:
            return Response({'error': 'text required'}, status=status.HTTP_400_BAD_REQUEST)

        # Simuler le traitement vocal avec du texte
        analysis = self.nlp_service.extract_intent(text)
        result = self.nlp_service._execute_action(analysis['intent'], analysis['entities'], request.user.id)
        voice_response = self.nlp_service._generate_voice_response(result, analysis['intent'])

        return Response({
            'success': True,
            'transcribed_text': text,
            'intent': analysis['intent'],
            'result': result,
            'voice_response': voice_response
        })
# ═══════════════════════════════════════════════════════════════════
# 🆕 NOUVEAUX SERVICES IA AVANCÉS
# ═══════════════════════════════════════════════════════════════════

from apps.ai.financial_analysis import get_financial_analysis_service
from apps.ai.recommendation import get_recommendation_service
from apps.ai.business_plan_ai import get_business_plan_ai_service
from apps.ai.recurring_expense import get_recurring_expense_service
from apps.entrepreneurs.models import Entrepreneur, Activity
from apps.alerts_ai.models import AIAnalysis
from rest_framework.permissions import IsAuthenticated


class FinancialHealthAnalysisAPIView(APIView):
    """
    POST /api/ai/financial/analyze/
    Analyser la santé financière d'un entrepreneur
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Analyser la santé financière"""
        try:
            entrepreneur_id = request.data.get('entrepreneur_id')
            period_days = request.data.get('period_days', 30)
            
            if not entrepreneur_id:
                return Response({
                    'error': 'entrepreneur_id requis'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Récupérer l'entrepreneur
            entrepreneur = Entrepreneur.objects.filter(id=entrepreneur_id).first()
            if not entrepreneur:
                return Response({
                    'error': 'Entrepreneur non trouvé'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Vérifier les permissions
            if request.user.role != 'admin' and entrepreneur.user != request.user:
                return Response({
                    'error': 'Non autorisé'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Analyser
            service = get_financial_analysis_service()
            result = service.analyze_financial_health(entrepreneur, period_days)
            
            if not result.get('success'):
                return Response(result, status=status.HTTP_400_BAD_REQUEST)
            
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"❌ Erreur API financial health: {e}", exc_info=True)
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GenerateRecommendationsAPIView(APIView):
    """
    POST /api/ai/recommendations/generate/
    Générer des recommandations basées sur une analyse
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Générer des recommandations"""
        try:
            entrepreneur_id = request.data.get('entrepreneur_id')
            analysis_id = request.data.get('analysis_id')
            num_recommendations = request.data.get('num_recommendations', 5)
            
            if not entrepreneur_id or not analysis_id:
                return Response({
                    'error': 'entrepreneur_id et analysis_id requis'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            entrepreneur = Entrepreneur.objects.filter(id=entrepreneur_id).first()
            if not entrepreneur:
                return Response({
                    'error': 'Entrepreneur non trouvé'
                }, status=status.HTTP_404_NOT_FOUND)
            
            ai_analysis = AIAnalysis.objects.filter(id=analysis_id).first()
            if not ai_analysis:
                return Response({
                    'error': 'Analyse non trouvée'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Générer recommandations
            service = get_recommendation_service()
            result = service.generate_recommendations(
                entrepreneur, 
                ai_analysis, 
                num_recommendations
            )
            
            if not result.get('success'):
                return Response(result, status=status.HTTP_400_BAD_REQUEST)
            
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"❌ Erreur API recommendations: {e}", exc_info=True)
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GenerateBusinessPlanAIAPIView(APIView):
    """
    POST /api/ai/business-plan/generate/
    Générer un business plan avec IA
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Générer un business plan IA"""
        try:
            entrepreneur_id = request.data.get('entrepreneur_id')
            activity_id = request.data.get('activity_id')
            sector = request.data.get('sector')
            answers = request.data.get('answers', {})
            language = request.data.get('language', 'french')
            
            if not all([entrepreneur_id, activity_id, sector]):
                return Response({
                    'error': 'entrepreneur_id, activity_id et sector requis'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            entrepreneur = Entrepreneur.objects.filter(id=entrepreneur_id).first()
            if not entrepreneur:
                return Response({
                    'error': 'Entrepreneur non trouvé'
                }, status=status.HTTP_404_NOT_FOUND)
            
            activity = Activity.objects.filter(id=activity_id).first()
            if not activity:
                return Response({
                    'error': 'Activité non trouvée'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Générer business plan
            service = get_business_plan_ai_service()
            result = service.generate_business_plan(
                entrepreneur, 
                activity, 
                sector, 
                answers,
                language
            )
            
            if not result.get('success'):
                return Response(result, status=status.HTTP_400_BAD_REQUEST)
            
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"❌ Erreur API business plan: {e}", exc_info=True)
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DetectRecurringExpensesAPIView(APIView):
    """
    POST /api/ai/recurring-expenses/detect/
    Détecter les dépenses récurrentes et créer des rappels
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Détecter les dépenses récurrentes"""
        try:
            # Log des données reçues pour debug
            logger.info(f"📥 Requête reçue - User: {request.user}, Data: {request.data}")
            
            entrepreneur_id = request.data.get('entrepreneur_id')
            lookback_days = request.data.get('lookback_days', 90)
            
            if not entrepreneur_id:
                logger.warning(f"⚠️ entrepreneur_id manquant dans la requête")
                return Response({
                    'success': False,
                    'error': 'entrepreneur_id requis'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            entrepreneur = Entrepreneur.objects.filter(id=entrepreneur_id).first()
            if not entrepreneur:
                logger.warning(f"⚠️ Entrepreneur non trouvé: {entrepreneur_id}")
                return Response({
                    'success': False,
                    'error': 'Entrepreneur non trouvé'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Vérifier les permissions
            if request.user.role != 'admin' and entrepreneur.user != request.user:
                logger.warning(f"⚠️ Accès non autorisé - User: {request.user.id}, Entrepreneur: {entrepreneur.user.id}")
                return Response({
                    'success': False,
                    'error': 'Non autorisé'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Détecter
            logger.info(f"🔍 Démarrage détection pour entrepreneur {entrepreneur_id}")
            service = get_recurring_expense_service()
            result = service.detect_recurring_expenses(entrepreneur, lookback_days)
            
            # Log du résultat pour debug
            logger.info(f"📊 Résultat détection: success={result.get('success')}, error={result.get('error')}, expenses_count={len(result.get('recurring_expenses', []))}")
            
            if not result.get('success'):
                logger.warning(f"⚠️ Détection échouée: {result.get('error')} - {result.get('message', '')}")
                return Response(result, status=status.HTTP_400_BAD_REQUEST)
            
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"❌ Erreur API recurring expenses: {e}", exc_info=True)
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
