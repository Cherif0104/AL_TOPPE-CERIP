from django.shortcuts import render
from rest_framework import status, generics, permissions, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Sum
from django.utils import timezone
from datetime import timedelta

from .models import Entrepreneur, Location, Activity
from .serializers import (
    EntrepreneurSerializer, EntrepreneurCreateSerializer, EntrepreneurUpdateSerializer,
    EntrepreneurSummarySerializer, LocationSerializer, LocationCreateSerializer,
    ActivitySerializer, ActivityCreateSerializer
)


class EntrepreneurListView(generics.ListCreateAPIView):
    """Vue pour lister et créer des entrepreneurs"""
    
    queryset = Entrepreneur.objects.select_related('user').prefetch_related('locations', 'activities')
    serializer_class = EntrepreneurSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['civility', 'created_at']
    search_fields = ['first_name', 'last_name', 'cni_number', 'user__phone']
    ordering_fields = ['created_at', 'first_name', 'last_name']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """Choisir le bon sérialiseur selon l'action"""
        if self.request.method == 'POST':
            
            return EntrepreneurCreateSerializer
        return EntrepreneurSerializer
    
    def get_queryset(self):
        """Filtrer les entrepreneurs selon les permissions"""
        queryset = super().get_queryset()
        
        # Si l'utilisateur est un entrepreneur, ne montrer que son profil
        if self.request.user.is_entrepreneur:
            return queryset.filter(user=self.request.user)
        
        # Si l'utilisateur est un coach, montrer ses entrepreneurs assignés
        elif self.request.user.is_coach:
            return _filter_assigned_entrepreneurs_for_coach(self.request.user, queryset)
        
        # Si l'utilisateur est un bailleur, montrer tous les entrepreneurs
        elif self.request.user.is_bailleur:
            return queryset
        
        # Si l'utilisateur est admin, montrer tous les entrepreneurs
        elif self.request.user.is_admin:
            return queryset
        
        # Par défaut, ne montrer que son propre profil
        return queryset.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        """Créer l'entrepreneur avec l'utilisateur connecté"""
        # if self.request.user.is_entrepreneur:
        #     # Un entrepreneur ne peut créer qu'un seul profil
        #     if Entrepreneur.objects.filter(user=self.request.user).exists():
        #         raise permissions.PermissionDenied("Vous avez déjà un profil entrepreneur.")
        
        entrepreneur = serializer.save()
        return entrepreneur


class EntrepreneurDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Vue pour afficher, modifier et supprimer un entrepreneur"""
    
    queryset = Entrepreneur.objects.select_related('user').prefetch_related('locations', 'activities')
    serializer_class = EntrepreneurSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'
    
    
    def get_serializer_class(self):
        """Choisir le bon sérialiseur selon l'action"""
        if self.request.method in ['PUT', 'PATCH']:
            return EntrepreneurUpdateSerializer
        return EntrepreneurSerializer
    
    def get_queryset(self):
        """Filtrer les entrepreneurs selon les permissions"""
        queryset = super().get_queryset()
        
        # Si l'utilisateur est un entrepreneur, ne montrer que son profil
        if self.request.user.is_entrepreneur:
            return queryset.filter(user=self.request.user)
        
        # Si l'utilisateur est un coach, montrer ses entrepreneurs assignés
        elif self.request.user.is_coach:
            return _filter_assigned_entrepreneurs_for_coach(self.request.user, queryset)
        
        # Si l'utilisateur est un bailleur, montrer tous les entrepreneurs
        elif self.request.user.is_bailleur:
            return queryset
        
        # Si l'utilisateur est admin, montrer tous les entrepreneurs
        elif self.request.user.is_admin:
            return queryset
        
        # Par défaut, ne montrer que son propre profil
        return queryset.filter(user=self.request.user)
    
    def perform_update(self, serializer):
        """Mettre à jour l'entrepreneur"""
        serializer.save()
    
    def perform_destroy(self, instance):
        """Supprimer l'entrepreneur (désactiver l'utilisateur)"""
        # Au lieu de supprimer, désactiver l'utilisateur
        instance.user.is_active = False
        instance.user.save()
        instance.status = 'inactive'
        instance.save()


