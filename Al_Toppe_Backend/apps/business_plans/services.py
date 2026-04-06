"""
Services pour les business plans - Templates guidés, Export PDF, Workflow validation
"""

import os
from datetime import datetime
from typing import Dict, List, Any, Optional
from django.conf import settings
from django.core.files.storage import default_storage
from django.http import HttpResponse


class GuidedTemplateService:
    """Service pour la création de plans d'affaires guidés"""
    
    # Structures de templates par secteur
    TEMPLATE_STRUCTURES = {
        'commerce': {
            'name': 'Template Commerce - Vente au détail',
            'description': 'Template pour activités commerciales de vente au détail',
            'sections': {
                'market_analysis': {
                    'questions': [
                        {
                            'id': 'target_customers',
                            'label': 'Qui sont vos clients cibles ?',
                            'type': 'textarea',
                            'required': True,
                            'help': 'Décrivez vos principaux clients'
                        },
                        {
                            'id': 'market_size',
                            'label': 'Taille estimée du marché ?',
                            'type': 'select',
                            'options': ['< 1000', '1000-10000', '> 10000'],
                            'required': True
                        },
                        {
                            'id': 'competition',
                            'label': 'Qui sont vos concurrents ?',
                            'type': 'textarea',
                            'required': True,
                            'help': 'Listez vos principaux concurrents'
                        },
                        {
                            'id': 'positioning',
                            'label': 'Quel est votre positionnement ?',
                            'type': 'textarea',
                            'required': False,
                            'help': 'Comment vous différenciez-vous ?'
                        }
                    ]
                },
                'offer': {
                    'questions': [
                        {
                            'id': 'products_services',
                            'label': 'Quels produits/services offrez-vous ?',
                            'type': 'textarea',
                            'required': True
                        },
                        {
                            'id': 'pricing_strategy',
                            'label': 'Quelle est votre stratégie de prix ?',
                            'type': 'textarea',
                            'required': True
                        },
                        {
                            'id': 'unique_value',
                            'label': 'Valeur unique de votre offre ?',
                            'type': 'textarea',
                            'required': True
                        },
                        {
                            'id': 'distribution',
                            'label': 'Comment distribuez-vous vos produits ?',
                            'type': 'select',
                            'options': ['Magasin physique', 'Marché', 'Vente ambulante', 'Online'],
                            'required': True
                        }
                    ]
                },
                'business_model': {
                    'questions': [
                        {
                            'id': 'revenue_sources',
                            'label': 'Sources de revenus principales ?',
                            'type': 'textarea',
                            'required': True
                        },
                        {
                            'id': 'cost_structure',
                            'label': 'Structure des coûts principaux ?',
                            'type': 'textarea',
                            'required': True,
                            'help': 'Fournitures, loyer, transport, etc.'
                        },
                        {
                            'id': 'key_partners',
                            'label': 'Parties prenantes clés ?',
                            'type': 'textarea',
                            'required': False
                        },
                        {
                            'id': 'payment_methods',
                            'label': 'Méthodes de paiement acceptées ?',
                            'type': 'multiselect',
                            'options': ['Cash', 'Orange Money', 'Wave', 'Mobile Money', 'Carte'],
                            'required': True
                        }
                    ]
                },
                'financial_projections': {
                    'questions': [
                        {
                            'id': 'startup_costs',
                            'label': 'Coûts de démarrage estimés (FCFA) ?',
                            'type': 'number',
                            'required': True
                        },
                        {
                            'id': 'monthly_revenue',
                            'label': 'Revenus mensuels estimés (FCFA) ?',
                            'type': 'number',
                            'required': True
                        },
                        {
                            'id': 'monthly_expenses',
                            'label': 'Dépenses mensuelles estimées (FCFA) ?',
                            'type': 'number',
                            'required': True
                        },
                        {
                            'id': 'break_even',
                            'label': 'Point d\'équilibre en mois ?',
                            'type': 'number',
                            'required': False
                        },
                        {
                            'id': 'year_projection',
                            'label': 'Projection de revenus année 1 (FCFA) ?',
                            'type': 'number',
                            'required': False
                        }
                    ]
                },
                'implementation_plan': {
                    'questions': [
                        {
                            'id': 'milestones',
                            'label': 'Étapes clés de mise en œuvre ?',
                            'type': 'textarea',
                            'required': True
                        },
                        {
                            'id': 'resources_needed',
                            'label': 'Ressources nécessaires ?',
                            'type': 'textarea',
                            'required': True
                        },
                        {
                            'id': 'timeline',
                            'label': 'Calendrier de mise en œuvre ?',
                            'type': 'textarea',
                            'required': False
                        },
                        {
                            'id': 'risks',
                            'label': 'Principaux risques identifiés ?',
                            'type': 'textarea',
                            'required': False
                        }
                    ]
                }
            }
        },
        'service': {
            'name': 'Template Service - Prestation de services',
            'description': 'Template pour activités de prestation de services',
            'sections': {
                'market_analysis': {
                    'questions': [
                        {
                            'id': 'service_type',
                            'label': 'Type de service offert ?',
                            'type': 'textarea',
                            'required': True
                        },
                        {
                            'id': 'client_pain',
                            'label': 'Problème client résolu par votre service ?',
                            'type': 'textarea',
                            'required': True
                        },
                        {
                            'id': 'market_demand',
                            'label': 'Demande estimée du marché ?',
                            'type': 'select',
                            'options': ['Faible', 'Moyenne', 'Élevée'],
                            'required': True
                        }
                    ]
                },
                'offer': {
                    'questions': [
                        {
                            'id': 'service_description',
                            'label': 'Description détaillée du service ?',
                            'type': 'textarea',
                            'required': True
                        },
                        {
                            'id': 'service_packages',
                            'label': 'Forfaits/offres proposés ?',
                            'type': 'textarea',
                            'required': False
                        },
                        {
                            'id': 'pricing_model',
                            'label': 'Modèle de tarification ?',
                            'type': 'select',
                            'options': ['À l\'heure', 'Forfait', 'Commission', 'Mixte'],
                            'required': True
                        }
                    ]
                },
                'business_model': {
                    'questions': [
                        {
                            'id': 'service_delivery',
                            'label': 'Comment livrez-vous vos services ?',
                            'type': 'textarea',
                            'required': True
                        },
                        {
                            'id': 'operational_costs',
                            'label': 'Coûts opérationnels principaux ?',
                            'type': 'textarea',
                            'required': True
                        }
                    ]
                },
                'financial_projections': {
                    'questions': [
                        {
                            'id': 'hourly_rate',
                            'label': 'Taux horaire moyen (FCFA) ?',
                            'type': 'number',
                            'required': False
                        },
                        {
                            'id': 'clients_per_month',
                            'label': 'Nombre estimé de clients/mois ?',
                            'type': 'number',
                            'required': True
                        },
                        {
                            'id': 'projected_income',
                            'label': 'Revenus projetés mois 1-3 ?',
                            'type': 'textarea',
                            'required': True
                        }
                    ]
                },
                'implementation_plan': {
                    'questions': [
                        {
                            'id': 'key_activities',
                            'label': 'Activités clés à réaliser ?',
                            'type': 'textarea',
                            'required': True
                        },
                        {
                            'id': 'skills_needed',
                            'label': 'Compétences nécessaires ?',
                            'type': 'textarea',
                            'required': True
                        }
                    ]
                }
            }
        },
        'agriculture': {
            'name': 'Template Agriculture - Exploitation agricole',
            'description': 'Template pour activités agricoles et exploitation',
            'sections': {
                'market_analysis': {
                    'questions': [
                        {
                            'id': 'crop_type',
                            'label': 'Type de culture ?',
                            'type': 'textarea',
                            'required': True
                        },
                        {
                            'id': 'seasonal_cycle',
                            'label': 'Cycle saisonnier de production ?',
                            'type': 'textarea',
                            'required': True
                        },
                        {
                            'id': 'buyers',
                            'label': 'Acheteurs principaux ?',
                            'type': 'textarea',
                            'required': True
                        }
                    ]
                },
                'offer': {
                    'questions': [
                        {
                            'id': 'products',
                            'label': 'Produits agricoles ?',
                            'type': 'textarea',
                            'required': True
                        },
                        {
                            'id': 'production_volume',
                            'label': 'Volume de production estimé ?',
                            'type': 'textarea',
                            'required': True
                        }
                    ]
                },
                'business_model': {
                    'questions': [
                        {
                            'id': 'land_size',
                            'label': 'Superficie de terrain (ha) ?',
                            'type': 'number',
                            'required': True
                        },
                        {
                            'id': 'input_costs',
                            'label': 'Coûts des intrants ?',
                            'type': 'textarea',
                            'required': True
                        }
                    ]
                },
                'financial_projections': {
                    'questions': [
                        {
                            'id': 'seasonal_revenue',
                            'label': 'Revenus par saison (FCFA) ?',
                            'type': 'textarea',
                            'required': True
                        },
                        {
                            'id': 'investment_needed',
                            'label': 'Investissement nécessaire (FCFA) ?',
                            'type': 'number',
                            'required': True
                        }
                    ]
                },
                'implementation_plan': {
                    'questions': [
                        {
                            'id': 'seasonal_tasks',
                            'label': 'Tâches saisonnières ?',
                            'type': 'textarea',
                            'required': True
                        },
                        {
                            'id': 'equipment_needed',
                            'label': 'Équipement nécessaire ?',
                            'type': 'textarea',
                            'required': True
                        }
                    ]
                }
            }
        },
        'artisanat': {
            'name': 'Template Artisanat - Production artisanale',
            'description': 'Template pour activités artisanales et production',
            'sections': {
                'market_analysis': {
                    'questions': [
                        {
                            'id': 'craft_type',
                            'label': 'Type d\'artisanat ?',
                            'type': 'textarea',
                            'required': True
                        },
                        {
                            'id': 'cultural_heritage',
                            'label': 'Patrimoine culturel valorisé ?',
                            'type': 'textarea',
                            'required': False
                        }
                    ]
                },
                'offer': {
                    'questions': [
                        {
                            'id': 'artisan_products',
                            'label': 'Produits artisanaux ?',
                            'type': 'textarea',
                            'required': True
                        },
                        {
                            'id': 'material_sourcing',
                            'label': 'Sourcing des matières premières ?',
                            'type': 'textarea',
                            'required': True
                        }
                    ]
                },
                'financial_projections': {
                    'questions': [
                        {
                            'id': 'production_costs',
                            'label': 'Coûts de production/unité (FCFA) ?',
                            'type': 'number',
                            'required': True
                        },
                        {
                            'id': 'selling_price',
                            'label': 'Prix de vente moyen/unité (FCFA) ?',
                            'type': 'number',
                            'required': True
                        },
                        {
                            'id': 'units_per_month',
                            'label': 'Unités vendues/mois estimées ?',
                            'type': 'number',
                            'required': True
                        }
                    ]
                },
                'implementation_plan': {
                    'questions': [
                        {
                            'id': 'production_process',
                            'label': 'Processus de production ?',
                            'type': 'textarea',
                            'required': True
                        },
                        {
                            'id': 'skills_required',
                            'label': 'Compétences artisanales requises ?',
                            'type': 'textarea',
                            'required': True
                        }
                    ]
                }
            }
        }
    }
    
    @classmethod
    def get_template_questions(cls, sector: str) -> Dict[str, Any]:
        """Retourne les questions guidées pour un secteur donné"""
        return cls.TEMPLATE_STRUCTURES.get(sector, {})
    
    @classmethod
    def generate_plan_from_answers(cls, sector: str, answers: Dict[str, Any]) -> Dict[str, Any]:
        """Génère un plan d'affaires à partir des réponses au questionnaire"""
        structure = cls.get_template_questions(sector)
        
        if not structure:
            return {}
        
        generated_plan = {}
        
        # Mapper les réponses aux sections du plan
        for section_name, section_data in structure['sections'].items():
            section_content = {}
            for question in section_data['questions']:
                qid = question['id']
                if qid in answers:
                    section_content[qid] = {
                        'question': question['label'],
                        'answer': answers[qid]
                    }
            generated_plan[section_name] = section_content
        
        return generated_plan


