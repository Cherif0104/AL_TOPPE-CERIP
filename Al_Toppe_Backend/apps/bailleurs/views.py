from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Avg, Count, Sum
from datetime import timedelta

from .models import Bailleur, FundingProgram, FundingApplication
from .serializers import (
    BailleurSerializer, BailleurCreateSerializer,
    FundingProgramSerializer, FundingProgramCreateSerializer,
    FundingApplicationSerializer, FundingApplicationCreateSerializer,
    BailleurImpactSerializer, ProgramStatisticsSerializer, ApplicationActionSerializer
)


class BailleurViewSet(viewsets.ModelViewSet):
    """ViewSet pour les bailleurs"""
    
    queryset = Bailleur.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return BailleurCreateSerializer
        return BailleurSerializer
    
    def get_queryset(self):
        """Filtre les bailleurs par type et statut"""
        queryset = Bailleur.objects.select_related('user')
        
        # Filtre par type d'organisation
        org_type = self.request.query_params.get('organization_type')
        if org_type:
            queryset = queryset.filter(organization_type=org_type)
        
        # Filtre par statut
        is_active = self.request.query_params.get('is_active')
        if is_active == 'true':
            queryset = queryset.filter(is_active=True)
        elif is_active == 'false':
            queryset = queryset.filter(is_active=False)
        
        # Filtre par secteur
        sector = self.request.query_params.get('sector')
        if sector:
            queryset = queryset.filter(sectors_supported__contains=[sector])
        
        return queryset.order_by('-created_at')
    
    @action(detail=True, methods=['get'])
    def programs(self, request, pk=None):
        """Récupère les programmes d'un bailleur"""
        bailleur = self.get_object()
        programs = bailleur.funding_programs.all().order_by('-created_at')
        serializer = FundingProgramSerializer(programs, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def impact(self, request, pk=None):
        """Récupère les données d'impact d'un bailleur"""
        bailleur = self.get_object()
        
        # Calculer les métriques
        total_programs = bailleur.funding_programs.count()
        active_programs = bailleur.funding_programs.filter(status='active').count()
        
        # Statistiques des candidatures
        applications_stats = FundingApplication.objects.filter(
            program__bailleur=bailleur
        ).aggregate(
            total_applications=Count('id'),
            approved_applications=Count('id', filter={'status': 'approved'}),
            total_funding=Sum('approved_amount')
        )
        
        total_applications = applications_stats['total_applications'] or 0
        approved_applications = applications_stats['approved_applications'] or 0
        total_funding_provided = applications_stats['total_funding'] or 0
        
        # Calculer le taux d'approbation
        approval_rate = 0
        if total_applications > 0:
            approval_rate = (approved_applications / total_applications) * 100
        
        # Calculer le montant moyen
        average_funding_amount = 0
        if approved_applications > 0:
            average_funding_amount = total_funding_provided / approved_applications
        
        # Nombre d'entrepreneurs soutenus
        entrepreneurs_supported = FundingApplication.objects.filter(
            program__bailleur=bailleur,
            status='approved'
        ).values('entrepreneur').distinct().count()
        
        data = {
            'bailleur_id': bailleur.id,
            'total_programs': total_programs,
            'active_programs': active_programs,
            'total_applications': total_applications,
            'approved_applications': approved_applications,
            'total_funding_provided': total_funding_provided,
            'entrepreneurs_supported': entrepreneurs_supported,
            'approval_rate': approval_rate,
            'average_funding_amount': average_funding_amount
        }
        
        serializer = BailleurImpactSerializer(data)
        return Response(serializer.data)


class FundingProgramViewSet(viewsets.ModelViewSet):
    """ViewSet pour les programmes de financement"""
    
    queryset = FundingProgram.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return FundingProgramCreateSerializer
        return FundingProgramSerializer
    
    def get_queryset(self):
        """Filtre les programmes par bailleur et statut"""
        queryset = FundingProgram.objects.select_related('bailleur')
        
        # Filtre par bailleur
        bailleur_id = self.request.query_params.get('bailleur_id')
        if bailleur_id:
            queryset = queryset.filter(bailleur_id=bailleur_id)
        
        # Filtre par statut
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filtre par type de financement
        funding_type = self.request.query_params.get('funding_type')
        if funding_type:
            queryset = queryset.filter(funding_type=funding_type)
        
        # Filtre par secteur cible
        target_sector = self.request.query_params.get('target_sector')
        if target_sector:
            queryset = queryset.filter(target_sectors__contains=[target_sector])
        
        # Filtre par région cible
        target_region = self.request.query_params.get('target_region')
        if target_region:
            queryset = queryset.filter(target_regions__contains=[target_region])
        
        # Filtre par programmes actifs
        active = self.request.query_params.get('active')
        if active == 'true':
            queryset = queryset.filter(status='active')
        
        return queryset.order_by('-created_at')
    
    @action(detail=True, methods=['get'])
    def applications(self, request, pk=None):
        """Récupère les candidatures d'un programme"""
        program = self.get_object()
        applications = program.applications.all().order_by('-created_at')
        serializer = FundingApplicationSerializer(applications, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def statistics(self, request, pk=None):
        """Récupère les statistiques d'un programme"""
        program = self.get_object()
        
        # Calculer les statistiques
        total_applications = program.applications.count()
        approved_applications = program.applications.filter(status='approved').count()
        rejected_applications = program.applications.filter(status='rejected').count()
        pending_applications = program.applications.filter(
            status__in=['submitted', 'under_review']
        ).count()
        
        # Montant total financé
        total_funding_allocated = program.applications.filter(
            status='approved'
        ).aggregate(
            total=Sum('approved_amount')
        )['total'] or 0
        
        # Taux d'approbation
        approval_rate = 0
        if total_applications > 0:
            approval_rate = (approved_applications / total_applications) * 100
        
        # Temps de traitement moyen
        completed_applications = program.applications.filter(
            review_date__isnull=False
        )
        average_processing_time = 0
        if completed_applications.exists():
            total_days = 0
            for app in completed_applications:
                if app.submitted_at and app.review_date:
                    days = (app.review_date - app.submitted_at.date()).days
                    total_days += days
            average_processing_time = total_days / completed_applications.count()
        
        data = {
            'program_id': program.id,
            'total_applications': total_applications,
            'approved_applications': approved_applications,
            'rejected_applications': rejected_applications,
            'pending_applications': pending_applications,
            'total_funding_allocated': total_funding_allocated,
            'approval_rate': approval_rate,
            'average_processing_time': int(average_processing_time)
        }
        
        serializer = ProgramStatisticsSerializer(data)
        return Response(serializer.data)


class FundingApplicationViewSet(viewsets.ModelViewSet):
    """ViewSet pour les candidatures aux programmes de financement"""
    
    queryset = FundingApplication.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return FundingApplicationCreateSerializer
        return FundingApplicationSerializer
    
    def get_queryset(self):
        """Filtre les candidatures par programme et entrepreneur"""
        queryset = FundingApplication.objects.select_related(
            'entrepreneur', 'activity', 'program', 'program__bailleur'
        )
        
        # Filtre par programme
        program_id = self.request.query_params.get('program_id')
        if program_id:
            queryset = queryset.filter(program_id=program_id)
        
        # Filtre par entrepreneur
        entrepreneur_id = self.request.query_params.get('entrepreneur_id')
        if entrepreneur_id:
            queryset = queryset.filter(entrepreneur_id=entrepreneur_id)
        
        # Filtre par bailleur
        bailleur_id = self.request.query_params.get('bailleur_id')
        if bailleur_id:
            queryset = queryset.filter(program__bailleur_id=bailleur_id)
        
        # Filtre par statut
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset.order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Soumet une candidature"""
        application = self.get_object()
        
        if application.submit_application():
            serializer = self.get_serializer(application)
            return Response({
                'message': 'Candidature soumise avec succès',
                'application': serializer.data
            })
        else:
            return Response({
                'error': 'Impossible de soumettre la candidature'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approuve une candidature"""
        application = self.get_object()
        
        approved_amount = request.data.get('approved_amount')
        evaluation_notes = request.data.get('evaluation_notes', '')
        
        if application.approve_application(approved_amount, evaluation_notes):
            serializer = self.get_serializer(application)
            return Response({
                'message': 'Candidature approuvée avec succès',
                'application': serializer.data
            })
        else:
            return Response({
                'error': 'Impossible d\'approuver la candidature'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Rejette une candidature"""
        application = self.get_object()
        
        rejection_reason = request.data.get('rejection_reason', '')
        evaluation_notes = request.data.get('evaluation_notes', '')
        
        if application.reject_application(rejection_reason, evaluation_notes):
            serializer = self.get_serializer(application)
            return Response({
                'message': 'Candidature rejetée',
                'application': serializer.data
            })
        else:
            return Response({
                'error': 'Impossible de rejeter la candidature'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def action(self, request, pk=None):
        """Action générique sur une candidature"""
        application = self.get_object()
        serializer = ApplicationActionSerializer(data=request.data, context={'application': application})
        
        if serializer.is_valid():
            action = serializer.validated_data['action']
            approved_amount = serializer.validated_data.get('approved_amount')
            rejection_reason = serializer.validated_data.get('rejection_reason', '')
            evaluation_notes = serializer.validated_data.get('evaluation_notes', '')
            
            if action == 'submit':
                if application.submit_application():
                    return Response({'message': 'Candidature soumise'})
                else:
                    return Response({'error': 'Impossible de soumettre la candidature'}, 
                                  status=status.HTTP_400_BAD_REQUEST)
            
            elif action == 'approve':
                if application.approve_application(approved_amount, evaluation_notes):
                    return Response({'message': 'Candidature approuvée'})
                else:
                    return Response({'error': 'Impossible d\'approuver la candidature'}, 
                                  status=status.HTTP_400_BAD_REQUEST)
            
            elif action == 'reject':
                if application.reject_application(rejection_reason, evaluation_notes):
                    return Response({'message': 'Candidature rejetée'})
                else:
                    return Response({'error': 'Impossible de rejeter la candidature'}, 
                                  status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Vues fonctionnelles pour les actions spécifiques
def submit_application(request, pk):
    """Vue pour soumettre une candidature"""
    application = get_object_or_404(FundingApplication, pk=pk)
    if application.submit_application():
        return Response({'message': 'Candidature soumise'})
    return Response({'error': 'Impossible de soumettre la candidature'}, 
                   status=status.HTTP_400_BAD_REQUEST)


def approve_application(request, pk):
    """Vue pour approuver une candidature"""
    application = get_object_or_404(FundingApplication, pk=pk)
    
    approved_amount = request.data.get('approved_amount')
    evaluation_notes = request.data.get('evaluation_notes', '')
    
    if application.approve_application(approved_amount, evaluation_notes):
        return Response({'message': 'Candidature approuvée'})
    return Response({'error': 'Impossible d\'approuver la candidature'}, 
                   status=status.HTTP_400_BAD_REQUEST)


def reject_application(request, pk):
    """Vue pour rejeter une candidature"""
    application = get_object_or_404(FundingApplication, pk=pk)
    
    rejection_reason = request.data.get('rejection_reason', '')
    evaluation_notes = request.data.get('evaluation_notes', '')
    
    if application.reject_application(rejection_reason, evaluation_notes):
        return Response({'message': 'Candidature rejetée'})
    return Response({'error': 'Impossible de rejeter la candidature'}, 
                   status=status.HTTP_400_BAD_REQUEST)


def bailleur_programs(request, pk):
    """Vue pour les programmes d'un bailleur"""
    bailleur = get_object_or_404(Bailleur, pk=pk)
    programs = bailleur.funding_programs.all().order_by('-created_at')
    serializer = FundingProgramSerializer(programs, many=True)
    return Response(serializer.data)


def bailleur_impact(request, pk):
    """Vue pour l'impact d'un bailleur"""
    bailleur = get_object_or_404(Bailleur, pk=pk)
    
    # Calculer les métriques
    total_programs = bailleur.funding_programs.count()
    active_programs = bailleur.funding_programs.filter(status='active').count()
    
    applications_stats = FundingApplication.objects.filter(
        program__bailleur=bailleur
    ).aggregate(
        total_applications=Count('id'),
        approved_applications=Count('id', filter={'status': 'approved'}),
        total_funding=Sum('approved_amount')
    )
    
    total_applications = applications_stats['total_applications'] or 0
    approved_applications = applications_stats['approved_applications'] or 0
    total_funding_provided = applications_stats['total_funding'] or 0
    
    approval_rate = 0
    if total_applications > 0:
        approval_rate = (approved_applications / total_applications) * 100
    
    average_funding_amount = 0
    if approved_applications > 0:
        average_funding_amount = total_funding_provided / approved_applications
    
    entrepreneurs_supported = FundingApplication.objects.filter(
        program__bailleur=bailleur,
        status='approved'
    ).values('entrepreneur').distinct().count()
    
    data = {
        'bailleur_id': bailleur.id,
        'total_programs': total_programs,
        'active_programs': active_programs,
        'total_applications': total_applications,
        'approved_applications': approved_applications,
        'total_funding_provided': total_funding_provided,
        'entrepreneurs_supported': entrepreneurs_supported,
        'approval_rate': approval_rate,
        'average_funding_amount': average_funding_amount
    }
    
    return Response(data)