class EntrepreneurSummaryView(generics.ListAPIView):
    """Vue pour obtenir un résumé des entrepreneurs"""
    
    serializer_class = EntrepreneurSummarySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['civility', 'created_at']
    search_fields = ['first_name', 'last_name']
    
    def get_queryset(self):
        """Filtrer les entrepreneurs selon les permissions"""
        queryset = Entrepreneur.objects.select_related('user').prefetch_related('locations')
        
        # Si l'utilisateur est un entrepreneur, ne montrer que son profil
        if self.request.user.is_entrepreneur:
            return queryset.filter(user=self.request.user)
        
        # Si l'utilisateur est un coach, montrer ses entrepreneurs assignés
        elif self.request.user.is_coach:
            return _filter_assigned_entrepreneurs_for_coach(self.request.user, queryset)
        
        # Si l'utilisateur est un bailleur, montrer tous les entrepreneurs
        elif self.request.user.is_bailleur:
            return queryset
        
        # Si l'utilisateur est admin, montrer tous les entrepreneurs
        elif self.request.user.is_admin:
            return queryset
        
        # Par défaut, ne montrer que son propre profil
        return queryset.filter(user=self.request.user)


def _filter_assigned_entrepreneurs_for_coach(user, queryset):
    """
    Limite la visibilité coach aux entrepreneurs avec assignation active.
    """
    from apps.coaches.models import Coach, CoachAssignment

    coach = getattr(user, 'coach', None)
    if coach is None:
        try:
            coach = Coach.objects.get(user=user)
        except Coach.DoesNotExist:
            return queryset.none()

    entrepreneur_ids = CoachAssignment.objects.filter(
        coach=coach,
        status='active',
    ).values_list('entrepreneur_id', flat=True)
    return queryset.filter(id__in=entrepreneur_ids)


class LocationListView(generics.ListCreateAPIView):
    """Vue pour lister et créer des localisations"""
    
    serializer_class = LocationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filtrer les localisations selon l'entrepreneur"""
        entrepreneur_id = self.kwargs.get('entrepreneur_id')
        if entrepreneur_id:
            return Location.objects.filter(entrepreneur_id=entrepreneur_id)
        return Location.objects.none()
    
    def get_serializer_class(self):
        """Choisir le bon sérialiseur selon l'action"""
        if self.request.method == 'POST':
            return LocationCreateSerializer
        return LocationSerializer
    
    def perform_create(self, serializer):
        """Créer la localisation pour l'entrepreneur spécifié"""
        entrepreneur_id = self.kwargs.get('entrepreneur_id')
        entrepreneur = Entrepreneur.objects.get(id=entrepreneur_id)
        serializer.save(entrepreneur=entrepreneur)


class LocationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Vue pour afficher, modifier et supprimer une localisation"""
    
    serializer_class = LocationSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'
    
    def get_queryset(self):
        """Filtrer les localisations selon l'entrepreneur"""
        entrepreneur_id = self.kwargs.get('entrepreneur_id')
        if entrepreneur_id:
            return Location.objects.filter(entrepreneur_id=entrepreneur_id)
        return Location.objects.none()


class ActivityListView(generics.ListCreateAPIView):
    """Vue pour lister et créer des activités"""
    
    serializer_class = ActivitySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['sector', 'legal_form', 'status', 'creation_date']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'title', 'creation_date']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filtrer les activités selon l'entrepreneur"""
        entrepreneur_id = self.kwargs.get('entrepreneur_id')
        if entrepreneur_id:
            return Activity.objects.filter(entrepreneur_id=entrepreneur_id)
        return Activity.objects.none()
    
    def get_serializer_class(self):
        """Choisir le bon sérialiseur selon l'action"""
        if self.request.method == 'POST':
            return ActivityCreateSerializer
        return ActivitySerializer
    
    def perform_create(self, serializer):
        """Créer l'activité pour l'entrepreneur spécifié"""
        entrepreneur_id = self.kwargs.get('entrepreneur_id')
        entrepreneur = Entrepreneur.objects.get(id=entrepreneur_id)
        serializer.save(entrepreneur=entrepreneur)


class ActivityDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Vue pour afficher, modifier et supprimer une activité"""
    
    serializer_class = ActivitySerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'
    
    def get_queryset(self):
        """Filtrer les activités selon l'entrepreneur"""
        entrepreneur_id = self.kwargs.get('entrepreneur_id')
        if entrepreneur_id:
            return Activity.objects.filter(entrepreneur_id=entrepreneur_id)
        return Activity.objects.none()


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def entrepreneur_dashboard(request, entrepreneur_id):
    """Tableau de bord d'un entrepreneur"""
    
    try:
        entrepreneur = Entrepreneur.objects.get(id=entrepreneur_id)
        
        # Vérifier les permissions
        if request.user.is_entrepreneur and request.user != entrepreneur.user:
            return Response(
                {'error': 'Vous ne pouvez accéder qu\'à votre propre tableau de bord.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Statistiques de base
        activities_count = entrepreneur.activities.count()
        total_revenue = entrepreneur.get_total_revenue()
        total_expenses = sum(activity.get_total_expenses() for activity in entrepreneur.activities.all())
        profit = total_revenue - total_expenses
        
        # Activités récentes
        recent_activities = entrepreneur.activities.order_by('-created_at')[:5]
        
        # Localisations
        locations = entrepreneur.locations.all()
        
        # Données du tableau de bord
        dashboard_data = {
            'entrepreneur': EntrepreneurSerializer(entrepreneur).data,
            'statistics': {
                'activities_count': activities_count,
                'total_revenue': total_revenue,
                'total_expenses': total_expenses,
                'profit': profit,
                'profit_margin': (profit / total_revenue * 100) if total_revenue > 0 else 0
            },
            'recent_activities': ActivitySerializer(recent_activities, many=True).data,
            'locations': LocationSerializer(locations, many=True).data
        }
        
        return Response(dashboard_data)
        
    except Entrepreneur.DoesNotExist:
        return Response(
            {'error': 'Entrepreneur non trouvé.'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def entrepreneur_search(request):
    """Recherche avancée d'entrepreneurs"""
    
    # Paramètres de recherche
    query = request.GET.get('q', '')
    sector = request.GET.get('sector', '')
    region = request.GET.get('region', '')
    min_revenue = request.GET.get('min_revenue', '')
    max_revenue = request.GET.get('max_revenue', '')
    
    queryset = Entrepreneur.objects.select_related('user').prefetch_related('locations', 'activities')
    
    # Filtres de base selon les permissions
    if request.user.is_entrepreneur:
        return Response(
            {'error': 'Vous ne pouvez pas rechercher d\'autres entrepreneurs.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Recherche par texte
    if query:
        queryset = queryset.filter(
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query) |
            Q(user__phone__icontains=query) |
            Q(cni_number__icontains=query)
        )
    
    # Filtre par secteur
    if sector:
        queryset = queryset.filter(activities__sector=sector).distinct()
    
    # Filtre par région
    if region:
        queryset = queryset.filter(locations__region__icontains=region).distinct()
    
    # Filtre par revenu
    if min_revenue:
        queryset = queryset.filter(activities__total_revenue__gte=min_revenue).distinct()
    
    if max_revenue:
        queryset = queryset.filter(activities__total_revenue__lte=max_revenue).distinct()
    
    # Pagination
    page = self.paginate_queryset(queryset)
    if page is not None:
        serializer = EntrepreneurSummarySerializer(page, many=True)
        return self.get_paginated_response(serializer.data)
    
    serializer = EntrepreneurSummarySerializer(queryset, many=True)
    return Response(serializer.data)
