from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Count, Avg
from datetime import timedelta

from .models import Report, ReportTemplate, ReportSchedule, ReportDistribution
from .serializers import (
    ReportSerializer, ReportCreateSerializer,
    ReportTemplateSerializer, ReportTemplateCreateSerializer,
    ReportScheduleSerializer, ReportScheduleCreateSerializer,
    ReportDistributionSerializer, ReportDistributionCreateSerializer,
    ReportGenerationSerializer, ReportDownloadSerializer,
    ScheduleActionSerializer, DistributionActionSerializer,
    ReportStatisticsSerializer, TemplateUsageSerializer, SchedulePerformanceSerializer
)


class ReportViewSet(viewsets.ModelViewSet):
    """ViewSet pour les rapports"""
    
    queryset = Report.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ReportCreateSerializer
        return ReportSerializer
    
    def get_queryset(self):
        """Filtre les rapports par type et utilisateur"""
        queryset = Report.objects.select_related('target_user', 'activity')
        
        # Filtre par utilisateur cible
        target_user_id = self.request.query_params.get('target_user_id')
        if target_user_id:
            queryset = queryset.filter(target_user_id=target_user_id)
        
        # Filtre par type de rapport
        report_type = self.request.query_params.get('report_type')
        if report_type:
            queryset = queryset.filter(report_type=report_type)
        
        # Filtre par format
        format_filter = self.request.query_params.get('format')
        if format_filter:
            queryset = queryset.filter(format=format_filter)
        
        # Filtre par statut de génération
        is_generated = self.request.query_params.get('is_generated')
        if is_generated == 'true':
            queryset = queryset.filter(is_generated=True)
        elif is_generated == 'false':
            queryset = queryset.filter(is_generated=False)
        
        # Filtre par période
        period_start = self.request.query_params.get('period_start')
        if period_start:
            queryset = queryset.filter(period_start__gte=period_start)
        
        period_end = self.request.query_params.get('period_end')
        if period_end:
            queryset = queryset.filter(period_end__lte=period_end)
        
        return queryset.order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def generate(self, request, pk=None):
        """Génère un rapport"""
        report = self.get_object()
        
        # Simuler la génération de rapport
        start_time = timezone.now()
        
        try:
            # Logique de génération (à implémenter selon les besoins)
            report.is_generated = True
            report.generated_at = timezone.now()
            report.file_path = f'/reports/{report.id}.{report.format}'
            report.file_size = 1024000  # 1MB simulé
            report.save()
            
            generation_duration = int((timezone.now() - start_time).total_seconds())
            
            data = {
                'report_id': report.id,
                'generation_status': 'completed',
                'file_path': report.file_path,
                'file_size': report.file_size,
                'generation_duration': generation_duration
            }
            
            serializer = ReportGenerationSerializer(data)
            return Response(serializer.data)
            
        except Exception as e:
            data = {
                'report_id': report.id,
                'generation_status': 'failed',
                'error_message': str(e)
            }
            
            serializer = ReportGenerationSerializer(data)
            return Response(serializer.data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Télécharge un rapport"""
        report = self.get_object()
        
        if not report.is_generated:
            return Response({
                'error': 'Le rapport n\'est pas encore généré'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Simuler le téléchargement
        download_url = f'/api/reports/{report.id}/download/'
        expires_at = timezone.now() + timedelta(hours=24)
        
        data = {
            'report_id': report.id,
            'download_url': download_url,
            'file_name': f"{report.title}.{report.format}",
            'file_size': report.file_size,
            'expires_at': expires_at
        }
        
        serializer = ReportDownloadSerializer(data)
        return Response(serializer.data)


class ReportTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet pour les templates de rapports"""
    
    queryset = ReportTemplate.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ReportTemplateCreateSerializer
        return ReportTemplateSerializer
    
    def get_queryset(self):
        """Filtre les templates par catégorie et statut"""
        queryset = ReportTemplate.objects.all()
        
        # Filtre par catégorie
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        
        # Filtre par statut actif
        is_active = self.request.query_params.get('is_active')
        if is_active == 'true':
            queryset = queryset.filter(is_active=True)
        elif is_active == 'false':
            queryset = queryset.filter(is_active=False)
        
        # Filtre par système
        is_system = self.request.query_params.get('is_system')
        if is_system == 'true':
            queryset = queryset.filter(is_system=True)
        elif is_system == 'false':
            queryset = queryset.filter(is_system=False)
        
        return queryset.order_by('category', 'name')


class ReportScheduleViewSet(viewsets.ModelViewSet):
    """ViewSet pour les planifications de rapports"""
    
    queryset = ReportSchedule.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ReportScheduleCreateSerializer
        return ReportScheduleSerializer
    
    def get_queryset(self):
        """Filtre les planifications par utilisateur et statut"""
        queryset = ReportSchedule.objects.select_related('template', 'target_user')
        
        # Filtre par utilisateur cible
        target_user_id = self.request.query_params.get('target_user_id')
        if target_user_id:
            queryset = queryset.filter(target_user_id=target_user_id)
        
        # Filtre par template
        template_id = self.request.query_params.get('template_id')
        if template_id:
            queryset = queryset.filter(template_id=template_id)
        
        # Filtre par fréquence
        frequency = self.request.query_params.get('frequency')
        if frequency:
            queryset = queryset.filter(frequency=frequency)
        
        # Filtre par statut
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filtre par statut actif
        is_active = self.request.query_params.get('is_active')
        if is_active == 'true':
            queryset = queryset.filter(status='active')
        
        return queryset.order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Active une planification"""
        schedule = self.get_object()
        
        if schedule.status == 'active':
            return Response({
                'error': 'La planification est déjà active'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        schedule.status = 'active'
        schedule.save()
        
        serializer = self.get_serializer(schedule)
        return Response({
            'message': 'Planification activée avec succès',
            'schedule': serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Désactive une planification"""
        schedule = self.get_object()
        
        if schedule.status != 'active':
            return Response({
                'error': 'La planification n\'est pas active'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        schedule.status = 'paused'
        schedule.save()
        
        serializer = self.get_serializer(schedule)
        return Response({
            'message': 'Planification désactivée avec succès',
            'schedule': serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def action(self, request, pk=None):
        """Action générique sur une planification"""
        schedule = self.get_object()
        serializer = ScheduleActionSerializer(data=request.data, context={'schedule': schedule})
        
        if serializer.is_valid():
            action = serializer.validated_data['action']
            
            if action == 'activate':
                schedule.status = 'active'
                schedule.save()
                return Response({'message': 'Planification activée'})
            
            elif action == 'deactivate':
                schedule.status = 'paused'
                schedule.save()
                return Response({'message': 'Planification désactivée'})
            
            elif action == 'pause':
                schedule.status = 'paused'
                schedule.save()
                return Response({'message': 'Planification mise en pause'})
            
            elif action == 'resume':
                schedule.status = 'active'
                schedule.save()
                return Response({'message': 'Planification reprise'})
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ReportDistributionViewSet(viewsets.ModelViewSet):
    """ViewSet pour les distributions de rapports"""
    
    queryset = ReportDistribution.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ReportDistributionCreateSerializer
        return ReportDistributionSerializer
    
    def get_queryset(self):
        """Filtre les distributions par rapport et destinataire"""
        queryset = ReportDistribution.objects.select_related('report', 'recipient')
        
        # Filtre par rapport
        report_id = self.request.query_params.get('report_id')
        if report_id:
            queryset = queryset.filter(report_id=report_id)
        
        # Filtre par destinataire
        recipient_id = self.request.query_params.get('recipient_id')
        if recipient_id:
            queryset = queryset.filter(recipient_id=recipient_id)
        
        # Filtre par méthode de livraison
        delivery_method = self.request.query_params.get('delivery_method')
        if delivery_method:
            queryset = queryset.filter(delivery_method=delivery_method)
        
        # Filtre par statut
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset.order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def retry(self, request, pk=None):
        """Réessaie une distribution"""
        distribution = self.get_object()
        
        if not distribution.can_retry:
            return Response({
                'error': 'Cette distribution ne peut pas être réessayée'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Simuler une nouvelle tentative
        distribution.status = 'pending'
        distribution.attempts += 1
        distribution.save()
        
        serializer = self.get_serializer(distribution)
        return Response({
            'message': 'Distribution relancée',
            'distribution': serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def mark_delivered(self, request, pk=None):
        """Marque une distribution comme livrée"""
        distribution = self.get_object()
        
        if distribution.status != 'sent':
            return Response({
                'error': 'Seules les distributions envoyées peuvent être marquées comme livrées'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        distribution.mark_as_delivered()
        serializer = self.get_serializer(distribution)
        return Response({
            'message': 'Distribution marquée comme livrée',
            'distribution': serializer.data
        })


# Vues fonctionnelles pour les actions spécifiques
def generate_report(request, pk):
    """Vue pour générer un rapport"""
    report = get_object_or_404(Report, pk=pk)
    
    # Simulation de génération
    report.is_generated = True
    report.generated_at = timezone.now()
    report.file_path = f'/reports/{report.id}.{report.format}'
    report.file_size = 1024000
    report.save()
    
    data = {
        'report_id': report.id,
        'generation_status': 'completed',
        'file_path': report.file_path,
        'file_size': report.file_size
    }
    
    return Response(data)


def download_report(request, pk):
    """Vue pour télécharger un rapport"""
    report = get_object_or_404(Report, pk=pk)
    
    if not report.is_generated:
        return Response({
            'error': 'Le rapport n\'est pas encore généré'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    download_url = f'/api/reports/{report.id}/download/'
    expires_at = timezone.now() + timedelta(hours=24)
    
    data = {
        'report_id': report.id,
        'download_url': download_url,
        'file_name': f"{report.title}.{report.format}",
        'file_size': report.file_size,
        'expires_at': expires_at
    }
    
    return Response(data)


def activate_schedule(request, pk):
    """Vue pour activer une planification"""
    schedule = get_object_or_404(ReportSchedule, pk=pk)
    
    if schedule.status == 'active':
        return Response({
            'error': 'La planification est déjà active'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    schedule.status = 'active'
    schedule.save()
    
    return Response({'message': 'Planification activée'})


def deactivate_schedule(request, pk):
    """Vue pour désactiver une planification"""
    schedule = get_object_or_404(ReportSchedule, pk=pk)
    
    if schedule.status != 'active':
        return Response({
            'error': 'La planification n\'est pas active'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    schedule.status = 'paused'
    schedule.save()
    
    return Response({'message': 'Planification désactivée'})
