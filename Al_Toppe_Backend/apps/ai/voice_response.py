# apps/ai/voice_response.py
import logging
from typing import Dict


class WolofVoiceResponse:
    """Génération de réponses vocales en Wolof"""
    
    RESPONSE_TEMPLATES = {
        'income_declared': {
            'wolof': "Jërejëf! {amount} FCFA di ci cont bi.",
            'french': "Merci! {amount} CFA ont été enregistrés comme revenu."
        },
        'expense_declared': {
            'wolof': "Dëgg na! {amount} FCFA nga dépense.",
            'french': "D'accord! {amount} CFA enregistrés comme dépense."
        },
        'balance_check': {
            'wolof': "Xàllis yi ci cont bi: {balance} FCFA.",
            'french': "Votre solde est de {balance} CFA."
        },

        'balance_expense': {
            'wolof': "Xàllis yi ci cont bi: {balance} FCFA.",
            'french': "Votre depance est de {balance} CFA."
        },

        'balance_income': {
            'wolof': "Xàllis yi ci cont bi: {balance} FCFA.",
            'french': "Votre revenus est de {balance} CFA."
        },
        'merci': {
            'wolof': "Waaw, jeureujeuf,content naniou si sa" ,
            'french': "Equipe Al Toppé, vous remercie de votre confiance."
        },

        'error': {
            'wolof': "Dégguma li nga wax. Waxaat beneen.",
            'french': "Je n'ai pas compris. Pouvez-vous répéter ?"
        }
    }
    
    def generate_response(self, intent: str, data: Dict, language: str = 'french') -> str:
        """Générer une réponse vocale appropriée"""
        template = self.RESPONSE_TEMPLATES.get(intent, {}).get(language)
        
        if not template:
            template = self.RESPONSE_TEMPLATES['error'][language]
        
        return template.format(**data)
    
    async def text_to_speech(self, text: str, language: str = 'french') -> bytes:
        """Convertir le texte en parole wolof"""
        # TODO: Intégration avec TTS API (Google, Azure, ou modèle local)
        try:
            audio_data = await self._call_tts_api(text, language)
            return audio_data
        except Exception as e:
            logging.getLogger(__name__).error(f"Erreur TTS: {e}")
            raise