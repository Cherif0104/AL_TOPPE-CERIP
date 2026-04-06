from rest_framework import generics, status, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count, Avg
from django.db import IntegrityError
from django.utils import timezone
import logging

from .models import BusinessPlanTemplate, BusinessPlan, BusinessPlanValidation, BusinessPlanComment
from .services import (
    guided_template_service,
    pdf_export_service,
    validation_workflow_service
)
from apps.ai.business_plan_ai import get_business_plan_ai_service
from apps.entrepreneurs.models import Entrepreneur, Activity
from .serializers import (
    BusinessPlanTemplateSerializer, BusinessPlanTemplateCreateSerializer,
    BusinessPlanSerializer, BusinessPlanCreateSerializer, BusinessPlanUpdateSerializer,
    BusinessPlanSummarySerializer, BusinessPlanDashboardSerializer,
    BusinessPlanValidationSerializer, BusinessPlanCommentSerializer, BusinessPlanCommentCreateSerializer
)
from django import template

register = template.Library()

@register.filter
def replace(value, arg):
    """Remplace les caractères : arg='_' et ' '"""
    old, new = arg.split(',')
    return value.replace(old, new)

# ============================================================================
# TEMPLATES DE PLANS D'AFFAIRES
# ============================================================================

class BusinessPlanTemplateListView(generics.ListCreateAPIView):
    """Liste et création de templates de plans d'affaires"""
    queryset = BusinessPlanTemplate.objects.filter(is_active=True)
    serializer_class = BusinessPlanTemplateSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['sector', 'is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'sector', 'version', 'created_at']
    ordering = ['sector', 'name']
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return BusinessPlanTemplateCreateSerializer
        return BusinessPlanTemplateSerializer


class BusinessPlanTemplateDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Détails, modification et suppression d'un template"""
    queryset = BusinessPlanTemplate.objects.all()
    serializer_class = BusinessPlanTemplateSerializer
    
    def perform_destroy(self, instance):
        # Marquer comme inactif au lieu de supprimer
        instance.is_active = False
        instance.save()


# ============================================================================
# PLANS D'AFFAIRES
# ============================================================================

class BusinessPlanListView(generics.ListCreateAPIView):
    """Liste et création de plans d'affaires"""
    permission_classes = [IsAuthenticated]
    serializer_class = BusinessPlanSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'is_validated', 'entrepreneur', 'activity__sector']
    search_fields = ['title', 'summary', 'entrepreneur__first_name', 'entrepreneur__last_name']
    ordering_fields = ['title', 'status', 'created_at', 'updated_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        qs = BusinessPlan.objects.select_related(
            'entrepreneur', 'activity', 'template'
        ).prefetch_related('validations', 'comments')
        user = self.request.user
        role = getattr(user, 'role', '') or ''
        if user.is_superuser or user.is_staff or role in ('admin', 'administrateur'):
            return qs
        if role == 'bailleur':
            return qs
        if role == 'entrepreneur' and hasattr(user, 'entrepreneur') and user.entrepreneur:
            return qs.filter(entrepreneur_id=user.entrepreneur.id)
        if role == 'coach':
            from apps.coaches.models import Coach, CoachAssignment
            coach = getattr(user, 'coach', None)
            if coach is None:
                try:
                    coach = Coach.objects.get(user=user)
                except Coach.DoesNotExist:
                    return qs.none()
            eids = CoachAssignment.objects.filter(
                coach=coach, status='active'
            ).values_list('entrepreneur_id', flat=True)
            return qs.filter(entrepreneur_id__in=eids)
        return qs.none()
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return BusinessPlanCreateSerializer
        return BusinessPlanSerializer
    
    def create(self, request, *args, **kwargs):
        """Création avec option de génération automatique avec IA"""
        use_ai = request.data.get('use_ai', False)
        
        # Si génération automatique avec IA demandée
        if use_ai:
            return self._create_with_ai(request, *args, **kwargs)
        
        # Sinon, création normale
        try:
            response = super().create(request, *args, **kwargs)
            # Notifier le coach si création réussie
            if response.status_code == 201:
                try:
                    business_plan_id = response.data.get('id') or response.data.get('business_plan', {}).get('id')
                    if business_plan_id:
                        business_plan = BusinessPlan.objects.get(pk=business_plan_id)
                        from .notifications import notify_business_plan_created
                        notify_business_plan_created(business_plan)
                except Exception as e:
                    logging.warning(f"⚠️ Erreur notification création plan: {e}")
            return response
        except IntegrityError as e:
            error_str = str(e)
            # Détecter l'erreur de contrainte UNIQUE
            if 'UNIQUE constraint' in error_str or 'unique constraint' in error_str.lower():
                # Extraire les informations de la requête
                entrepreneur_id = request.data.get('entrepreneur')
                activity_id = request.data.get('activity')
                
                # Chercher le plan existant
                existing_plan = None
                if entrepreneur_id and activity_id:
                    try:
                        existing_plan = BusinessPlan.objects.filter(
                            entrepreneur_id=entrepreneur_id,
                            activity_id=activity_id
                        ).order_by('-version').first()
                    except Exception:
                        pass
                
                response_data = {
                    'error': 'Un plan d\'affaires existe déjà pour cette activité et cette version',
                    'message': 'Vous ne pouvez pas créer plusieurs plans d\'affaires pour la même activité avec la même version. Veuillez modifier le plan existant ou créer une nouvelle version.',
                }
                
                if existing_plan:
                    response_data['existing_plan_id'] = str(existing_plan.id)
                    response_data['existing_plan_title'] = existing_plan.title
                    response_data['existing_plan_version'] = existing_plan.version
                
                return Response(response_data, status=status.HTTP_409_CONFLICT)
            else:
                # Autre erreur d'intégrité
                logging.error(f"IntegrityError lors de la création du plan: {error_str}")
                return Response({
                    'error': 'Erreur lors de la création du plan',
                    'message': 'Une contrainte de base de données a été violée',
                    'details': error_str
                }, status=status.HTTP_400_BAD_REQUEST)
    
    def _create_with_ai(self, request, *args, **kwargs):
        """Créer un business plan avec génération automatique par IA"""
        try:
            # Récupérer les données
            entrepreneur_id = request.data.get('entrepreneur')
            activity_id = request.data.get('activity')
            title = request.data.get('title')
            sector = request.data.get('sector', '')
            
            if not all([entrepreneur_id, activity_id, title]):
                return Response({
                    'error': 'Entrepreneur, activité et titre sont requis pour la génération IA'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Récupérer entrepreneur et activité
            entrepreneur = get_object_or_404(Entrepreneur, pk=entrepreneur_id)
            activity = get_object_or_404(Activity, pk=activity_id)
            
            # Déterminer le secteur depuis l'activité si non fourni
            if not sector:
                sector = activity.sector or 'autre'
            
            # Mapper les données du formulaire vers le format attendu par l'IA
            answers = self._map_form_data_to_ai_answers(request.data)
            
            # Générer le plan avec IA
            ai_service = get_business_plan_ai_service()
            language = request.data.get('language', 'french')
            
            result = ai_service.generate_business_plan(
                entrepreneur=entrepreneur,
                activity=activity,
                sector=sector,
                answers=answers,
                language=language
            )
            
            if not result.get('success'):
                return Response({
                    'error': 'Erreur lors de la génération avec IA',
                    'message': result.get('error', 'Erreur inconnue')
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Extraire le plan généré
            plan_data = result.get('plan', {})
            
            # Créer le business plan avec les données générées
            business_plan = BusinessPlan.objects.create(
                entrepreneur=entrepreneur,
                activity=activity,
                title=title,
                summary=plan_data.get('summary', ''),
                market_analysis=plan_data.get('market_analysis', {}),
                offer=plan_data.get('offer', {}),
                business_model=plan_data.get('business_model', {}),
                financial_projections=self._map_ai_financial_projections(plan_data.get('financial_projections', {})),
                implementation_plan=plan_data.get('implementation_plan', {}),
                status='draft'
            )
            
            # Notifier le coach de la création du plan
            try:
                from .notifications import notify_business_plan_created
                notify_business_plan_created(business_plan)
            except Exception as e:
                logging.warning(f"⚠️ Erreur notification création plan IA: {e}")
            
            serializer = BusinessPlanSerializer(business_plan)
            return Response({
                'message': 'Plan d\'affaires généré avec succès avec IA',
                'business_plan': serializer.data,
                'ai_processing_time_ms': result.get('processing_time_ms'),
                'ai_system': result.get('ai_system')
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logging.error(f"Erreur lors de la génération avec IA: {e}", exc_info=True)
            return Response({
                'error': 'Erreur lors de la génération avec IA',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _map_form_data_to_ai_answers(self, form_data: dict) -> dict:
        """Mapper les données du formulaire vers le format attendu par l'IA"""
        answers = {}
        
        # Market analysis
        market_analysis = form_data.get('market_analysis', {})
        if market_analysis:
            answers['target_customers'] = market_analysis.get('target_market', '')
            answers['market_size'] = market_analysis.get('market_size', '')
            answers['competition'] = market_analysis.get('competition', '')
            answers['trends'] = market_analysis.get('trends', '')
        
        # Offer
        offer = form_data.get('offer', {})
        if offer:
            products = offer.get('products', [])
            services = offer.get('services', [])
            answers['products_services'] = '\n'.join([p for p in products if p]) + '\n' + '\n'.join([s for s in services if s])
            answers['unique_value'] = offer.get('unique_value', '')
        
        # Business model
        business_model = form_data.get('business_model', {})
        if business_model:
            answers['revenue_sources'] = '\n'.join([r for r in business_model.get('revenue_streams', []) if r])
            answers['cost_structure'] = '\n'.join([c for c in business_model.get('cost_structure', []) if c])
            answers['key_partners'] = '\n'.join([k for k in business_model.get('key_partners', []) if k])
        
        # Financial projections
        financial_projections = form_data.get('financial_projections', {})
        if financial_projections:
            answers['year_1_revenue'] = financial_projections.get('year_1_revenue', 0)
            answers['year_1_expenses'] = financial_projections.get('year_1_expenses', 0)
            answers['year_1_profit'] = financial_projections.get('year_1_profit', 0)
            answers['break_even'] = financial_projections.get('break_even_month', 0)
        
        # Implementation plan
        implementation_plan = form_data.get('implementation_plan', {})
        if implementation_plan:
            answers['milestones'] = '\n'.join([
                f"Phase 1: {implementation_plan.get('phase_1', '')}",
                f"Phase 2: {implementation_plan.get('phase_2', '')}",
                f"Phase 3: {implementation_plan.get('phase_3', '')}"
            ])
        
        return answers
    
    def _map_ai_financial_projections(self, ai_projections: dict) -> dict:
        """Mapper les projections financières de l'IA vers le format du modèle"""
        mapped = {}
        
        # Extraire year_1 si disponible
        year_1 = ai_projections.get('year_1', {})
        if year_1:
            mapped['year_1_revenue'] = year_1.get('revenue', 0)
            mapped['year_1_expenses'] = year_1.get('expenses', 0)
            mapped['year_1_profit'] = year_1.get('profit', 0)
        else:
            # Valeurs par défaut si year_1 n'est pas disponible
            mapped['year_1_revenue'] = 0
            mapped['year_1_expenses'] = 0
            mapped['year_1_profit'] = 0
        
        # Break even (gérer les deux formats possibles)
        mapped['break_even_month'] = ai_projections.get('break_even_months') or ai_projections.get('break_even_month', 0)
        
        return mapped


class BusinessPlanDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Détails, modification et suppression d'un plan d'affaires"""
    permission_classes = [IsAuthenticated]
    queryset = BusinessPlan.objects.select_related(
        'entrepreneur', 'activity', 'template'
    ).prefetch_related('validations', 'comments')
    serializer_class = BusinessPlanSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()
        role = getattr(user, 'role', '') or ''
        if (
            user.is_superuser or user.is_staff
            or role in ('admin', 'administrateur')
        ):
            return qs
        if role == 'bailleur':
            return qs
        if role == 'entrepreneur' and hasattr(user, 'entrepreneur') and user.entrepreneur:
            return qs.filter(entrepreneur_id=user.entrepreneur.id)
        if role == 'coach':
            from apps.coaches.models import Coach, CoachAssignment
            coach = getattr(user, 'coach', None)
            if coach is None:
                try:
                    coach = Coach.objects.get(user=user)
                except Coach.DoesNotExist:
                    return qs.none()
            eids = CoachAssignment.objects.filter(
                coach=coach, status='active'
            ).values_list('entrepreneur_id', flat=True)
            return qs.filter(entrepreneur_id__in=eids)
        return qs.none()
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return BusinessPlanUpdateSerializer
        return BusinessPlanSerializer


class EntrepreneurBusinessPlanListView(generics.ListCreateAPIView):
    """Plans d'affaires d'un entrepreneur spécifique"""
    serializer_class = BusinessPlanSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'is_validated', 'activity']
    search_fields = ['title', 'summary']
    ordering_fields = ['title', 'status', 'created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        entrepreneur_id = self.kwargs['entrepreneur_id']
        return BusinessPlan.objects.filter(
            entrepreneur_id=entrepreneur_id
        ).select_related(
            'entrepreneur', 'activity', 'template'
        ).prefetch_related('validations', 'comments')
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return BusinessPlanCreateSerializer
        return BusinessPlanSerializer
    
    def create(self, request, *args, **kwargs):
        """Création avec gestion d'erreur pour contrainte UNIQUE"""
        try:
            return super().create(request, *args, **kwargs)
        except IntegrityError as e:
            error_str = str(e)
            # Détecter l'erreur de contrainte UNIQUE
            if 'UNIQUE constraint' in error_str or 'unique constraint' in error_str.lower():
                # Extraire les informations de la requête
                entrepreneur_id = self.kwargs.get('entrepreneur_id') or request.data.get('entrepreneur')
                activity_id = request.data.get('activity')
                
                # Chercher le plan existant
                existing_plan = None
                if entrepreneur_id and activity_id:
                    try:
                        existing_plan = BusinessPlan.objects.filter(
                            entrepreneur_id=entrepreneur_id,
                            activity_id=activity_id
                        ).order_by('-version').first()
                    except Exception:
                        pass
                
                response_data = {
                    'error': 'Un plan d\'affaires existe déjà pour cette activité et cette version',
                    'message': 'Vous ne pouvez pas créer plusieurs plans d\'affaires pour la même activité avec la même version. Veuillez modifier le plan existant ou créer une nouvelle version.',
                }
                
                if existing_plan:
                    response_data['existing_plan_id'] = str(existing_plan.id)
                    response_data['existing_plan_title'] = existing_plan.title
                    response_data['existing_plan_version'] = existing_plan.version
                
                return Response(response_data, status=status.HTTP_409_CONFLICT)
            else:
                # Autre erreur d'intégrité
                logging.error(f"IntegrityError lors de la création du plan: {error_str}")
                return Response({
                    'error': 'Erreur lors de la création du plan',
                    'message': 'Une contrainte de base de données a été violée',
                    'details': error_str
                }, status=status.HTTP_400_BAD_REQUEST)


class BusinessPlanDashboardView(generics.ListAPIView):
    """Tableau de bord des plans d'affaires avec statistiques"""
    serializer_class = BusinessPlanDashboardSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['status', 'is_validated', 'activity__sector']
    search_fields = ['title', 'entrepreneur__first_name', 'entrepreneur__last_name']
    
    def get_queryset(self):
        return BusinessPlan.objects.select_related(
            'entrepreneur', 'activity'
        ).prefetch_related('validations')
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Statistiques globales des plans d'affaires"""
        queryset = self.get_queryset()
        
        stats = {
            'total_plans': queryset.count(),
            'draft_plans': queryset.filter(status='draft').count(),
            'submitted_plans': queryset.filter(status='submitted').count(),
            'approved_plans': queryset.filter(status='approved').count(),
            'rejected_plans': queryset.filter(status='rejected').count(),
            'validated_plans': queryset.filter(is_validated=True).count(),
            'sector_distribution': queryset.values('activity__sector').annotate(
                count=Count('id')
            ),
            'recent_plans': queryset.filter(
                created_at__gte=timezone.now() - timezone.timedelta(days=30)
            ).count(),
        }
        
        return Response(stats)


# ============================================================================
# VALIDATIONS DE PLANS D'AFFAIRES
# ============================================================================

class BusinessPlanValidationListView(generics.ListCreateAPIView):
    """Liste et création de validations de plans d'affaires"""
    queryset = BusinessPlanValidation.objects.select_related('business_plan', 'validator')
    serializer_class = BusinessPlanValidationSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['validation_type', 'is_approved', 'business_plan']
    search_fields = ['business_plan__title', 'validator__phone', 'comments']
    ordering_fields = ['created_at', 'score']
    ordering = ['-created_at']


class BusinessPlanValidationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Détails, modification et suppression d'une validation"""
    queryset = BusinessPlanValidation.objects.select_related('business_plan', 'validator')
    serializer_class = BusinessPlanValidationSerializer


class BusinessPlanValidationCreateView(generics.CreateAPIView):
    """Création d'une validation pour un plan d'affaires spécifique"""
    serializer_class = BusinessPlanValidationSerializer
    
    def perform_create(self, serializer):
        business_plan = get_object_or_404(BusinessPlan, pk=self.kwargs['business_plan_id'])
        serializer.save(
            business_plan=business_plan,
            validator=self.request.user
        )
        
        # Mettre à jour le statut du plan d'affaires si nécessaire
        if serializer.validated_data['is_approved']:
            business_plan.is_validated = True
            business_plan.validation_date = timezone.now()
            business_plan.validated_by = self.request.user
            business_plan.save()


# ============================================================================
# COMMENTAIRES DE PLANS D'AFFAIRES
# ============================================================================

class BusinessPlanCommentListView(generics.ListCreateAPIView):
    """Liste et création de commentaires sur un plan d'affaires"""
    serializer_class = BusinessPlanCommentSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_internal', 'section']
    search_fields = ['content', 'author__phone']
    ordering_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        business_plan_id = self.kwargs['business_plan_id']
        return BusinessPlanComment.objects.filter(
            business_plan_id=business_plan_id
        ).select_related('author')
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return BusinessPlanCommentCreateSerializer
        return BusinessPlanCommentSerializer
    
    def perform_create(self, serializer):
        business_plan = get_object_or_404(BusinessPlan, pk=self.kwargs['business_plan_id'])
        serializer.save(
            business_plan=business_plan,
            author=self.request.user
        )


class BusinessPlanCommentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Détails, modification et suppression d'un commentaire"""
    queryset = BusinessPlanComment.objects.select_related('author', 'business_plan')
    serializer_class = BusinessPlanCommentSerializer


# ============================================================================
# VUES SPÉCIALISÉES
# ============================================================================

class BusinessPlanSearchView(generics.ListAPIView):
    """Recherche avancée de plans d'affaires"""
    serializer_class = BusinessPlanSummarySerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'is_validated', 'activity__sector', 'entrepreneur']
    search_fields = ['title', 'summary', 'entrepreneur__first_name', 'entrepreneur__last_name']
    ordering_fields = ['title', 'status', 'created_at', 'updated_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        queryset = BusinessPlan.objects.select_related(
            'entrepreneur', 'activity'
        ).prefetch_related('validations', 'comments')
        
        # Filtres supplémentaires
        sector = self.request.query_params.get('sector')
        if sector:
            queryset = queryset.filter(activity__sector=sector)
        
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        validated = self.request.query_params.get('validated')
        if validated is not None:
            validated_bool = validated.lower() == 'true'
            queryset = queryset.filter(is_validated=validated_bool)
        
        return queryset


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def business_plan_export_pdf_view(request, pk=None):
    """Génération ou téléchargement d'un PDF du plan d'affaires"""
    from .services import pdf_export_service
    from .models import BusinessPlan
    from django.http import HttpResponse, FileResponse, Http404
    from django.utils import timezone
    from datetime import timedelta
    
    # Récupérer le plan d'affaires
    try:
        business_plan = BusinessPlan.objects.select_related(
            'entrepreneur', 'activity', 'template'
        ).prefetch_related('validations', 'comments').get(pk=pk)
        
        # Rafraîchir l'objet depuis la base de données pour avoir les données les plus récentes
        business_plan.refresh_from_db()
        
    except BusinessPlan.DoesNotExist:
        return Response({'error': 'Plan d\'affaires non trouvé'}, status=status.HTTP_404_NOT_FOUND)
    
    # Vérifier les permissions (propriétaire, coach, admin)
    if (request.user.role not in ['admin', 'coach'] and 
        business_plan.entrepreneur.user != request.user):
        return Response({'error': 'Permission refusée'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        # Si le PDF existe déjà et a été généré récemment (moins de 24h), le retourner directement
        if business_plan.pdf_file and business_plan.pdf_generated_at:
            # Vérifier si le PDF est récent (moins de 24h)
            if timezone.now() - business_plan.pdf_generated_at < timedelta(hours=24):
                # Retourner le fichier existant
                return FileResponse(
                    business_plan.pdf_file.open('rb'),
                    content_type='application/pdf',
                    filename=f'business_plan_{business_plan.id}.pdf'
                )
        
        # Sinon, générer un nouveau PDF (qui sera sauvegardé automatiquement)
        pdf_response = pdf_export_service.export_to_pdf(business_plan, output_format='pdf')
        
        # Retourner directement l'HttpResponse
        return pdf_response
            
    except Exception as e:
        # Fallback sur JSON avec erreur
        import traceback
        error_details = str(e)
        traceback.print_exc()
        return Response({
            'error': f'Erreur génération PDF: {error_details}',
            'message': 'Utilisez le endpoint export/summary/ pour voir les données',
            'data': BusinessPlanSerializer(business_plan).data
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def business_plan_download_pdf_view(request, pk=None):
    """Téléchargement du PDF stocké d'un plan d'affaires via API - Vue Django classique pour éviter les problèmes DRF"""
    from .models import BusinessPlan
    from django.http import FileResponse, JsonResponse
    from rest_framework_simplejwt.authentication import JWTAuthentication
    from rest_framework.exceptions import AuthenticationFailed
    
    logger = logging.getLogger(__name__)
    
    # Authentification JWT manuelle
    jwt_auth = JWTAuthentication()
    try:
        validated_token = jwt_auth.get_validated_token(jwt_auth.get_raw_token(jwt_auth.get_header(request)))
        user = jwt_auth.get_user(validated_token)
        request.user = user
    except Exception as e:
        logger.warning(f"⚠️ Authentification échouée: {e}")
        return JsonResponse({'error': 'Authentification requise'}, status=401)
    
    # Récupérer le plan d'affaires
    try:
        business_plan = BusinessPlan.objects.select_related(
            'entrepreneur', 'activity', 'template'
        ).get(pk=pk)
        logger.info(f"📥 Demande de téléchargement PDF pour plan {pk} par {request.user.phone}")
    except BusinessPlan.DoesNotExist:
        logger.warning(f"⚠️ Plan d'affaires {pk} non trouvé")
        return JsonResponse({'error': 'Plan d\'affaires non trouvé'}, status=404)
    
    # Vérifier les permissions (propriétaire, coach, admin)
    if (request.user.role not in ['admin', 'coach'] and 
        business_plan.entrepreneur.user != request.user):
        logger.warning(f"⚠️ Permission refusée pour {request.user.phone} sur plan {pk}")
        return JsonResponse({'error': 'Permission refusée'}, status=403)
    
    # Vérifier si le PDF existe
    if not business_plan.pdf_file:
        logger.warning(f"⚠️ PDF non disponible pour plan {pk}")
        return JsonResponse({
            'error': 'PDF non disponible',
            'message': 'Le PDF n\'a pas encore été généré. Utilisez /export/pdf/ pour le générer.'
        }, status=404)
    
    try:
        logger.info(f"✅ Envoi du PDF {business_plan.pdf_file.name} pour plan {pk}")
        # Retourner le fichier PDF stocké directement (pas de négociation de contenu DRF)
        file_response = FileResponse(
            business_plan.pdf_file.open('rb'),
            content_type='application/pdf',
            filename=f'business_plan_{business_plan.id}.pdf'
        )
        # Ajouter des headers pour le cache et le téléchargement
        file_response['Content-Disposition'] = f'attachment; filename="business_plan_{business_plan.id}.pdf"'
        file_response['Cache-Control'] = 'private, max-age=3600'
        return file_response
    except Exception as e:
        logger.error(f"❌ Erreur lors du téléchargement du PDF: {e}", exc_info=True)
        return JsonResponse({
            'error': 'Erreur lors du téléchargement du PDF',
            'message': str(e)
        }, status=500)


class BusinessPlanExportSummaryView(generics.RetrieveAPIView):
    """Résumé exécutif du plan d'affaires"""
    queryset = BusinessPlan.objects.select_related(
        'entrepreneur', 'activity', 'template'
    ).prefetch_related('validations', 'comments')
    serializer_class = BusinessPlanSerializer
    
    def get(self, request, pk=None):
        """Résumé exécutif du plan d'affaires"""
        business_plan = self.get_object()
        
        summary_data = {
            'title': business_plan.title,
            'entrepreneur': business_plan.entrepreneur.full_name,
            'activity': business_plan.activity.title,
            'sector': business_plan.activity.get_sector_display(),
            'summary': business_plan.summary,
            'status': business_plan.get_status_display(),
            'version': business_plan.version,
            'created_at': business_plan.created_at,
            'validation_score': None
        }
        
        # Calculer le score de validation moyen
        validations = business_plan.validations.filter(is_approved=True)
        if validations.exists():
            scores = [v.score for v in validations if v.score]
            if scores:
                summary_data['validation_score'] = sum(scores) / len(scores)
        
        return Response(summary_data)


# ============================================================================
# TEMPLATES GUIDÉS ET QUESTIONNAIRES
# ============================================================================

class GuidedTemplateQuestionsView(generics.RetrieveAPIView):
    """Récupère les questions guidées pour un secteur"""
    
    def get(self, request, sector=None):
        """Récupère les questions du template guidé pour un secteur"""
        questions = guided_template_service.get_template_questions(sector)
        
        if not questions:
            return Response({
                'error': f'Aucun template guidé disponible pour le secteur: {sector}'
            }, status=status.HTTP_404_NOT_FOUND)
        
        return Response(questions)


class GuidedPlanGenerationView(generics.CreateAPIView):
    """Génère un plan d'affaires à partir des réponses au questionnaire"""
    
    def post(self, request):
        """Génère un plan d'affaires depuis les réponses"""
        sector = request.data.get('sector')
        answers = request.data.get('answers', {})
        entrepreneur_id = request.data.get('entrepreneur_id')
        activity_id = request.data.get('activity_id')
        title = request.data.get('title')
        
        if not all([sector, entrepreneur_id, activity_id, title]):
            return Response({
                'error': 'Secteur, entrepreneur, activité et titre sont requis'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Générer le plan depuis les réponses
        generated_plan = guided_template_service.generate_plan_from_answers(sector, answers)
        
        if not generated_plan:
            return Response({
                'error': f'Impossible de générer le plan pour le secteur: {sector}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Récupérer entrepreneur et activité
        entrepreneur = get_object_or_404(
            Entrepreneur, pk=entrepreneur_id
        )
        activity = get_object_or_404(
            Activity, pk=activity_id
        )
        
        # Créer le plan d'affaires
        try:
            business_plan = BusinessPlan.objects.create(
                entrepreneur=entrepreneur,
                activity=activity,
                title=title,
                summary=f"Plan d'affaires généré automatiquement pour {sector}",
                market_analysis=generated_plan.get('market_analysis', {}),
                offer=generated_plan.get('offer', {}),
                business_model=generated_plan.get('business_model', {}),
                financial_projections=generated_plan.get('financial_projections', {}),
                implementation_plan=generated_plan.get('implementation_plan', {}),
                status='draft'
            )
            
            serializer = BusinessPlanSerializer(business_plan)
            return Response({
                'message': 'Plan d\'affaires généré avec succès',
                'business_plan': serializer.data
            }, status=status.HTTP_201_CREATED)
            
        except IntegrityError as e:
            error_str = str(e)
            # Détecter l'erreur de contrainte UNIQUE
            if 'UNIQUE constraint' in error_str or 'unique constraint' in error_str.lower():
                # Chercher le plan existant
                existing_plan = BusinessPlan.objects.filter(
                    entrepreneur=entrepreneur,
                    activity=activity
                ).order_by('-version').first()
                
                response_data = {
                    'error': 'Un plan d\'affaires existe déjà pour cette activité et cette version',
                    'message': 'Vous ne pouvez pas créer plusieurs plans d\'affaires pour la même activité avec la même version. Veuillez modifier le plan existant ou créer une nouvelle version.',
                }
                
                if existing_plan:
                    response_data['existing_plan_id'] = str(existing_plan.id)
                    response_data['existing_plan_title'] = existing_plan.title
                    response_data['existing_plan_version'] = existing_plan.version
                
                return Response(response_data, status=status.HTTP_409_CONFLICT)
            else:
                # Autre erreur d'intégrité
                logging.error(f"IntegrityError lors de la création du plan guidé: {error_str}")
                return Response({
                    'error': 'Erreur lors de la création du plan',
                    'message': 'Une contrainte de base de données a été violée',
                    'details': error_str
                }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logging.error(f"Erreur lors de la création du plan guidé: {str(e)}")
            return Response({
                'error': f'Erreur lors de la création du plan: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# WORKFLOW DE VALIDATION
# ============================================================================

class WorkflowStatusView(generics.RetrieveAPIView):
    """Statut du workflow de validation d'un plan d'affaires"""
    
    queryset = BusinessPlan.objects.prefetch_related('validations', 'validations__validator')
    
    def get(self, request, pk=None):
        """Retourne le statut du workflow de validation"""
        business_plan = self.get_object()
        
        # Récupérer les validations
        validations = business_plan.validations.all()
        validation_data = BusinessPlanValidationSerializer(validations, many=True).data
        
        # Workflow type (basic ou funding)
        workflow_type = request.query_params.get('workflow_type', 'basic')
        
        # Étapes du workflow
        workflow_steps = validation_workflow_service.get_workflow_steps(workflow_type)
        
        # Prochaine étape
        next_step = validation_workflow_service.get_next_step(
            [v for v in validation_data if v.get('is_approved')],
            workflow_type
        )
        
        # Workflow complété ?
        is_complete = validation_workflow_service.is_workflow_complete(
            validation_data,
            workflow_type
        )
        
        return Response({
            'business_plan_id': str(business_plan.id),
            'workflow_type': workflow_type,
            'workflow_steps': workflow_steps,
            'completed_steps': [v['validation_type'] for v in validation_data if v.get('is_approved')],
            'next_step': next_step,
            'is_complete': is_complete,
            'can_validate': (
                request.user.role in ['coach', 'bailleur', 'admin', 'administrateur']
                or request.user.is_staff
                or request.user.is_superuser
            ),
            'validations': validation_data
        })


class ValidationWithWorkflowView(generics.CreateAPIView):
    """Validation avec workflow"""
    
    serializer_class = BusinessPlanValidationSerializer
    
    def post(self, request, business_plan_id=None):
        """Valider un plan selon le workflow"""
        business_plan = get_object_or_404(BusinessPlan, pk=business_plan_id)
        
        # Récupérer les données de validation
        validation_type = request.data.get('validation_type')
        is_approved = request.data.get('is_approved', False)
        comments = request.data.get('comments', '')
        score = request.data.get('score')
        
        if not validation_type:
            return Response({
                'error': 'Type de validation requis'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        workflow_type = request.data.get('workflow_type', 'basic')
        raw_role = getattr(request.user, 'role', '') or ''
        if request.user.is_superuser or request.user.is_staff:
            effective_role = 'admin'
        elif raw_role in ('admin', 'administrateur'):
            effective_role = 'admin'
        else:
            effective_role = raw_role

        can_validate = validation_workflow_service.can_validate_step(
            effective_role,
            validation_type,
            workflow_type
        )
        
        if not can_validate:
            return Response({
                'error': f'Vous n\'avez pas les droits pour valider l\'étape: {validation_type}'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Créer la validation
        validation = BusinessPlanValidation.objects.create(
            business_plan=business_plan,
            validator=request.user,
            validation_type=validation_type,
            is_approved=is_approved,
            comments=comments,
            score=score
        )
        
        # Mettre à jour le statut du plan
        if is_approved:
            # Récupérer toutes les validations approuvées pour vérifier si le workflow est complet
            all_validations = business_plan.validations.all()
            validation_data = BusinessPlanValidationSerializer(all_validations, many=True).data
            
            # Vérifier si toutes les étapes requises du workflow sont complètes
            is_complete = validation_workflow_service.is_workflow_complete(
                validation_data,
                workflow_type
            )
            # Un administrateur plateforme approuve en une fois le workflow « basic » (retours client).
            is_platform_admin = (
                request.user.is_superuser
                or request.user.is_staff
                or raw_role in ('admin', 'administrateur')
            )
            if is_approved and is_platform_admin and workflow_type == 'basic':
                is_complete = True
            
            if is_complete:
                # Toutes les étapes sont complètes, le plan est approuvé
                business_plan.status = 'approved'
                business_plan.is_validated = True
                business_plan.validation_date = timezone.now()
                business_plan.validated_by = request.user
                
                # Notifier l'entrepreneur que son plan est approuvé
                try:
                    from .notifications import notify_business_plan_approved
                    notify_business_plan_approved(business_plan)
                except Exception as e:
                    logging.warning(f"⚠️ Erreur notification plan approuvé: {e}")
            else:
                # Il reste des étapes à valider, le plan reste en révision
                business_plan.status = 'under_review'
                # Mettre à jour is_validated et validation_date même si pas encore complètement approuvé
                # car une validation partielle a été effectuée
                if not business_plan.is_validated:
                    business_plan.is_validated = False
        else:
            business_plan.status = 'rejected'
            business_plan.is_validated = False
        
        business_plan.save()
        
        serializer = BusinessPlanValidationSerializer(validation)
        
        # Message personnalisé selon le statut final
        if is_approved:
            if business_plan.status == 'approved':
                message = 'Plan d\'affaires approuvé avec succès. Toutes les validations sont complètes.'
            else:
                message = 'Validation enregistrée avec succès. Le plan reste en cours de révision (étapes restantes).'
        else:
            message = 'Plan d\'affaires rejeté.'
        
        return Response({
            'message': message,
            'validation': serializer.data,
            'business_plan_status': business_plan.status,
            'business_plan_status_display': business_plan.get_status_display(),
            'is_workflow_complete': is_approved and business_plan.status == 'approved'
        }, status=status.HTTP_201_CREATED)

