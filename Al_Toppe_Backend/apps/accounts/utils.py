"""Utilitaires comptes (téléphone, etc.)."""
import re


def normalize_senegal_phone(phone: str | None) -> str | None:
    """
    Uniformise le numéro au format stocké en base : « 221 77 123 45 67 ».
    Accepte les entrées sans espaces (12 chiffres 221…), avec +, ou déjà formatées.
    Si le format n'est pas reconnu, renvoie la chaîne d'origine (strip).
    """
    if phone is None:
        return None
    s = str(phone).strip()
    if re.match(r"^221 (77|76|71|70|75|78) \d{3} \d{2} \d{2}$", s):
        return s
    digits = re.sub(r"\D", "", s)
    if digits.startswith("221") and len(digits) == 12:
        rest = digits[3:]
        if len(rest) == 9 and rest[:2] in ("77", "76", "71", "70", "75", "78"):
            return f"221 {rest[:2]} {rest[2:5]} {rest[5:7]} {rest[7:9]}"
    return s
