
# apps/ai/tasks.py (Celery)
from celery import shared_task
from .integration import WolofNLPService

@shared_task
def process_voice_command_async(audio_data: bytes, user_id: str):
    """Traitement asynchrone des commandes vocales"""
    nlp_service = WolofNLPService()
    # ... processing logic