class PDFExportService:
    """Service pour l'export PDF des plans d'affaires"""
    
    @staticmethod
    def export_to_pdf(business_plan, output_format='html') -> HttpResponse:
        """
        Exporte un plan d'affaires en PDF avec génération IA
        
        Args:
            business_plan: Instance BusinessPlan
            output_format: Format de sortie (html, pdf)
        """
        from io import BytesIO
        from django.template.loader import render_to_string
        from django.utils.html import strip_tags
        from apps.ai.business_plan_ai import get_business_plan_ai_service
        import logging
        
        logger = logging.getLogger(__name__)
        
        # Par défaut : PDF fidèle aux données en base (retours client : éviter textes IA / paramétrage).
        # Activer avec BUSINESS_PLAN_PDF_USE_AI = True dans settings.
        use_ai_pdf = bool(getattr(settings, 'BUSINESS_PLAN_PDF_USE_AI', False))
        ai_result = {'success': False}

        if use_ai_pdf:
            answers = PDFExportService._map_plan_data_to_ai_answers(business_plan)
            ai_service = get_business_plan_ai_service()
            sector = business_plan.activity.sector or 'autre'
            logger.info(f"Génération IA du plan d'affaires pour PDF: {business_plan.title}")
            ai_result = ai_service.generate_business_plan(
                entrepreneur=business_plan.entrepreneur,
                activity=business_plan.activity,
                sector=sector,
                answers=answers,
                language='french'
            )

        if ai_result.get('success'):
            plan_data = ai_result.get('plan', {})
            # Vérifier si le plan contient une erreur (parsing partiel)
            if plan_data.get('error'):
                logger.warning(f"⚠️ Plan généré avec erreur partielle: {plan_data.get('error')}")
                # Utiliser les données disponibles même si partiellement générées
                market_analysis = plan_data.get('market_analysis', business_plan.market_analysis or {})
                offer = plan_data.get('offer', business_plan.offer or {})
                business_model = plan_data.get('business_model', business_plan.business_model or {})
                financial_projections = plan_data.get('financial_projections', business_plan.financial_projections or {})
                implementation_plan = plan_data.get('implementation_plan', business_plan.implementation_plan or {})
                summary = plan_data.get('summary', business_plan.summary or 'Erreur lors de la génération du plan. Veuillez réessayer.')
            else:
                market_analysis = plan_data.get('market_analysis', business_plan.market_analysis or {})
                offer = plan_data.get('offer', business_plan.offer or {})
                business_model = plan_data.get('business_model', business_plan.business_model or {})
                financial_projections = plan_data.get('financial_projections', business_plan.financial_projections or {})
                implementation_plan = plan_data.get('implementation_plan', business_plan.implementation_plan or {})
                summary = plan_data.get('summary', business_plan.summary or '')
            logger.info(f"✅ Plan généré par IA pour PDF en {ai_result.get('processing_time_ms', 0)}ms")
        else:
            market_analysis = business_plan.market_analysis or {}
            offer = business_plan.offer or {}
            business_model = business_plan.business_model or {}
            financial_projections = business_plan.financial_projections or {}
            implementation_plan = business_plan.implementation_plan or {}
            if use_ai_pdf:
                error_msg = ai_result.get('error', 'Erreur inconnue')
                logger.warning(f"IA PDF échouée, données en base: {error_msg}")
                summary = business_plan.summary or (
                    f'Erreur lors de la génération du plan: {error_msg}. Données enregistrées affichées.'
                )
            else:
                summary = business_plan.summary or ''
        
        def _activity_sector_label(activity) -> str:
            from apps.entrepreneurs.models import Activity as ActivityModel

            if not activity:
                return 'Autre'
            raw = (getattr(activity, 'sector', None) or '').strip()
            if not raw:
                return 'Autre'
            choices = dict(ActivityModel.SECTOR_CHOICES)
            return str(choices.get(raw, raw or 'Autre'))

        # Contexte pour le template
        context = {
            'plan': business_plan,
            'entrepreneur': business_plan.entrepreneur,
            'activity': business_plan.activity,
            'activity_sector_display': _activity_sector_label(business_plan.activity),
            'date': datetime.now().strftime('%d/%m/%Y'),
            # Utiliser les données générées par l'IA
            'market_analysis': market_analysis,
            'offer': offer,
            'business_model': business_model,
            'financial_projections': financial_projections,
            'implementation_plan': implementation_plan,
            'summary': summary,
            # HTML lisible pour structures imbriquées (IA + guidé)
            'market_analysis_html': PDFExportService.format_json_for_pdf(market_analysis),
            'offer_html': PDFExportService.format_json_for_pdf(offer),
            'business_model_html': PDFExportService.format_json_for_pdf(business_model),
            'financial_projections_html': PDFExportService.format_json_for_pdf(financial_projections),
            'implementation_plan_html': PDFExportService.format_json_for_pdf(implementation_plan),
        }
        
        # Générer le HTML
        html_content = render_to_string('business_plans/export.html', context)
        
        if output_format == 'html':
            # Retourner HTML pour visualisation
            return HttpResponse(html_content, content_type='text/html')
        
        # Pour PDF réel, utiliser reportlab ou weasyprint
        try:
            # Essayer weasyprint en premier (meilleur rendu)
            from weasyprint import HTML, CSS
            from weasyprint.text.fonts import FontConfiguration
            
            font_config = FontConfiguration()
            stylesheets = [CSS(string=PDFExportService.get_pdf_css())]
            
            html_doc = HTML(string=html_content)
            pdf_bytes = html_doc.write_pdf(
                stylesheets=stylesheets,
                font_config=font_config
            )
            
            # Sauvegarder le PDF dans le modèle
            from django.core.files.base import ContentFile
            from django.utils import timezone
            filename = f'business_plan_{business_plan.id}.pdf'
            business_plan.pdf_file.save(
                filename,
                ContentFile(pdf_bytes),
                save=True
            )
            business_plan.pdf_generated_at = timezone.now()
            business_plan.save(update_fields=['pdf_file', 'pdf_generated_at'])
            
            logger.info(f"✅ PDF sauvegardé: {business_plan.pdf_file.name}")
            
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
            
        except ImportError:
            try:
                # Fallback sur reportlab
                from reportlab.lib.pagesizes import A4
                from reportlab.lib.styles import getSampleStyleSheet
                from reportlab.lib.units import inch
                from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
                from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
                
                buffer = BytesIO()
                doc = SimpleDocTemplate(
                    buffer,
                    pagesize=A4,
                    rightMargin=72,
                    leftMargin=72,
                    topMargin=72,
                    bottomMargin=18
                )
                
                # Styles
                styles = getSampleStyleSheet()
                story = []
                
                # Titre
                title_style = styles['Heading1']
                title_style.alignment = TA_CENTER
                story.append(Paragraph(business_plan.title, title_style))
                story.append(Spacer(1, 0.2*inch))
                
                # Informations générales
                story.append(Paragraph("<b>Entrepreneur:</b> " + business_plan.entrepreneur.full_name, styles['Normal']))
                story.append(Paragraph("<b>Activité:</b> " + business_plan.activity.title, styles['Normal']))
                story.append(Paragraph("<b>Date:</b> " + context['date'], styles['Normal']))
                story.append(Spacer(1, 0.3*inch))
                
                # Résumé exécutif (utiliser le résumé généré par l'IA si disponible)
                summary_text = context.get('summary') or business_plan.summary
                if summary_text:
                    story.append(Paragraph("<b>Résumé Exécutif</b>", styles['Heading2']))
                    story.append(Paragraph(summary_text, styles['BodyText']))
                    story.append(Spacer(1, 0.2*inch))
                
                # Sections - Utiliser les données explicites du contexte
                story.append(PageBreak())
                story.append(Paragraph("<b>1. Analyse de Marché</b>", styles['Heading2']))
                story.append(Paragraph(PDFExportService.format_json_for_pdf(context['market_analysis']), styles['BodyText']))
                story.append(Spacer(1, 0.2*inch))
                
                story.append(Paragraph("<b>2. Offre et Services</b>", styles['Heading2']))
                story.append(Paragraph(PDFExportService.format_json_for_pdf(context['offer']), styles['BodyText']))
                story.append(Spacer(1, 0.2*inch))
                
                story.append(Paragraph("<b>3. Modèle Économique</b>", styles['Heading2']))
                story.append(Paragraph(PDFExportService.format_json_for_pdf(context['business_model']), styles['BodyText']))
                story.append(Spacer(1, 0.2*inch))
                
                story.append(Paragraph("<b>4. Projections Financières</b>", styles['Heading2']))
                story.append(Paragraph(PDFExportService.format_json_for_pdf(context['financial_projections']), styles['BodyText']))
                story.append(Spacer(1, 0.2*inch))
                
                story.append(Paragraph("<b>5. Plan de Mise en Œuvre</b>", styles['Heading2']))
                story.append(Paragraph(PDFExportService.format_json_for_pdf(context['implementation_plan']), styles['BodyText']))
                
                # Générer PDF
                doc.build(story)
                pdf_bytes = buffer.getvalue()
                buffer.close()
                
                # Sauvegarder le PDF dans le modèle
                from django.core.files.base import ContentFile
                from django.utils import timezone
                filename = f'business_plan_{business_plan.id}.pdf'
                business_plan.pdf_file.save(
                    filename,
                    ContentFile(pdf_bytes),
                    save=True
                )
                business_plan.pdf_generated_at = timezone.now()
                business_plan.save(update_fields=['pdf_file', 'pdf_generated_at'])
                
                logger.info(f"✅ PDF sauvegardé: {business_plan.pdf_file.name}")
                
                response = HttpResponse(pdf_bytes, content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="{filename}"'
                return response
                
            except ImportError:
                # Pas de bibliothèque PDF disponible, retourner HTML
                return PDFExportService.export_to_pdf(business_plan, output_format='html')
    
    @staticmethod
    def _translate_key_to_french(key: str) -> str:
        """Traduit une clé anglaise en français lisible"""
        # Normaliser la clé (enlever majuscules, underscores et tirets)
        key_lower = key.lower()
        key_normalized = key_lower.replace('_', '').replace('-', '')
        
        # Dictionnaire de traductions avec différentes variantes
        translations = {
            # Market Analysis (variantes avec et sans underscores)
            'targetmarket': 'Marché Cible',
            'target_market': 'Marché Cible',
            'targetcustomers': 'Clients Cibles',
            'target_customers': 'Clients Cibles',
            'marketsize': 'Taille du Marché',
            'market_size': 'Taille du Marché',
            'competition': 'Concurrence',
            'positioning': 'Positionnement',
            'opportunities': 'Opportunités',
            'threats': 'Menaces',
            
            # Offer
            'productsservices': 'Produits et Services',
            'products_services': 'Produits et Services',
            'valueproposition': 'Proposition de Valeur',
            'value_proposition': 'Proposition de Valeur',
            'competitiveadvantages': 'Avantages Concurrentiels',
            'competitive_advantages': 'Avantages Concurrentiels',
            'uniquevalue': 'Valeur Unique',
            'unique_value': 'Valeur Unique',
            'pricingstrategy': 'Stratégie de Prix',
            'pricing_strategy': 'Stratégie de Prix',
            'distribution': 'Distribution',
            
            # Business Model
            'revenuestreams': 'Sources de Revenus',
            'revenue_streams': 'Sources de Revenus',
            'coststructure': 'Structure des Coûts',
            'cost_structure': 'Structure des Coûts',
            'keypartners': 'Partenaires Clés',
            'key_partners': 'Partenaires Clés',
            'keyresources': 'Ressources Clés',
            'key_resources': 'Ressources Clés',
            'paymentmethods': 'Méthodes de Paiement',
            'payment_methods': 'Méthodes de Paiement',
            
            # Financial Projections
            'year1': 'Année 1',
            'year_1': 'Année 1',
            'year2': 'Année 2',
            'year_2': 'Année 2',
            'year3': 'Année 3',
            'year_3': 'Année 3',
            'revenue': 'Revenus',
            'expenses': 'Dépenses',
            'profit': 'Profit',
            'breakevenmonths': 'Mois de Rentabilité',
            'break_even_months': 'Mois de Rentabilité',
            'initialinvestment': 'Investissement Initial',
            'initial_investment': 'Investissement Initial',
            'startupcosts': 'Coûts de Démarrage',
            'startup_costs': 'Coûts de Démarrage',
            'monthlyrevenue': 'Revenus Mensuels',
            'monthly_revenue': 'Revenus Mensuels',
            'monthlyexpenses': 'Dépenses Mensuelles',
            'monthly_expenses': 'Dépenses Mensuelles',
            
            # Implementation Plan
            'milestones': 'Étapes Clés',
            'resourcesneeded': 'Ressources Nécessaires',
            'resources_needed': 'Ressources Nécessaires',
            'timeline': 'Calendrier',
            'risks': 'Risques',
            
            # Common fields
            'name': 'Nom',
            'description': 'Description',
            'title': 'Titre',
            'source': 'Source',
            'category': 'Catégorie',
            'type': 'Type',
            'quantity': 'Quantité',
            'cost': 'Coût',
            'amount': 'Montant',
            'estimatedamount': 'Montant Estimé',
            'estimated_amount': 'Montant Estimé',
            'targetprice': 'Prix Cible',
            'target_price': 'Prix Cible',
            'month': 'Mois',
            'deliverables': 'Livrables',
            'mitigation': 'Atténuation',
        }
        
        # Chercher une traduction exacte (normalisée)
        if key_normalized in translations:
            return translations[key_normalized]
        
        # Chercher aussi avec la clé en minuscules avec underscores
        if key_lower in translations:
            return translations[key_lower]
        
        # Chercher une traduction partielle
        for eng_key, fr_value in translations.items():
            # Correspondance exacte normalisée
            if key_normalized == eng_key:
                return fr_value
            # Correspondance partielle
            if key_normalized.endswith(eng_key) or key_normalized.startswith(eng_key):
                # Si la clé commence par la traduction
                if key_normalized.startswith(eng_key) and len(key_normalized) > len(eng_key):
                    suffix = key[len(eng_key):].replace('_', ' ').replace('-', ' ').title()
                    return f"{fr_value} - {suffix}"
                # Si la clé se termine par la traduction
                elif key_normalized.endswith(eng_key) and len(key_normalized) > len(eng_key):
                    prefix = key[:-len(eng_key)].replace('_', ' ').replace('-', ' ').title()
                    return f"{prefix} - {fr_value}"
        
        # Gérer les cas spéciaux comme "Year_1", "Year_2", etc.
        if key_lower.startswith('year_') or (key_lower.startswith('year') and len(key_lower) > 4 and key_lower[4:].replace('_', '').isdigit()):
            year_num = key_lower.replace('year_', '').replace('year', '').replace('_', '').strip()
            if year_num.isdigit():
                return f"Année {year_num}"
        
        # Gérer "Break_Even_Months" -> "Mois de Rentabilité"
        if 'breakeven' in key_normalized or 'break_even' in key_lower:
            if 'month' in key_normalized or 'months' in key_normalized:
                return 'Mois de Rentabilité'
            return 'Point de Rentabilité'
        
        # Si pas de traduction trouvée, formater la clé de manière lisible
        # Remplacer les underscores et tirets par des espaces
        formatted = key.replace('_', ' ').replace('-', ' ')
        # Capitaliser chaque mot (gérer les cas comme "Target_Market")
        words = formatted.split()
        formatted = ' '.join([word.capitalize() for word in words])
        return formatted
    
    @staticmethod
    def format_json_for_pdf(data: dict) -> str:
        """Formate un dictionnaire JSON pour affichage PDF - Gère les formats guidé et IA"""
        if not data:
            return "Aucune donnée disponible."
        
        formatted = []
        
        def format_value(key: str, value: any, indent: int = 0) -> str:
            """Fonction récursive pour formater les valeurs"""
            indent_str = "&nbsp;" * (indent * 4)
            
            # Si c'est un objet question/réponse (format guidé)
            if isinstance(value, dict) and 'question' in value and 'answer' in value:
                question = value.get('question', key)
                answer = value.get('answer', '')
                # Formater la réponse si c'est un objet complexe
                if isinstance(answer, dict):
                    answer = format_dict_for_pdf(answer, indent + 1)
                elif isinstance(answer, list):
                    answer = format_list_for_pdf(answer)
                return f"{indent_str}<b>{question}:</b> {str(answer)}"
            
            # Si c'est un dictionnaire (format IA ou structure complexe)
            elif isinstance(value, dict):
                # Vérifier si c'est une structure IA (pas de 'question' mais des clés métier)
                if 'question' not in value:
                    # Format IA - formater récursivement
                    sub_items = []
                    for sub_key, sub_value in value.items():
                        sub_items.append(format_value(sub_key, sub_value, indent + 1))
                    translated_key = PDFExportService._translate_key_to_french(key)
                    return f"{indent_str}<b>{translated_key}:</b><br/>{'<br/>'.join(sub_items)}"
                else:
                    # Format guidé simple
                    question = value.get('question', key)
                    answer = value.get('answer', '')
                    return f"{indent_str}<b>{question}:</b> {str(answer)}"
            
            # Si c'est une liste
            elif isinstance(value, list):
                translated_key = PDFExportService._translate_key_to_french(key)
                if not value:
                    return f"{indent_str}<b>{translated_key}:</b> Aucun élément"
                
                # Vérifier si c'est une liste d'objets
                if value and isinstance(value[0], dict):
                    items = []
                    for idx, item in enumerate(value, 1):
                        if isinstance(item, dict):
                            # Formater chaque objet de la liste de manière plus lisible
                            item_lines = []
                            # Prioriser certains champs pour un meilleur affichage
                            priority_fields = ['name', 'title', 'source', 'category', 'type', 'risk']
                            for priority_field in priority_fields:
                                if priority_field in item:
                                    translated_field = PDFExportService._translate_key_to_french(priority_field)
                                    item_lines.append(f"<b>{translated_field}:</b> {str(item[priority_field])}")
                            
                            # Ajouter les autres champs
                            for item_key, item_value in item.items():
                                if item_key not in priority_fields:
                                    translated_item_key = PDFExportService._translate_key_to_french(item_key)
                                    # Formater les valeurs numériques avec FCFA si approprié
                                    if isinstance(item_value, (int, float)) and item_value > 0:
                                        if 'price' in item_key.lower() or 'cost' in item_key.lower() or 'amount' in item_key.lower():
                                            formatted_value = f"{item_value:,.0f} FCFA"
                                        else:
                                            formatted_value = str(item_value)
                                    else:
                                        formatted_value = str(item_value)
                                    item_lines.append(f"{translated_item_key}: {formatted_value}")
                            
                            # Joindre toutes les lignes de l'item
                            item_text = '<br/>&nbsp;&nbsp;&nbsp;&nbsp;'.join(item_lines)
                            items.append(f"{indent_str}&nbsp;&nbsp;<b>{idx}.</b> {item_text}")
                        else:
                            items.append(f"{indent_str}&nbsp;&nbsp;{idx}. {str(item)}")
                    return f"{indent_str}<b>{translated_key}:</b><br/>{'<br/>'.join(items)}"
                else:
                    # Liste simple
                    items = [f"{indent_str}&nbsp;&nbsp;• {str(item)}" for item in value]
                    return f"{indent_str}<b>{translated_key}:</b><br/>{'<br/>'.join(items)}"
            
            # Valeur simple
            else:
                translated_key = PDFExportService._translate_key_to_french(key)
                return f"{indent_str}<b>{translated_key}:</b> {str(value)}"
        
        def format_dict_for_pdf(d: dict, indent: int = 0) -> str:
            """Formate un dictionnaire récursivement"""
            items = []
            for k, v in d.items():
                items.append(format_value(k, v, indent))
            return '<br/>'.join(items)
        
        def format_list_for_pdf(lst: list) -> str:
            """Formate une liste"""
            if not lst:
                return "Aucun élément"
            if isinstance(lst[0], dict):
                items = []
                for idx, item in enumerate(lst, 1):
                    if isinstance(item, dict):
                        item_lines = []
                        # Prioriser certains champs
                        priority_fields = ['name', 'title', 'source', 'category', 'type', 'risk']
                        for priority_field in priority_fields:
                            if priority_field in item:
                                translated_field = PDFExportService._translate_key_to_french(priority_field)
                                item_lines.append(f"<b>{translated_field}:</b> {str(item[priority_field])}")
                        
                        # Ajouter les autres champs
                        for k, v in item.items():
                            if k not in priority_fields:
                                translated_k = PDFExportService._translate_key_to_french(k)
                                # Formater les valeurs numériques avec FCFA si approprié
                                if isinstance(v, (int, float)) and v > 0:
                                    if 'price' in k.lower() or 'cost' in k.lower() or 'amount' in k.lower():
                                        formatted_value = f"{v:,.0f} FCFA"
                                    else:
                                        formatted_value = str(v)
                                else:
                                    formatted_value = str(v)
                                item_lines.append(f"{translated_k}: {formatted_value}")
                        
                        # Joindre toutes les lignes
                        item_text = '<br/>&nbsp;&nbsp;&nbsp;&nbsp;'.join(item_lines)
                        items.append(f"<b>{idx}.</b> {item_text}")
                    else:
                        items.append(f"{idx}. {str(item)}")
                return '<br/>'.join(items)
            else:
                return ', '.join([str(item) for item in lst])
        
        # Formater toutes les données
        for key, value in data.items():
            formatted.append(format_value(key, value))
        
        return "<br/>".join(formatted)
    
    @staticmethod
    def _map_plan_data_to_ai_answers(business_plan) -> dict:
        """
        Mappe les données du plan d'affaires (format guidé) vers le format attendu par l'IA
        
        Args:
            business_plan: Instance BusinessPlan
            
        Returns:
            Dict avec les réponses au format attendu par l'IA
        """
        answers = {}
        
        def extract_answer(value):
            """Extrait la valeur d'un champ (gère le format question/answer)"""
            if isinstance(value, dict) and 'answer' in value:
                return value.get('answer', '')
            return value
        
        # Market analysis
        market_analysis = business_plan.market_analysis or {}
        if market_analysis:
            answers['target_customers'] = extract_answer(market_analysis.get('target_customers', ''))
            answers['market_size'] = extract_answer(market_analysis.get('market_size', ''))
            answers['competition'] = extract_answer(market_analysis.get('competition', ''))
            answers['positioning'] = extract_answer(market_analysis.get('positioning', ''))
        
        # Offer
        offer = business_plan.offer or {}
        if offer:
            products_services = extract_answer(offer.get('products_services', ''))
            if isinstance(products_services, list):
                answers['products_services'] = '\n'.join([str(p) for p in products_services if p])
            else:
                answers['products_services'] = str(products_services)
            
            answers['unique_value'] = extract_answer(offer.get('unique_value', ''))
            answers['pricing_strategy'] = extract_answer(offer.get('pricing_strategy', ''))
            answers['distribution'] = extract_answer(offer.get('distribution', ''))
        
        # Business model
        business_model = business_plan.business_model or {}
        if business_model:
            revenue_sources = extract_answer(business_model.get('revenue_sources', ''))
            if isinstance(revenue_sources, list):
                answers['revenue_sources'] = '\n'.join([str(r) for r in revenue_sources if r])
            else:
                answers['revenue_sources'] = str(revenue_sources)
            
            cost_structure = extract_answer(business_model.get('cost_structure', ''))
            if isinstance(cost_structure, list):
                answers['cost_structure'] = '\n'.join([str(c) for c in cost_structure if c])
            else:
                answers['cost_structure'] = str(cost_structure)
            
            key_partners = extract_answer(business_model.get('key_partners', ''))
            if isinstance(key_partners, list):
                answers['key_partners'] = '\n'.join([str(k) for k in key_partners if k])
            else:
                answers['key_partners'] = str(key_partners)
            
            payment_methods = extract_answer(business_model.get('payment_methods', []))
            if isinstance(payment_methods, list):
                answers['payment_methods'] = ', '.join([str(p) for p in payment_methods if p])
            else:
                answers['payment_methods'] = str(payment_methods)
        
        # Financial projections
        financial_projections = business_plan.financial_projections or {}
        if financial_projections:
            answers['startup_costs'] = extract_answer(financial_projections.get('startup_costs', 0))
            answers['monthly_revenue'] = extract_answer(financial_projections.get('monthly_revenue', 0))
            answers['monthly_expenses'] = extract_answer(financial_projections.get('monthly_expenses', 0))
            answers['break_even'] = extract_answer(financial_projections.get('break_even', 0))
            answers['year_projection'] = extract_answer(financial_projections.get('year_projection', 0))
            answers['year_1_revenue'] = extract_answer(financial_projections.get('year_1_revenue', 0))
            answers['year_1_expenses'] = extract_answer(financial_projections.get('year_1_expenses', 0))
            answers['year_1_profit'] = extract_answer(financial_projections.get('year_1_profit', 0))
        
        # Implementation plan
        implementation_plan = business_plan.implementation_plan or {}
        if implementation_plan:
            answers['milestones'] = extract_answer(implementation_plan.get('milestones', ''))
            answers['resources_needed'] = extract_answer(implementation_plan.get('resources_needed', ''))
            answers['timeline'] = extract_answer(implementation_plan.get('timeline', ''))
            answers['risks'] = extract_answer(implementation_plan.get('risks', ''))
        
        return answers
    
    @staticmethod
    def get_pdf_css() -> str:
        """Retourne le CSS pour le PDF"""
        return """
        @page {
            size: A4;
            margin: 2cm;
        }
        
        body {
            font-family: Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.5;
            color: #333;
        }
        
        h1 {
            font-size: 24pt;
            color: #2c3e50;
            margin-bottom: 20px;
            text-align: center;
        }
        
        h2 {
            font-size: 16pt;
            color: #27ae60;
            margin-top: 30px;
            margin-bottom: 15px;
            border-bottom: 2px solid #27ae60;
            padding-bottom: 5px;
        }
        
        h3 {
            font-size: 14pt;
            color: #34495e;
            margin-top: 20px;
            margin-bottom: 10px;
        }
        
        p {
            text-align: justify;
            margin-bottom: 10px;
        }
        
        .header-info {
            background-color: #ecf0f1;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 30px;
        }
        
        .section {
            margin-bottom: 25px;
            page-break-inside: avoid;
        }
        
        .question {
            font-weight: bold;
            color: #555;
        }
        
        .answer {
            margin-left: 20px;
            margin-bottom: 10px;
        }
        """


class ValidationWorkflowService:
    """Service pour le workflow de validation des plans d'affaires"""
    
    # Workflow de validation par rôle
    WORKFLOWS = {
        'basic': {
            'steps': [
                {
                    'name': 'initial_review',
                    'label': 'Revue Initiale',
                    'required_role': 'coach',
                    'required': True
                },
                {
                    'name': 'financial_review',
                    'label': 'Revue Financière',
                    'required_role': 'admin',
                    'required': True
                },
                {
                    'name': 'final_approval',
                    'label': 'Approbation Finale',
                    'required_role': 'admin',
                    'required': True
                }
            ]
        },
        'funding': {
            'steps': [
                {
                    'name': 'coach_review',
                    'label': 'Revue Coach',
                    'required_role': 'coach',
                    'required': True
                },
                {
                    'name': 'bailleur_evaluation',
                    'label': 'Évaluation Bailleur',
                    'required_role': 'bailleur',
                    'required': True
                },
                {
                    'name': 'committee_review',
                    'label': 'Revue Comité',
                    'required_role': 'admin',
                    'required': True
                },
                {
                    'name': 'final_approval',
                    'label': 'Approbation Finale',
                    'required_role': 'admin',
                    'required': True
                }
            ]
        }
    }
    
    @classmethod
    def get_workflow_steps(cls, workflow_type: str = 'basic') -> List[Dict[str, Any]]:
        """Retourne les étapes d'un workflow de validation"""
        return cls.WORKFLOWS.get(workflow_type, cls.WORKFLOWS['basic'])['steps']
    
    @classmethod
    def can_validate_step(cls, user_role: str, step_name: str, workflow_type: str = 'basic') -> bool:
        """Vérifie si un utilisateur peut valider une étape"""
        steps = cls.get_workflow_steps(workflow_type)
        
        for step in steps:
            if step['name'] == step_name:
                return step['required_role'] == user_role or user_role == 'admin'
        
        return False
    
    @classmethod
    def get_next_step(cls, current_validations: List[Dict], workflow_type: str = 'basic') -> Optional[Dict[str, Any]]:
        """Retourne la prochaine étape du workflow"""
        steps = cls.get_workflow_steps(workflow_type)
        completed_steps = [v['validation_type'] for v in current_validations if v.get('is_approved', False)]
        
        for step in steps:
            if step['name'] not in completed_steps:
                return step
        
        return None
    
    @classmethod
    def is_workflow_complete(cls, validations: List[Dict], workflow_type: str = 'basic') -> bool:
        """Vérifie si le workflow de validation est complété"""
        steps = cls.get_workflow_steps(workflow_type)
        required_steps = [step['name'] for step in steps if step.get('required', True)]
        completed_steps = [v['validation_type'] for v in validations if v.get('is_approved', False)]
        
        return all(step in completed_steps for step in required_steps)


# Exporter les services
guided_template_service = GuidedTemplateService()
pdf_export_service = PDFExportService()
validation_workflow_service = ValidationWorkflowService()

