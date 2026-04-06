# apps/ai/categories.py - Mapping vers les catégories officielles du compte de résultat
# Compatible avec Django/apps/finances/models.py et populate_categories.py

"""
Dictionnaire de mapping des mots-clés vers les catégories officielles du compte de résultat.
Les catégories correspondent exactement à celles créées par populate_categories.py
"""

CATEGORIES = {
    # ============================================================================
    # RECETTES (Produits) - Type: 'income'
    # ============================================================================
    
    # Ventes de marchandises - Pour les activités de commerce (boutique, négoce)
    'vente': 'Ventes de marchandises', 'ventes': 'Ventes de marchandises',
    'boutique': 'Ventes de marchandises', 'commerce': 'Ventes de marchandises',
    'négoce': 'Ventes de marchandises', 'negoce': 'Ventes de marchandises',
    'marchandise': 'Ventes de marchandises', 'marchandises': 'Ventes de marchandises',
    'revendre': 'Ventes de marchandises', 'revendu': 'Ventes de marchandises',
    'jaay': 'Ventes de marchandises',  # Wolof: vendre
    
    # Ventes de produits fabriqués - Pour les activités de production/transformation
    'produit': 'Ventes de produits fabriqués', 'produits': 'Ventes de produits fabriqués',
    'fabriqué': 'Ventes de produits fabriqués', 'fabrique': 'Ventes de produits fabriqués',
    'fabrication': 'Ventes de produits fabriqués', 'production': 'Ventes de produits fabriqués',
    'artisanat': 'Ventes de produits fabriqués', 'artisanal': 'Ventes de produits fabriqués',
    'transformation': 'Ventes de produits fabriqués', 'transformé': 'Ventes de produits fabriqués',
    'manufacture': 'Ventes de produits fabriqués', 'manufacturé': 'Ventes de produits fabriqués',
    
    # Prestations de services - Pour le conseil, la formation, ou les services divers
    'service': 'Prestations de services', 'services': 'Prestations de services',
    'prestation': 'Prestations de services', 'prestations': 'Prestations de services',
    'conseil': 'Prestations de services', 'conseils': 'Prestations de services',
    'formation': 'Prestations de services', 'formations': 'Prestations de services',
    'consultation': 'Prestations de services', 'consultations': 'Prestations de services',
    'maçon': 'Prestations de services', 'macon': 'Prestations de services',
    'plombier': 'Prestations de services', 'électricien': 'Prestations de services',
    'electricien': 'Prestations de services', 'menuisier': 'Prestations de services',
    'peintre': 'Prestations de services', 'carreleur': 'Prestations de services',
    'jardinier': 'Prestations de services', 'garde': 'Prestations de services',
    'gardien': 'Prestations de services', 'femme': 'Prestations de services',
    'ménage': 'Prestations de services', 'menage': 'Prestations de services',
    'chauffeur': 'Prestations de services', 'livreur': 'Prestations de services',
    'technicien': 'Prestations de services', 'réparateur': 'Prestations de services',
    'reparateur': 'Prestations de services', 'installateur': 'Prestations de services',
    'dépanneur': 'Prestations de services', 'depanneur': 'Prestations de services',
    'avocat': 'Prestations de services', 'notaire': 'Prestations de services',
    'comptable': 'Prestations de services', 'consultant': 'Prestations de services',
    'expert': 'Prestations de services', 'architecte': 'Prestations de services',
    'ingénieur': 'Prestations de services', 'ingenieur': 'Prestations de services',
    'designer': 'Prestations de services', 'graphiste': 'Prestations de services',
    
    # Produits accessoires - Commissions, locations d'espace, transport facturé
    'commission': 'Produits accessoires', 'commissions': 'Produits accessoires',
    'location': 'Produits accessoires', 'locations': 'Produits accessoires',
    'louer': 'Produits accessoires', 'loué': 'Produits accessoires',
    'transport': 'Produits accessoires',  # Transport facturé (revenu)
    'facturé': 'Produits accessoires', 'facture': 'Produits accessoires',
    
    # Subventions et Dons - Aides d'exploitation reçues
    'subvention': 'Subventions et Dons', 'subventions': 'Subventions et Dons',
    'don': 'Subventions et Dons', 'dons': 'Subventions et Dons',
    'aide': 'Subventions et Dons', 'aides': 'Subventions et Dons',
    'financement': 'Subventions et Dons', 'financements': 'Subventions et Dons',
    'bourse': 'Subventions et Dons', 'bourses': 'Subventions et Dons',
    
    # ============================================================================
    # DÉPENSES (Charges) - Type: 'expense'
    # ============================================================================
    
    # Achats de marchandises / matières - Coût des stocks revendus ou transformés
    'achat': 'Achats de marchandises / matières', 'achats': 'Achats de marchandises / matières',
    'jënd': 'Achats de marchandises / matières',  # Wolof: acheter
    'diana': 'Achats de marchandises / matières',  # Wolof: acheter
    'matière': 'Achats de marchandises / matières', 'matières': 'Achats de marchandises / matières',
    'matière première': 'Achats de marchandises / matières', 'matières premières': 'Achats de marchandises / matières',
    'stock': 'Achats de marchandises / matières', 'stocks': 'Achats de marchandises / matières',
    'approvisionnement': 'Achats de marchandises / matières', 'approvisionnements': 'Achats de marchandises / matières',
    'fourniture': 'Achats de marchandises / matières', 'fournitures': 'Achats de marchandises / matières',
    
    # Fournitures non stockables - Eau, électricité, gaz, etc.
    'eau': 'Eau', 'd eau': 'Eau',  # Sous-catégorie de "Fournitures non stockables"
    'électricité': 'Électricité (Woyofal)', 'electricite': 'Électricité (Woyofal)',
    'woyofal': 'Électricité (Woyofal)', 'électrique': 'Électricité (Woyofal)',
    'gaz': 'Gaz',  # Sous-catégorie de "Fournitures non stockables"
    'butane': 'Gaz', 'gpl': 'Gaz',
    
    # Services extérieurs (Fonctionnement) - Sous-catégories
    'loyer': 'Loyer immobilier et charges locatives',
    'maison': 'Loyer immobilier et charges locatives', 'appartement': 'Loyer immobilier et charges locatives',
    'charges': 'Loyer immobilier et charges locatives', 'charges locatives': 'Loyer immobilier et charges locatives',
    'copropriété': 'Loyer immobilier et charges locatives', 'copropriete': 'Loyer immobilier et charges locatives',
    'habitation': 'Loyer immobilier et charges locatives', 'studio': 'Loyer immobilier et charges locatives',
    'bail': 'Loyer immobilier et charges locatives', 'propriétaire': 'Loyer immobilier et charges locatives',
    'proprietaire': 'Loyer immobilier et charges locatives', 'taxe': 'Loyer immobilier et charges locatives',
    'foncière': 'Loyer immobilier et charges locatives', 'fonciere': 'Loyer immobilier et charges locatives',
    'ordures': 'Loyer immobilier et charges locatives',
    
    'entretien': 'Entretien, réparations et maintenance', 'réparation': 'Entretien, réparations et maintenance',
    'reparation': 'Entretien, réparations et maintenance', 'maintenance': 'Entretien, réparations et maintenance',
    'nettoyage': 'Entretien, réparations et maintenance', 'réparations': 'Entretien, réparations et maintenance',
    'reparations': 'Entretien, réparations et maintenance',
    
    'assurance': 'Primes d\'assurances', 'assurances': 'Primes d\'assurances',
    'prime': 'Primes d\'assurances', 'primes': 'Primes d\'assurances',
    
    # Transport (dépense) - Frais de transport (personnel, marchandises, carburant)
    'essence': 'Frais de transport (personnel, marchandises, carburant)',
    'gas': 'Frais de transport (personnel, marchandises, carburant)',
    'gasoil': 'Frais de transport (personnel, marchandises, carburant)',
    'diesel': 'Frais de transport (personnel, marchandises, carburant)',
    'carburant': 'Frais de transport (personnel, marchandises, carburant)',
    'plein': 'Frais de transport (personnel, marchandises, carburant)',
    'station': 'Frais de transport (personnel, marchandises, carburant)',
    'pompé': 'Frais de transport (personnel, marchandises, carburant)',
    'pompe': 'Frais de transport (personnel, marchandises, carburant)',
    'voiture': 'Frais de transport (personnel, marchandises, carburant)',
    'taxi': 'Frais de transport (personnel, marchandises, carburant)',
    'bus': 'Frais de transport (personnel, marchandises, carburant)',
    'moto': 'Frais de transport (personnel, marchandises, carburant)',
    'vélo': 'Frais de transport (personnel, marchandises, carburant)',
    'velo': 'Frais de transport (personnel, marchandises, carburant)',
    'déplacement': 'Frais de transport (personnel, marchandises, carburant)',
    'deplacement': 'Frais de transport (personnel, marchandises, carburant)',
    'trajet': 'Frais de transport (personnel, marchandises, carburant)',
    'passage': 'Frais de transport (personnel, marchandises, carburant)',
    'péage': 'Frais de transport (personnel, marchandises, carburant)',
    'peage': 'Frais de transport (personnel, marchandises, carburant)',
    'parking': 'Frais de transport (personnel, marchandises, carburant)',
    'vidange': 'Frais de transport (personnel, marchandises, carburant)',
    'pneu': 'Frais de transport (personnel, marchandises, carburant)',
    'batterie': 'Frais de transport (personnel, marchandises, carburant)',
    
    'bureau': 'Fournitures de bureau et petits matériels', 'papeterie': 'Fournitures de bureau et petits matériels',
    'fourniture bureau': 'Fournitures de bureau et petits matériels', 'fournitures bureau': 'Fournitures de bureau et petits matériels',
    'matériel': 'Fournitures de bureau et petits matériels', 'materiel': 'Fournitures de bureau et petits matériels',
    'petit matériel': 'Fournitures de bureau et petits matériels', 'petits matériels': 'Fournitures de bureau et petits matériels',
    'pen': 'Fournitures de bureau et petits matériels',
    
    'restaurant': 'Restauration', 'restauration': 'Restauration', 'repas': 'Restauration',
    'déjeuner': 'Restauration', 'dejeuner': 'Restauration', 'dîner': 'Restauration',
    'diner': 'Restauration', 'manger': 'Restauration', 'food': 'Restauration',
    'cantine': 'Restauration', 'café': 'Restauration', 'cafe': 'Restauration',
    'utensils': 'Restauration', 'utensiles': 'Restauration',
    
    'honoraire': 'Honoraires (comptable, avocat, consultants, formateurs externes)',
    'honoraires': 'Honoraires (comptable, avocat, consultants, formateurs externes)',
    'comptable': 'Honoraires (comptable, avocat, consultants, formateurs externes)',
    'avocat': 'Honoraires (comptable, avocat, consultants, formateurs externes)',
    'consultant': 'Honoraires (comptable, avocat, consultants, formateurs externes)',
    'formateur': 'Honoraires (comptable, avocat, consultants, formateurs externes)',
    'formateurs': 'Honoraires (comptable, avocat, consultants, formateurs externes)',
    'externes': 'Honoraires (comptable, avocat, consultants, formateurs externes)',
    'user-tie': 'Honoraires (comptable, avocat, consultants, formateurs externes)',
    
    'publicité': 'Publicité, réseaux sociaux', 'publicite': 'Publicité, réseaux sociaux',
    'marketing': 'Publicité, réseaux sociaux', 'publicité': 'Publicité, réseaux sociaux',
    'réseaux sociaux': 'Publicité, réseaux sociaux', 'reseaux sociaux': 'Publicité, réseaux sociaux',
    'réseau social': 'Publicité, réseaux sociaux', 'reseau social': 'Publicité, réseaux sociaux',
    'bullhorn': 'Publicité, réseaux sociaux', 'communication': 'Publicité, réseaux sociaux',
    'promotion': 'Publicité, réseaux sociaux', 'promotions': 'Publicité, réseaux sociaux',
    'campagne': 'Publicité, réseaux sociaux', 'campagnes': 'Publicité, réseaux sociaux',
    
    'téléphone': 'Télécommunication (Internet/Crédit)', 'telephone': 'Télécommunication (Internet/Crédit)',
    'internet': 'Télécommunication (Internet/Crédit)', 'forfait': 'Télécommunication (Internet/Crédit)',
    'mobile': 'Télécommunication (Internet/Crédit)', 'portable': 'Télécommunication (Internet/Crédit)',
    'smartphone': 'Télécommunication (Internet/Crédit)', 'appel': 'Télécommunication (Internet/Crédit)',
    'sms': 'Télécommunication (Internet/Crédit)', 'data': 'Télécommunication (Internet/Crédit)',
    '4g': 'Télécommunication (Internet/Crédit)', '5g': 'Télécommunication (Internet/Crédit)',
    'wifi': 'Télécommunication (Internet/Crédit)', 'recharge': 'Télécommunication (Internet/Crédit)',
    'crédit': 'Télécommunication (Internet/Crédit)', 'credit': 'Télécommunication (Internet/Crédit)',
    'opérateur': 'Télécommunication (Internet/Crédit)', 'operateur': 'Télécommunication (Internet/Crédit)',
    'orange': 'Télécommunication (Internet/Crédit)', 'free': 'Télécommunication (Internet/Crédit)',
    'facture': 'Télécommunication (Internet/Crédit)', 'abonnement': 'Télécommunication (Internet/Crédit)',
    'phone': 'Télécommunication (Internet/Crédit)',
    
    # Charges de personnel - Salaires nets, cotisations sociales (IPRES, CSS) et impôts sur salaires
    'emploi': 'Charges de personnel', 'employé': 'Charges de personnel', 'employés': 'Charges de personnel',
    'salaire': 'Charges de personnel', 'salaires': 'Charges de personnel', 'salary': 'Charges de personnel',
    'paye': 'Charges de personnel', 'paie': 'Charges de personnel', 'rémunération': 'Charges de personnel',
    'remuneration': 'Charges de personnel', 'traitement': 'Charges de personnel',
    'bonus': 'Charges de personnel', 'cotisation': 'Charges de personnel', 'cotisations': 'Charges de personnel',
    'ipres': 'Charges de personnel', 'css': 'Charges de personnel', 'vrs': 'Charges de personnel',
    'cfce': 'Charges de personnel', 'impôt salaire': 'Charges de personnel', 'impots salaire': 'Charges de personnel',
    'impôts salaires': 'Charges de personnel', 'impots salaires': 'Charges de personnel',
    'personnel': 'Charges de personnel', 'employeur': 'Charges de personnel',
    
    # Frais financiers - Frais bancaires et intérêts
    'frais bancaire': 'Frais financiers : Frais bancaires et intérêts',
    'frais bancaires': 'Frais financiers : Frais bancaires et intérêts',
    'intérêt': 'Frais financiers : Frais bancaires et intérêts', 'intérêts': 'Frais financiers : Frais bancaires et intérêts',
    'interet': 'Frais financiers : Frais bancaires et intérêts', 'interets': 'Frais financiers : Frais bancaires et intérêts',
    'banque': 'Frais financiers : Frais bancaires et intérêts', 'bancaire': 'Frais financiers : Frais bancaires et intérêts',
    'bancaires': 'Frais financiers : Frais bancaires et intérêts', 'agios': 'Frais financiers : Frais bancaires et intérêts',
    'commission bancaire': 'Frais financiers : Frais bancaires et intérêts', 'commissions bancaires': 'Frais financiers : Frais bancaires et intérêts',
    'university': 'Frais financiers : Frais bancaires et intérêts',
    
    # ============================================================================
    # ALIMENTATION - Mappée vers "Achats de marchandises / matières" (pour les achats)
    # ============================================================================
    'ceeb': 'Achats de marchandises / matières', 'riz': 'Achats de marchandises / matières',
    'tay': 'Achats de marchandises / matières', 'thé': 'Achats de marchandises / matières',
    'nourriture': 'Achats de marchandises / matières', 'poisson': 'Achats de marchandises / matières',
    'viande': 'Achats de marchandises / matières', 'lait': 'Achats de marchandises / matières',
    'sucre': 'Achats de marchandises / matières', 'huile': 'Achats de marchandises / matières',
    'pain': 'Achats de marchandises / matières', 'jus': 'Achats de marchandises / matières',
    'fruit': 'Achats de marchandises / matières', 'légume': 'Achats de marchandises / matières',
    'legume': 'Achats de marchandises / matières', 'poulet': 'Achats de marchandises / matières',
    'bœuf': 'Achats de marchandises / matières', 'boeuf': 'Achats de marchandises / matières',
    'tomate': 'Achats de marchandises / matières', 'oignon': 'Achats de marchandises / matières',
    'marché': 'Achats de marchandises / matières', 'marche': 'Achats de marchandises / matières',
    'épicerie': 'Achats de marchandises / matières', 'epicerie': 'Achats de marchandises / matières',
    'bissap': 'Achats de marchandises / matières',
    
    # ============================================================================
    # HABILLEMENT - Mappée vers "Achats de marchandises / matières" (pour les achats)
    # ============================================================================
    'vêtement': 'Achats de marchandises / matières', 'vetement': 'Achats de marchandises / matières',
    'vêtements': 'Achats de marchandises / matières', 'vetements': 'Achats de marchandises / matières',
    'habit': 'Achats de marchandises / matières', 'habits': 'Achats de marchandises / matières',
    'clothes': 'Achats de marchandises / matières', 'chaussure': 'Achats de marchandises / matières',
    'chaussures': 'Achats de marchandises / matières', 'robe': 'Achats de marchandises / matières',
    'pantalon': 'Achats de marchandises / matières', 'chemise': 'Achats de marchandises / matières',
    't-shirt': 'Achats de marchandises / matières', 'pull': 'Achats de marchandises / matières',
    'veste': 'Achats de marchandises / matières', 'manteau': 'Achats de marchandises / matières',
    'chapeau': 'Achats de marchandises / matières', 'bijou': 'Achats de marchandises / matières',
    'montre': 'Achats de marchandises / matières', 'mode': 'Achats de marchandises / matières',
    'boutique': 'Achats de marchandises / matières', 'boubou': 'Achats de marchandises / matières',
    'pagne': 'Achats de marchandises / matières',
    
    # ============================================================================
    # SANTÉ - Mappée vers "Services extérieurs (Fonctionnement)" ou sous-catégorie
    # ============================================================================
    'médicament': 'Services extérieurs (Fonctionnement)', 'medicament': 'Services extérieurs (Fonctionnement)',
    'hopital': 'Services extérieurs (Fonctionnement)', 'hôpital': 'Services extérieurs (Fonctionnement)',
    'doctor': 'Services extérieurs (Fonctionnement)', 'médecin': 'Services extérieurs (Fonctionnement)',
    'pharmacy': 'Services extérieurs (Fonctionnement)', 'pharmacie': 'Services extérieurs (Fonctionnement)',
    'santé': 'Services extérieurs (Fonctionnement)', 'sante': 'Services extérieurs (Fonctionnement)',
    'médical': 'Services extérieurs (Fonctionnement)', 'medical': 'Services extérieurs (Fonctionnement)',
    'soin': 'Services extérieurs (Fonctionnement)', 'soins': 'Services extérieurs (Fonctionnement)',
    'consultation': 'Services extérieurs (Fonctionnement)', 'dentiste': 'Services extérieurs (Fonctionnement)',
    'ophtalmo': 'Services extérieurs (Fonctionnement)', 'lunette': 'Services extérieurs (Fonctionnement)',
    'analyse': 'Services extérieurs (Fonctionnement)', 'laboratoire': 'Services extérieurs (Fonctionnement)',
    'urgence': 'Services extérieurs (Fonctionnement)',
    
    # ============================================================================
    # ÉDUCATION - Mappée vers "Services extérieurs (Fonctionnement)"
    # ============================================================================
    'école': 'Services extérieurs (Fonctionnement)', 'ecole': 'Services extérieurs (Fonctionnement)',
    'formation': 'Services extérieurs (Fonctionnement)', 'school': 'Services extérieurs (Fonctionnement)',
    'éducation': 'Services extérieurs (Fonctionnement)', 'education': 'Services extérieurs (Fonctionnement)',
    'université': 'Services extérieurs (Fonctionnement)', 'universite': 'Services extérieurs (Fonctionnement)',
    'cours': 'Services extérieurs (Fonctionnement)', 'élève': 'Services extérieurs (Fonctionnement)',
    'eleve': 'Services extérieurs (Fonctionnement)', 'étudiant': 'Services extérieurs (Fonctionnement)',
    'etudiant': 'Services extérieurs (Fonctionnement)', 'professeur': 'Services extérieurs (Fonctionnement)',
    'collège': 'Services extérieurs (Fonctionnement)', 'college': 'Services extérieurs (Fonctionnement)',
    'lycée': 'Services extérieurs (Fonctionnement)', 'lycee': 'Services extérieurs (Fonctionnement)',
    'bac': 'Services extérieurs (Fonctionnement)', 'diplôme': 'Services extérieurs (Fonctionnement)',
    'diplome': 'Services extérieurs (Fonctionnement)', 'inscription': 'Services extérieurs (Fonctionnement)',
    'frais': 'Services extérieurs (Fonctionnement)', 'scolaires': 'Services extérieurs (Fonctionnement)',
    'fourniture': 'Services extérieurs (Fonctionnement)', 'livre': 'Services extérieurs (Fonctionnement)',
    'cahier': 'Services extérieurs (Fonctionnement)',
    
    # ============================================================================
    # IMPÔTS - Mappée vers "Services extérieurs (Fonctionnement)"
    # ============================================================================
    'impôt': 'Services extérieurs (Fonctionnement)', 'impot': 'Services extérieurs (Fonctionnement)',
    'impôts': 'Services extérieurs (Fonctionnement)', 'impots': 'Services extérieurs (Fonctionnement)',
    'taxe': 'Services extérieurs (Fonctionnement)', 'taxes': 'Services extérieurs (Fonctionnement)',
    'fisc': 'Services extérieurs (Fonctionnement)', 'fiscal': 'Services extérieurs (Fonctionnement)',
    'fiscale': 'Services extérieurs (Fonctionnement)', 'tva': 'Services extérieurs (Fonctionnement)',
    'contribution': 'Services extérieurs (Fonctionnement)',
}
