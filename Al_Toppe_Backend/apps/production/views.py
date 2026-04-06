from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import timedelta

from .models import ProductionCycle, ProductionTask
from .serializers import (
    ProductionCycleSerializer, ProductionCycleDetailSerializer, ProductionCycleCreateSerializer,
    ProductionTaskSerializer, ProductionTaskCreateSerializer,
    ProductionProgressSerializer, ProductionTaskActionSerializer
)


class ProductionCycleViewSet(viewsets.ModelViewSet):
    """ViewSet pour les cycles de production"""
    
    queryset = ProductionCycle.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ProductionCycleCreateSerializer
        elif self.action == 'retrieve':
            return ProductionCycleDetailSerializer
        return ProductionCycleSerializer
    
    def get_queryset(self):
        """Filtre les cycles par activité et entrepreneur"""
        queryset = ProductionCycle.objects.select_related('activity', 'activity__entrepreneur')
        
        # Filtre par activité
        activity_id = self.request.query_params.get('activity_id')
        if activity_id:
            queryset = queryset.filter(activity_id=activity_id)
        
        # Filtre par entrepreneur
        entrepreneur_id = self.request.query_params.get('entrepreneur_id')
        if entrepreneur_id:
            queryset = queryset.filter(activity__entrepreneur_id=entrepreneur_id)
        
        # Filtre par statut
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset.order_by('-created_at')
    
    @action(detail=True, methods=['get'])
    def progress(self, request, pk=None):
        """Récupère les données de progression d'un cycle"""
        cycle = self.get_object()
        
        # Calculer les tâches en retard
        delayed_tasks = cycle.tasks.filter(
            status='in_progress',
            planned_end_date__lt=timezone.now().date()
        ).count()
        
        # Estimer la date de completion
        estimated_completion = None
        if cycle.status == 'in_progress':
            completed_tasks = cycle.get_completed_tasks()
            total_tasks = cycle.get_total_tasks()
            if total_tasks > 0 and completed_tasks > 0:
                progress_ratio = completed_tasks / total_tasks
                elapsed_days = (timezone.now().date() - cycle.start_date).days
                if progress_ratio > 0:
                    estimated_total_days = elapsed_days / progress_ratio
                    estimated_completion = cycle.start_date + timedelta(days=estimated_total_days)
        
        data = {
            'cycle_id': cycle.id,
            'progress_percentage': cycle.progress_percentage,
            'completion_rate': cycle.completion_rate,
            'total_tasks': cycle.get_total_tasks(),
            'completed_tasks': cycle.get_completed_tasks(),
            'delayed_tasks': delayed_tasks,
            'is_delayed': cycle.is_delayed,
            'estimated_completion': estimated_completion
        }
        
        serializer = ProductionProgressSerializer(data)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def tasks(self, request, pk=None):
        """Récupère toutes les tâches d'un cycle"""
        cycle = self.get_object()
        tasks = cycle.tasks.all().order_by('sequence_order')
        serializer = ProductionTaskSerializer(tasks, many=True)
        return Response(serializer.data)


class ProductionTaskViewSet(viewsets.ModelViewSet):
    """ViewSet pour les tâches de production"""
    
    queryset = ProductionTask.objects.all()
    serializer_class = ProductionTaskSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ProductionTaskCreateSerializer
        return ProductionTaskSerializer
    
    def get_queryset(self):
        """Filtre les tâches par cycle et statut"""
        queryset = ProductionTask.objects.select_related('production_cycle', 'depends_on')
        
        # Filtre par cycle
        cycle_id = self.request.query_params.get('cycle_id')
        if cycle_id:
            queryset = queryset.filter(production_cycle_id=cycle_id)
        
        # Filtre par statut
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filtre par dépendance
        depends_on = self.request.query_params.get('depends_on')
        if depends_on:
            if depends_on == 'none':
                queryset = queryset.filter(depends_on__isnull=True)
            else:
                queryset = queryset.filter(depends_on_id=depends_on)
        
        return queryset.order_by('sequence_order')
    
    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """Démarre une tâche"""
        task = self.get_object()
        
        if not task.can_start:
            return Response({
                'error': 'La tâche ne peut pas être démarrée'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if task.start_task():
            serializer = self.get_serializer(task)
            return Response({
                'message': 'Tâche démarrée avec succès',
                'task': serializer.data
            })
        else:
            return Response({
                'error': 'Impossible de démarrer la tâche'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Termine une tâche"""
        task = self.get_object()
        
        if task.complete_task():
            serializer = self.get_serializer(task)
            return Response({
                'message': 'Tâche terminée avec succès',
                'task': serializer.data
            })
        else:
            return Response({
                'error': 'Impossible de terminer la tâche'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def action(self, request, pk=None):
        """Action générique sur une tâche"""
        task = self.get_object()
        serializer = ProductionTaskActionSerializer(data=request.data, context={'task': task})
        
        if serializer.is_valid():
            action = serializer.validated_data['action']
            notes = serializer.validated_data.get('notes', '')
            
            if action == 'start':
                if task.start_task():
                    if notes:
                        task.notes = notes
                        task.save()
                    return Response({'message': 'Tâche démarrée'})
                else:
                    return Response({'error': 'Impossible de démarrer la tâche'}, 
                                  status=status.HTTP_400_BAD_REQUEST)
            
            elif action == 'complete':
                if task.complete_task():
                    if notes:
                        task.notes = notes
                        task.save()
                    return Response({'message': 'Tâche terminée'})
                else:
                    return Response({'error': 'Impossible de terminer la tâche'}, 
                                  status=status.HTTP_400_BAD_REQUEST)
            
            elif action == 'pause':
                task.status = 'blocked'
                if notes:
                    task.notes = notes
                task.save()
                return Response({'message': 'Tâche mise en pause'})
            
            elif action == 'cancel':
                task.status = 'cancelled'
                if notes:
                    task.notes = notes
                task.save()
                return Response({'message': 'Tâche annulée'})
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

