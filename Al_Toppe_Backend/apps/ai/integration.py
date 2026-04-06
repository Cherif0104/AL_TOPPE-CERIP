# apps/ai/integration.py - Version optimisée avec analyse améliorée

import os
import tempfile
import speech_recognition as sr
from pydub import AudioSegment
from pydub.utils import which
import io
import logging
from typing import Dict, List, Optional
from .voice_response import WolofVoiceResponse
import uuid
from django.db import models
from apps.entrepreneurs.models import Entrepreneur
from apps.finances.models import CashflowEntry
from apps.finances.models import Category
from django.utils import timezone
from django.db import transaction
from .categories import CATEGORIES
import re

logger = logging.getLogger(__name__)

# Configure pydub
try:
    AudioSegment.converter = which("ffmpeg") or which("ffmpeg.exe") or AudioSegment.converter
    AudioSegment.ffprobe = which("ffprobe") or which("ffprobe.exe") or AudioSegment.ffprobe
except Exception:
    pass

class WolofNLPService:
    """Service de traitement du langage naturel en Wolof avec transcription réelle"""
    
    def __init__(self):
        self.intents = {
            'declare_income': ['jaay', 'vente', 'vendu', 'reçu', 'naata', 'gagne', 'vendu', 'remboursements', 'remboursement'],
            'declare_expense': ['jënd','diana', 'acheté', 'achat', 'payé','paiement', 'dépensé', 'wut', 'buy'],
            'check_balance': ['xàllis', 'argent', 'solde','solde_de_compte', 'naata', 'compte', 'fane', 'balance', 'money'],
            'expense_balance': ['xàllis','combien', 'dépense', 'mes depanse', 'mes depenses', 'mes dépense', 'mes dépenses'],
            'income_balance': ['revenu','revenus','revenir'],
            'stock_update': ['stock', 'produit', 'reste', 'inventaire'],
            'ask_advice': ['conseil', 'aide', 'que faire', 'suggestion'],
            'merci': ['merci', 'merci_beaucoup', 'merci_encore', 'merci_pour_l\'aide', 'merci_pour_le_conseil', 'merci_pour_la_suggestion'],
        }
        self.debug_mode = False
        self.debug_text = ""
        self.voice_response = WolofVoiceResponse()
        self.recognizer = sr.Recognizer()
        
        self.wolof_french_mapping = {
            'jaay': 'vente',
            'jënd': 'dépense', 
            'xàllis': 'argent',
            'naata': 'combien',
            'fane': 'où',
            'ceeb': 'riz',
            'tay': 'thé',
        }

    def _calculate_balance(self, entrepreneur: Entrepreneur) -> float:
        """Calculer le solde de l'entrepreneur"""
        ventes = CashflowEntry.objects.filter(entrepreneur=entrepreneur, type='income').aggregate(total=models.Sum('amount'))['total'] or 0
        dépenses = CashflowEntry.objects.filter(entrepreneur=entrepreneur, type='expense').aggregate(total=models.Sum('amount'))['total'] or 0
        return ventes - dépenses

    def _calculate_expense(self, entrepreneur: Entrepreneur) -> float:
        """Calculer les dépenses totales"""
        return CashflowEntry.objects.filter(entrepreneur=entrepreneur, type='expense').aggregate(total=models.Sum('amount'))['total'] or 0

    def _calculate_income(self, entrepreneur: Entrepreneur) -> float:
        """Calculer les revenus totaux"""
        return CashflowEntry.objects.filter(entrepreneur=entrepreneur, type='income').aggregate(total=models.Sum('amount'))['total'] or 0
    
    def _execute_action(self, intent: str, entities: Dict, user_id: uuid.UUID) -> Dict:
        """Exécuter l'action correspondante avec logique améliorée"""
        try:
            entrepreneur = Entrepreneur.objects.get(user_id=user_id)
            activity = entrepreneur.activities.first()
            if not activity:
                return {'error': "Aucune activité trouvée pour l'utilisateur", 'action': 'no_activity'}

            # ✅ NOUVEAU : Gérer les TRANSACTIONS MIXTES (dépense + revenu dans la même phrase)
            if intent == 'mixed_transactions':
                transactions_list = entities.get('transactions', [])
                
                if not transactions_list:
                    return {'error': "Aucune transaction trouvée", 'action': 'no_transactions'}
                
                logger.info(f"🔄 Transaction mixte détectée: {len(transactions_list)} transactions")
                
                entries_created = []
                total_expenses = 0
                total_incomes = 0
                
                with transaction.atomic():
                    for i, trans in enumerate(transactions_list):
                        trans_type = trans.get('type')  # 'expense' ou 'income'
                        amount = trans.get('amount', 0)
                        item = trans.get('item')
                        cat_name = trans.get('category', 'divers')
                        
                        # Créer/obtenir la catégorie (utiliser le nom exact de la catégorie officielle)
                        cat_obj, _ = Category.objects.get_or_create(
                            name=cat_name.strip(),
                            defaults={'type': trans_type, 'description': 'Créé par IA vocale'}
                        )
                        
                        # Construire la description
                        if trans_type == 'expense':
                            description, title_suffix = self._build_expense_description(cat_obj.name, item)
                            entry_type = 'expense'
                            total_expenses += float(amount)
                        else:  # income
                            description, title_suffix = self._build_income_description(cat_obj.name, item)
                            entry_type = 'income'
                            total_incomes += float(amount)
                        
                        entry_title = f"{entry_type.capitalize()} {i+1}/{len(transactions_list)} - {title_suffix}" if title_suffix else f"{entry_type.capitalize()} {i+1}/{len(transactions_list)}"
                        
                        # Créer l'entrée
                        entry = CashflowEntry.objects.create(
                            entrepreneur=entrepreneur,
                            activity=activity,
                            title=entry_title,
                            description=f"{description} (Transaction mixte {i+1}/{len(transactions_list)})",
                            type=entry_type,
                            amount=amount,
                            category=cat_obj,
                            date=timezone.now().date(),
                            payment_status='paid'
                        )
                        
                        entries_created.append({
                            'id': str(entry.id),
                            'type': entry_type,
                            'amount': float(amount),
                            'item': item,
                            'category': cat_obj.name
                        })
                
                message = f"{len(entries_created)} transactions enregistrées: {total_expenses} FCFA dépensés, {total_incomes} FCFA gagnés"
                
                return {
                    'action': 'mixed_transactions_created',
                    'entries': entries_created,
                    'count': len(entries_created),
                    'total_expenses': total_expenses,
                    'total_incomes': total_incomes,
                    'net': total_incomes - total_expenses,
                    'message': message
                }

            # ✅ ANCIEN : Gérer les tableaux de montants (phrases complexes SAME TYPE)
            amounts = entities.get('amount') or 0
            items = entities.get('item')
            categories = entities.get('category') or 'divers'
            
            # Normaliser en listes
            if not isinstance(amounts, list):
                amounts = [amounts]
            if not isinstance(items, list):
                items = [items] if items else [None]
            if not isinstance(categories, list):
                categories = [categories]
            
            # Détecter les transactions multiples
            multiple_transactions = len(amounts) > 1
            
            if multiple_transactions:
                logger.info(f"🔄 Transaction multiple détectée: {len(amounts)} montants")
            
            # ✅ Créer plusieurs entrées si nécessaire
            if intent == 'declare_expense' and multiple_transactions:
                # Créer une entrée pour chaque montant
                entries_created = []
                total_amount = 0
                
                with transaction.atomic():
                    for i, amount in enumerate(amounts):
                        # Obtenir l'item et la catégorie correspondants
                        item = items[i] if i < len(items) else items[0] if items else None
                        cat_name = categories[i] if i < len(categories) else categories[0] if categories else 'divers'
                        
                        # Créer/obtenir la catégorie (utiliser le nom exact de la catégorie officielle)
                        cat_obj, _ = Category.objects.get_or_create(
                            name=cat_name.strip(),
                            defaults={'type': 'expense', 'description': 'Créé par IA vocale'}
                        )
                        
                        # Construire la description
                        description, title_suffix = self._build_expense_description(cat_obj.name, item)
                        expense_title = f"Dépense {i+1}/{len(amounts)} - {title_suffix}" if title_suffix else f"Dépense {i+1}/{len(amounts)}"
                        
                        # Créer l'entrée
                        entry = CashflowEntry.objects.create(
                            entrepreneur=entrepreneur,
                            activity=activity,
                            title=expense_title,
                            description=f"{description} (Transaction multiple {i+1}/{len(amounts)})",
                            type='expense',
                            amount=amount,
                            category=cat_obj,
                            date=timezone.now().date(),
                            payment_status='paid'
                        )
                        
                        entries_created.append({
                            'id': str(entry.id),
                            'amount': float(amount),
                            'item': item,
                            'category': cat_obj.name
                        })
                        total_amount += float(amount)
                
                message = f"{len(entries_created)} dépenses enregistrées pour un total de {total_amount} FCFA"
                
                return {
                    'action': 'multiple_expenses_created',
                    'entries': entries_created,
                    'count': len(entries_created),
                    'total_amount': total_amount,
                    'message': message
                }
            
            elif intent == 'declare_expense':
                # Transaction simple (un seul montant)
                amount = amounts[0]
                item = items[0] if items else None
                cat_name = categories[0] if categories else 'divers'
                
                # Utiliser le nom exact de la catégorie officielle (sans conversion en minuscules)
                cat_obj, _ = Category.objects.get_or_create(
                    name=cat_name.strip(),
                    defaults={'type': 'expense', 'description': 'Créé par IA vocale'}
                )
                
                description, title_suffix = self._build_expense_description(cat_obj.name, item)
                expense_title = f"Dépense - {title_suffix}" if title_suffix else f"Dépense - {timezone.now().strftime('%Y-%m-%d %H:%M')}"
                
                with transaction.atomic():
                    entry = CashflowEntry.objects.create(
                        entrepreneur=entrepreneur,
                        activity=activity,
                        title=expense_title,
                        description=description,
                        type='expense',
                        amount=amount,
                        category=cat_obj,
                        date=timezone.now().date(),
                        payment_status='paid'
                    )
                
                return {
                    'action': 'expense_created', 
                    'id': str(entry.id), 
                    'amount': float(amount), 
                    'category': cat_obj.name,
                    'item': item,
                    'message': f"Dépense de {amount} FCFA enregistrée : {description}"
                }

            elif intent == 'declare_income' and multiple_transactions:
                # Créer une entrée pour chaque montant (revenus multiples)
                entries_created = []
                total_amount = 0
                
                with transaction.atomic():
                    for i, amount in enumerate(amounts):
                        # Obtenir l'item et la catégorie correspondants
                        item = items[i] if i < len(items) else items[0] if items else None
                        cat_name = categories[i] if i < len(categories) else categories[0] if categories else 'divers'
                        
                        # Créer/obtenir la catégorie (utiliser le nom exact de la catégorie officielle)
                        cat_obj, _ = Category.objects.get_or_create(
                            name=cat_name.strip(),
                            defaults={'type': 'income', 'description': 'Créé par IA vocale'}
                        )
                        
                        # Construire la description
                        description, title_suffix = self._build_income_description(cat_obj.name, item)
                        income_title = f"Revenu {i+1}/{len(amounts)} - {title_suffix}" if title_suffix else f"Revenu {i+1}/{len(amounts)}"
                        
                        # Créer l'entrée
                        entry = CashflowEntry.objects.create(
                            entrepreneur=entrepreneur,
                            activity=activity,
                            title=income_title,
                            description=f"{description} (Transaction multiple {i+1}/{len(amounts)})",
                            type='income',
                            amount=amount,
                            category=cat_obj,
                            date=timezone.now().date(),
                            payment_status='paid'
                        )
                        
                        entries_created.append({
                            'id': str(entry.id),
                            'amount': float(amount),
                            'item': item,
                            'category': cat_obj.name
                        })
                        total_amount += float(amount)
                
                message = f"{len(entries_created)} revenus enregistrés pour un total de {total_amount} FCFA"
                
                return {
                    'action': 'multiple_incomes_created',
                    'entries': entries_created,
                    'count': len(entries_created),
                    'total_amount': total_amount,
                    'message': message
                }

            elif intent == 'declare_income':
                # Transaction simple (un seul revenu)
                amount = amounts[0]
                item = items[0] if items else None
                cat_name = categories[0] if categories else 'divers'
                
                cat_obj, _ = Category.objects.get_or_create(
                    name=cat_name.strip().lower(),
                    defaults={'type': 'income', 'description': 'Créé par IA vocale'}
                )
                
                description, title_suffix = self._build_income_description(cat_obj.name, item)
                income_title = f"Revenu - {title_suffix}" if title_suffix else f"Revenu - {timezone.now().strftime('%Y-%m-%d %H:%M')}"

                with transaction.atomic():
                    entry = CashflowEntry.objects.create(
                        entrepreneur=entrepreneur,
                        activity=activity,
                        title=income_title,
                        description=description,
                        type='income',
                        amount=amount,
                        category=cat_obj,
                        date=timezone.now().date(),
                        payment_status='paid'
                    )
                
                return {
                    'action': 'income_created', 
                    'id': str(entry.id), 
                    'amount': float(amount), 
                    'category': cat_obj.name,
                    'item': item,
                    'message': f"Revenu de {amount} FCFA enregistré : {description}"
                }

            elif intent == 'check_balance':
                balance = self._calculate_balance(entrepreneur)
                return {'action': 'balance', 'balance': balance, 'message': f"Votre solde actuel est de {balance} FCFA"}

            elif intent == 'expense_balance':
                balance = self._calculate_expense(entrepreneur)
                return {'action': 'balance', 'balance': balance, 'message': f"Vos dépenses totales sont de {balance} FCFA"}

            elif intent == 'income_balance':
                balance = self._calculate_income(entrepreneur)
                return {'action': 'balance', 'balance': balance, 'message': f"Vos revenus totaux sont de {balance} FCFA"}

            elif intent == 'merci':
                return {'action': 'merci', 'message': 'Je vous en prie ! Bonne journée.'}
                
            return {'action': 'unknown_intent'}

        except Exception as e:
            logger.error(f"Erreur exécution action: {e}", exc_info=True)
            return {'error': str(e)}

    def _build_expense_description(self, category: str, item: Optional[str]) -> tuple:
        """
        Construire un titre et une description détaillée pour une dépense selon la catégorie et l'item.
        Retourne : (titre, description)
        """

        # Dictionnaire des catégories et items avec titres spécifiques
        category_configs = {
            'logement': {
                'default': 'Paiement de logement',
                'items': {
                    'loyer': 'Paiement du loyer',
                    'eau': 'Facture d’eau',
                    'électricité': 'Facture d’électricité',
                    'electricite': 'Facture d’électricité',
                    'gaz': 'Facture de gaz',
                    'internet': 'Abonnement internet du logement',
                    'taxe': 'Taxe foncière ou d’habitation',
                    'entretien': 'Entretien du logement',
                },
                'description': "Dépense liée à l'habitation, incluant le loyer, les factures et les charges domestiques."
            },

            'transport': {
                'default': 'Frais de transport',
                'items': {
                    'essence': 'Achat de carburant',
                    'carburant': 'Plein de carburant',
                    'gasoil': 'Plein de gasoil',
                    'taxi': 'Course en taxi',
                    'bus': 'Ticket de bus',
                    'réparation': 'Réparation du véhicule',
                    'assurance': 'Assurance automobile',
                    'péage': 'Frais de péage',
                    'parking': 'Frais de stationnement',
                },
                'description': "Dépense liée aux déplacements personnels ou professionnels : carburant, transport public, entretien, etc."
            },

            'services': {
                'default': 'Prestation de service',
                'items': {
                    'maçon': 'Travaux de maçonnerie',
                    'plombier': 'Travaux de plomberie',
                    'électricien': 'Travaux d’électricité',
                    'menuisier': 'Travaux de menuiserie',
                    'peintre': 'Travaux de peinture',
                    'technicien': 'Intervention technique',
                    'consultant': 'Consultation ou prestation de conseil',
                    'avocat': 'Honoraires juridiques',
                },
                'description': "Paiement pour un service ou une prestation fournie par un professionnel ou artisan."
            },

            'salaires': {
                'default': 'Paiement de salaire',
                'items': {
                    'prime': 'Versement de prime',
                    'emploi': 'Versement de salaires',
                    'employé': 'Versement de salaires',
                    'employés': 'Versement de salaires',
                    'bonus': 'Versement de bonus',
                    'commission': 'Paiement de commission',
                },
                'description': "Rémunération versée aux employés, collaborateurs ou prestataires sous contrat."
            },

            'alimentation': {
                'default': 'Achat alimentaire',
                'items': {
                    'riz': 'Achat de riz',
                    'pain': 'Achat de pain',
                    'viande': 'Achat de viande',
                    'poisson': 'Achat de poisson',
                    'restaurant': 'Repas au restaurant',
                    'épicerie': 'Courses à l’épicerie',
                },
                'description': "Dépenses pour la nourriture, les boissons et les produits alimentaires du quotidien."
            },

            'santé': {
                'default': 'Frais de santé',
                'items': {
                    'médicament': 'Achat de médicaments',
                    'pharmacie': 'Achat en pharmacie',
                    'consultation': 'Consultation médicale',
                    'analyse': 'Analyse ou examen médical',
                },
                'description': "Dépenses liées à la santé : consultations, médicaments, soins ou hospitalisation."
            },

            'communication': {
                'default': 'Frais de communication',
                'items': {
                    'forfait': 'Recharge forfait mobile',
                    'téléphone': 'Abonnement téléphonique',
                    'internet': 'Abonnement internet',
                    'recharge': 'Achat de crédit téléphonique',
                },
                'description': "Frais de télécommunication : téléphone, internet, abonnements et forfaits mobiles."
            },

            'habillement': {
                'default': 'Achat d’habillement',
                'items': {
                    'vêtement': 'Achat de vêtements',
                    'chaussure': 'Achat de chaussures',
                    'bijou': 'Achat de bijoux ou accessoires',
                    'boutique': 'Achat dans une boutique de mode',
                },
                'description': "Dépenses pour les vêtements, chaussures et accessoires de mode."
            },

            'éducation': {
                'default': 'Frais d’éducation',
                'items': {
                    'inscription': 'Frais d’inscription scolaire',
                    'livre': 'Achat de livres ou fournitures',
                    'formation': 'Paiement de formation',
                    'cours': 'Paiement de cours particuliers',
                },
                'description': "Dépenses liées à l’éducation, la formation et l’apprentissage."
            },

            'impôts': {
                'default': 'Paiement d’impôts',
                'items': {
                    'taxe': 'Paiement de taxe',
                    'tva': 'Règlement de TVA',
                    'contribution': 'Contribution fiscale',
                },
                'description': "Paiements relatifs aux impôts, taxes et contributions obligatoires."
            },
        }


        config = category_configs.get(category, {'default': f'Dépense {category}', 'items': {}})
        
        if item and item in config['items']:
            description = config['items'][item]
        else:
            description = config['default']
        
        # Titre simplifié (sans "Paiement de" etc)
        if item:
            title_suffix = item.capitalize()
        else:
            title_suffix = category.capitalize()
            
        return description, title_suffix

    def _build_income_description(self, category: str, item: Optional[str]) -> tuple:
        """Construire description et titre pour revenu selon catégorie et item"""
        category_configs = {
            'services': {'prefix': 'Prestation', 'verb': 'prestation'},
            'consultation': {'prefix': 'Consultation', 'verb': 'consultation'},
            'formation': {'prefix': 'Formation', 'verb': 'formation'},
            'vente': {'prefix': 'Vente de', 'verb': 'vente'},
            'alimentation': {'prefix': 'Vente de', 'verb': 'vente'},
            'habillement': {'prefix': 'Vente de', 'verb': 'vente'},
        }
        
        config = category_configs.get(category, {'prefix': 'Revenu', 'verb': 'revenu'})
        
        if item:
            description = f"{config['prefix']} {item}"
            title_suffix = f"{item.capitalize()}"
        elif category != 'divers':
            description = f"{config['prefix']} {category}"
            title_suffix = category.capitalize()
        else:
            description = "Revenu divers"
            title_suffix = "Divers"
        
        return description, title_suffix
    
    def _generate_voice_response(self, result: Dict, intent: str) -> str:
        """Générer une réponse vocale appropriée"""
        try:
            # ✅ NOUVEAU : Vérifier l'action pour les transactions multiples
            action = result.get('action', '')
            
            if intent == 'mixed_transactions':
                # ✅ Réponse pour transactions mixtes
                total_expenses = result.get('total_expenses', 0)
                total_incomes = result.get('total_incomes', 0)
                count = result.get('count', 0)
                return f"D'accord! {count} transactions enregistrées: {total_expenses} FCFA dépensés, {total_incomes} FCFA gagnés."
            
            if action == 'multiple_incomes_created':
                # ✅ NOUVEAU : Réponse pour revenus multiples
                count = result.get('count', 0)
                total = result.get('total_amount', 0)
                return f"Parfait! {count} revenus enregistrés pour un total de {total:,.0f} FCFA.".replace(',', ' ')
            
            if action == 'multiple_expenses_created':
                # ✅ NOUVEAU : Réponse pour dépenses multiples
                count = result.get('count', 0)
                total = result.get('total_amount', 0)
                return f"D'accord! {count} dépenses enregistrées pour un total de {total:,.0f} FCFA.".replace(',', ' ')
            
            if intent == 'declare_income':
                return self.voice_response.generate_response('income_declared', {
                    'amount': result.get('amount', 0)
                }, language='french')
            if intent == 'declare_expense':
                return self.voice_response.generate_response('expense_declared', {
                    'amount': result.get('amount', 0)
                }, language='french')
            if intent == 'check_balance':
                return self.voice_response.generate_response('balance_check', {
                    'balance': result.get('balance', 0)
                }, language='french')
            if intent == 'expense_balance':
                return self.voice_response.generate_response('balance_expense', {
                    'balance': result.get('balance', 0)
                }, language='french')
            if intent == 'income_balance':
                return self.voice_response.generate_response('balance_income', {
                    'balance': result.get('balance', 0)
                }, language='french')
            if intent == 'merci':
                return self.voice_response.generate_response('merci', {}, language='french')
            return self.voice_response.generate_response('error', {}, language='french')
        except Exception:
            return "Lu taxaw. Waxaat sannu, baal ma."

    def transcribe_audio(self, audio_data: bytes, filename_hint: str = "audio.wav") -> str:
        """Transcrire l'audio wolof/français en texte"""
        try:
            logger.info(f"Audio data received: {len(audio_data) if audio_data else 0} bytes")
            
            if self.debug_mode and self.debug_text:
                logger.info(f"Debug mode active, returning: {self.debug_text}")
                return self.debug_text
            
            if not audio_data or len(audio_data) < 100:
                logger.warning("Audio data is empty or too short")
                return "dégguma li nga wax"
            
            transcribed_text = self._process_audio_data(audio_data, filename_hint)
            
            if not transcribed_text:
                logger.warning("Transcription failed, no text returned")
                return "dégguma li nga wax"
                # return "dégguma li nga wax"
            
            cleaned_text = self._clean_and_normalize_text(transcribed_text)
            logger.info(f"Transcribed and cleaned text: {cleaned_text}")
            
            return cleaned_text
                
        except Exception as e:
            logger.error(f"Erreur transcription audio: {e}")
            return "am na jàpp ci transcription"

    def _process_audio_data(self, audio_data: bytes, filename_hint: str = "audio.wav") -> str:
        """Traiter les données audio et les transcrire"""
        try:
            suffix = os.path.splitext(filename_hint)[1] or '.wav'
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp_audio:
                temp_path = temp_audio.name
                temp_audio.write(audio_data)
                temp_audio.flush()
                
                logger.info(f"Audio file created: {temp_path}")
                
                normalized_path = None
                try:
                    normalized_path = self._normalize_audio_format(temp_path)
                    transcribed_text = self._transcribe_audio_file(normalized_path)
                    return transcribed_text or ""
                finally:
                    # Nettoyer les fichiers temporaires avec retry pour Windows
                    self._cleanup_temp_file(normalized_path)
                    self._cleanup_temp_file(temp_path)
                        
        except Exception as e:
            logger.error(f"Error processing audio data: {e}")
            return ""

    def _normalize_audio_format(self, audio_path: str) -> str:
        """Normaliser en WAV mono 16kHz"""
        try:
            candidates = []
            ext = os.path.splitext(audio_path)[1].lower().strip('.')
            if ext:
                candidates.append(ext)
            for f in ['m4a', 'mp4', 'aac', 'mp3', 'ogg', 'caf', '3gp', 'wav', 'flac', None]:
                if f not in candidates:
                    candidates.append(f)

            audio = None
            last_err = None
            for fmt in candidates:
                try:
                    audio = AudioSegment.from_file(audio_path, format=fmt)
                    logger.info(f"Loaded audio using format={fmt}")
                    break
                except Exception as ie:
                    last_err = ie
                    continue

            if audio is None:
                raise last_err or Exception("Unsupported audio format")

            # ✅ Amélioration de la qualité audio
            audio = audio.set_frame_rate(16000).set_channels(1)
            
            # Augmenter le volume si trop faible
            if audio.dBFS < -30:  # Si l'audio est trop faible
                gain = -20 - audio.dBFS  # Augmenter jusqu'à -20 dBFS
                audio = audio + gain
                logger.info(f"Audio volume increased by {gain:.1f} dB (was {audio.dBFS:.1f} dBFS)")
            
            # Normaliser le volume
            audio = audio.normalize()
            logger.info(f"Audio normalized to {audio.dBFS:.1f} dBFS")
            
            normalized_path = audio_path + ".norm.wav"
            audio.export(normalized_path, format="wav", parameters=["-ar", "16000", "-ac", "1"])
            logger.info(f"Audio exported: {normalized_path}")
            return normalized_path

        except Exception as e:
            logger.warning(f"Error normalizing audio format: {e}")
            return audio_path
    
    def _cleanup_temp_file(self, file_path: Optional[str]) -> None:
        """Nettoyer un fichier temporaire avec retry pour Windows"""
        if not file_path:
            return
        
        try:
            import time
            time.sleep(0.1)  # Petit délai pour laisser le système libérer le fichier
            
            if os.path.exists(file_path):
                os.unlink(file_path)
        except PermissionError as e:
            # Sur Windows, le fichier peut être encore utilisé
            logger.warning(f"Impossible de supprimer temporairement {file_path}: {e}. Le fichier sera supprimé automatiquement.")
        except OSError as e:
            # Autres erreurs OS (fichier déjà supprimé, etc.)
            if e.errno != 2:  # Ignorer "file not found"
                logger.warning(f"Erreur suppression fichier temporaire {file_path}: {e}")
        except Exception as e:
            logger.warning(f"Erreur inattendue suppression fichier temporaire {file_path}: {e}")
        
    def process_voice_command(self, audio_data: bytes, user_id: uuid.UUID) -> Dict:
        """Traiter une commande vocale complète"""
        return {}

    def _transcribe_audio_file(self, audio_path: str) -> str:
        """Transcrire un fichier audio en texte"""
        try:
            with sr.AudioFile(audio_path) as source:
                # ✅ Augmenter la durée d'ajustement du bruit ambiant
                self.recognizer.adjust_for_ambient_noise(source, duration=1.0)
                audio_data = self.recognizer.record(source)
                
            transcription_results = []
            
            # Essayer d'abord français
            try:
                text = self.recognizer.recognize_google(
                    audio_data, 
                    language='fr-FR',
                    show_all=False
                )
                if text:
                    transcription_results.append(text.lower())
                    logger.info(f"Google Speech (fr-FR) result: {text}")
            except sr.UnknownValueError:
                logger.warning("Google Speech (fr-FR) could not understand audio")
            except sr.RequestError as e:
                logger.warning(f"Google Speech (fr-FR) error: {e}")
            
            # ✅ Si français échoue, essayer wolof/anglais
            if not transcription_results:
                try:
                    text = self.recognizer.recognize_google(
                        audio_data, 
                        language='en-US',  # Wolof n'est pas supporté directement, utiliser anglais
                        show_all=False
                    )
                    if text:
                        transcription_results.append(text.lower())
                        logger.info(f"Google Speech (en-US) result: {text}")
                except sr.UnknownValueError:
                    logger.warning("Google Speech (en-US) could not understand audio")
                except sr.RequestError as e:
                    logger.warning(f"Google Speech (en-US) error: {e}")
            
            if transcription_results:
                best_result = max(transcription_results, key=len)
                return best_result
            
            return ""
            
        except Exception as e:
            logger.error(f"Error transcribing audio file: {e}")
            return ""

    def _clean_and_normalize_text(self, text: str) -> str:
        """Nettoyer et normaliser le texte transcrit"""
        if not text:
            return ""
        
        try:
            # Préserver le texte original pour l'analyse, mais nettoyer intelligemment
            text = text.strip()
            
            # Filtrer les mots parasites à la fin (et toi, et vous, etc.)
            parasite_patterns = [
                r'\s+et\s+toi\s*$',
                r'\s+et\s+vous\s*$',
                r'\s+et\s+même\s*$',
                r'\s+et\s+ça\s*$',
                r'\s+et\s+c\'est\s*$',
                r'\s+et\s+c\'était\s*$',
                r'\s+voilà\s*$',
                r'\s+euh\s*$',
            ]
            for pattern in parasite_patterns:
                text = re.sub(pattern, '', text, flags=re.IGNORECASE)
            
            # Traduire wolof → français (préserver la casse)
            for wolof, french in self.wolof_french_mapping.items():
                text = text.replace(wolof, french)
                text = text.replace(wolof.replace('ë', 'e'), french)
                text = text.replace(wolof.replace('ë', 'a'), french)
                # Variantes avec majuscules
                if wolof[0].islower():
                    text = text.replace(wolof.capitalize(), french.capitalize())
            
            # Normaliser les espaces multiples
            text = re.sub(r'\s+', ' ', text)
            
            # Convertir en minuscules pour l'analyse (mais préserver les apostrophes)
            text_lower = text.lower()
            
            logger.info(f"Cleaned text: {text_lower}")
            return text_lower.strip()
            
        except Exception as e:
            logger.error(f"Error cleaning text: {e}")
            return text.lower().strip() if text else ""

    def process_voice_command(self, audio_data: bytes, user_id: uuid.UUID, filename_hint: str = "audio.wav") -> Dict:
        """Traiter une commande vocale complète"""
        try:
            logger.info(f"Processing voice command for user {user_id}")
            text = self.transcribe_audio(audio_data, filename_hint)
            logger.info(f"Transcribed text: '{text}'")
            
            analysis = self.extract_intent(text)    
            logger.info(f"Intent analysis: {analysis}")
            result = self._execute_action(analysis['intent'], analysis['entities'], user_id)
            logger.info(f"Action result: {result}")
            voice_response = self._generate_voice_response(result, analysis['intent'])
            logger.info(f"Voice response: '{voice_response}'")
            return {
                'success': True,
                'transcribed_text': text,
                'intent': analysis['intent'],
                'result': result,
                'voice_response': voice_response
            }
        except Exception as e:
            logger.error(f"Erreur traitement commande vocale: {e}", exc_info=True)
            error_response = self.voice_response.generate_response('error', {}, 'french')
            return {
                'success': False, 
                'error': str(e),
                'voice_response': error_response
            }

    def set_debug_mode(self, enabled: bool, debug_text: str = ""):
        """Activer/désactiver le mode debug"""
        self.debug_mode = enabled
        self.debug_text = debug_text
        logger.info(f"Debug mode set to: {enabled}")

    def extract_intent(self, text: str) -> Dict:
        """Extraire l'intention et les entités du texte avec analyse améliorée"""
        try:
            text_lower = text.lower().strip()
            logger.info(f"Analyse du texte: {text_lower}")
            
            detected_intent = 'unknown_intent'
            confidence = 0.0
            
            for intent, keywords in self.intents.items():
                for keyword in keywords:
                    if keyword in text_lower:
                        detected_intent = intent
                        confidence = 0.85
                        break
                if confidence > 0:
                    break
            
            entities = self._extract_entities(text_lower, detected_intent)
            
            logger.info(f"Intent détecté: {detected_intent}, confiance: {confidence}")
            logger.info(f"Entités extraites: {entities}")
            
            return {
                'intent': detected_intent,
                'confidence': confidence,
                'entities': entities,
                'text': text
            }
            
        except Exception as e:
            logger.error(f"Erreur extraction intent: {e}")
            return {
                'intent': 'unknown_intent',
                'confidence': 0.0,
                'entities': {},
                'text': text
            }
    
    def _extract_entities(self, text: str, intent: str) -> Dict:
        """Extraire les entités avec analyse contextuelle améliorée"""
        entities = {}
        
        try:
            # Extraction montants avec détection de quantité × prix unitaire
            amount = None
            quantity = None
            unit_price = None
            
            # Pattern 1a: "[unité] X [item] à Y francs par [unité]" (unité avant le chiffre)
            # Exemple: "casse 4 café à 50 francs par casse" (transcription imparfaite)
            quantity_unit_pattern_1a = r'(?:case|casse)\s+(\d+)\s+.*?(?:à|par)\s+(\d+)\s*(?:franc|f|fcfa)\s*(?:par\s+(?:case|casse))?'
            match = re.search(quantity_unit_pattern_1a, text, re.IGNORECASE)
            if match:
                quantity = int(match.group(1))
                unit_price = int(match.group(2))
                amount = quantity * unit_price
                logger.info(f"✅ Calcul quantité × prix (pattern 1a): {quantity} × {unit_price} = {amount}")
            
            # Pattern 1b: "X [item] à Y francs par [unité]" ou "X [item] à Y francs"
            # Exemple: "4 cases à 50 francs par case" ou "4 café à 50 francs"
            if not amount:
                quantity_unit_pattern_1b = r'(\d+)\s+(?:case|casse|kg|kilogramme|litre|unite|unité|piece|pièce)\s+.*?(?:à|par)\s+(\d+)\s*(?:franc|f|fcfa)\s*(?:par\s+(?:case|casse|kg|kilogramme|litre|unite|unité|piece|pièce))?'
                match = re.search(quantity_unit_pattern_1b, text, re.IGNORECASE)
                if match:
                    quantity = int(match.group(1))
                    unit_price = int(match.group(2))
                    amount = quantity * unit_price
                    logger.info(f"✅ Calcul quantité × prix (pattern 1b): {quantity} × {unit_price} = {amount}")
            
            # Pattern 2: "Y francs par X [unité]" ou "Y francs X [unité]"
            # Exemple: "50 francs par 4 cases" ou "50 francs 4 cases"
            if not amount:
                unit_price_quantity_pattern = r'(\d+)\s*(?:franc|f|fcfa).*?par\s+(\d+)\s+(?:case|kg|litre|unite|unité|piece|pièce)'
                match = re.search(unit_price_quantity_pattern, text, re.IGNORECASE)
                if match:
                    unit_price = int(match.group(1))
                    quantity = int(match.group(2))
                    amount = quantity * unit_price
                    logger.info(f"✅ Calcul prix × quantité: {unit_price} × {quantity} = {amount}")
            
            # Pattern 3: "X [item] Y francs" (quantité avant, montant après)
            # Exemple: "4 cases 50 francs"
            if not amount:
                quantity_amount_pattern = r'(\d+)\s+(?:case|kg|litre|unite|unité|piece|pièce|café|riz|sucre|etc)\s+(\d+)\s*(?:franc|f|fcfa)'
                match = re.search(quantity_amount_pattern, text, re.IGNORECASE)
                if match:
                    quantity = int(match.group(1))
                    unit_price = int(match.group(2))
                    # Vérifier si c'est un prix unitaire (montant raisonnable par unité)
                    # Si le montant est > 1000, c'est probablement le total, sinon c'est le prix unitaire
                    if unit_price <= 1000:
                        amount = quantity * unit_price
                        logger.info(f"✅ Calcul quantité × prix (pattern 3): {quantity} × {unit_price} = {amount}")
                    else:
                        amount = unit_price
                        logger.info(f"✅ Montant total détecté: {amount}")
            
            # Pattern 4: Si pas de pattern quantité/prix, utiliser le montant maximum (ancien comportement)
            if not amount:
                amount_patterns = [
                    r'(\d+)\s*f(?:cfa)?',
                    r'(\d+)\s+f(?:cfa)?',
                    r'(\d+)\s*franc',
                    r'(\d+)\s+euro',
                    r'(\d+)',
                ]
                
                for pattern in amount_patterns:
                    matches = re.findall(pattern, text)
                    if matches:
                        # Exclure les petits nombres qui pourraient être des quantités
                        amounts = [int(match) for match in matches if int(match) >= 10]
                        if amounts:
                            amount = max(amounts)
                            break
            
            if amount:
                entities['amount'] = amount
                if quantity and unit_price:
                    logger.info(f"💰 Montant calculé: {quantity} × {unit_price} = {amount} FCFA")
            
            # Extraction catégorie avec PRIORITÉ sur les services professionnels
            category = 'divers'
            detected_item = None
            
            # 1. Chercher d'abord les services professionnels (maçon, plombier, etc.)
            services_professionnels = {
                'maçon': 'services', 'macon': 'services', 'plombier': 'services',
                'électricien': 'services', 'electricien': 'services', 'menuisier': 'services',
                'peintre': 'services', 'jardinier': 'services', 'technicien': 'services',
                'chauffeur': 'services', 'livreur': 'services', 'garde': 'services',
            }
            
            for keyword, cat in services_professionnels.items():
                if re.search(r'\b' + re.escape(keyword) + r'\b', text):
                    category = cat
                    detected_item = keyword
                    logger.info(f"✅ Service professionnel détecté: {keyword} → {cat}")
                    break
            
            # 2. Si pas de service professionnel, chercher dans CATEGORIES
            if category == 'divers':
                sorted_keywords = sorted(CATEGORIES.items(), key=lambda x: len(x[0]), reverse=True)
                for keyword, cat in sorted_keywords:
                    if re.search(r'\b' + re.escape(keyword) + r'\b', text):
                        category = cat
                        detected_item = keyword
                        logger.info(f"✅ Catégorie détectée: {keyword} → {cat}")
                        break
            
            entities['category'] = category
            
            # 3. Enrichir avec item spécifique si pertinent
            if not detected_item:
                items_specifiques = {
                    # Alimentation
                    'riz': 'riz', 'ceeb': 'riz', 'pain': 'pain', 'viande': 'viande', 'poisson': 'poisson',
                    # Transport
                    'essence': 'essence', 'carburant': 'carburant', 'gasoil': 'gasoil',
                    # Logement
                    'loyer': 'loyer', 'eau': 'eau', 'électricité': 'électricité', 'electricite': 'électricité',
                    # Habillement
                    'vêtement': 'vêtements', 'vetement': 'vêtements', 'habit': 'habits', 
                    'chaussure': 'chaussures', 'chaussures': 'chaussures',
                    # Communication
                    'forfait': 'forfait', 'téléphone': 'téléphone', 'telephone': 'téléphone',
                    # Santé
                    'médicament': 'médicaments', 'medicament': 'médicaments', 'pharmacie': 'pharmacie',
                }
                
                for k, label in items_specifiques.items():
                    if re.search(r'\b' + re.escape(k) + r'\b', text):
                        detected_item = label
                        logger.info(f"✅ Item spécifique: {k} → {label}")
                        break
            
            if detected_item:
                entities['item'] = detected_item

            logger.info(f"📊 Résultat final - Montant: {amount}, Catégorie: {category}, Item: {detected_item}")
            
        except Exception as e:
            logger.error(f"Erreur extraction entités: {e}")
            entities = {'amount': 0, 'category': 'divers'}
        
        return entities