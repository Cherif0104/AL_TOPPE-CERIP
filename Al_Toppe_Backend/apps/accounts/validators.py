# apps/accounts/validators.py
import re
from django.core.exceptions import ValidationError

def validate_phone_number(value):
    """Valider le format des numéros sénégalais"""
    pattern = r'^221\s(77|76|71|70|75|78)\s\d{3}\s\d{2}\s\d{2}$'
    if not re.match(pattern, value):
        raise ValidationError(
            'Le numéro doit être au format "221 XX XXX XX XX" et commencer par 77, 76, 70, 71, 75 ou 78'
        )
