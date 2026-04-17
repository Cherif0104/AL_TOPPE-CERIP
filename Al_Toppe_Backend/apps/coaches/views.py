from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Avg, Count, Q
from apps.entrepreneurs.serializers import EntrepreneurSerializer

from .models import Coach, CoachAssignment, CoachingSession
from .serializers import (
    CoachSerializer,
    CoachAssignmentSerializer, CoachAssignmentCreateSerializer,
    CoachingSessionSerializer, CoachingSessionCreateSerializer,
    CoachPerformanceSerializer, SessionActionSerializer, CoachCreateSerializer, EntrepreneursCoachSerializer
)

class CoachViewSet(viewsets.ModelViewSet):
    """ViewSet pour les coaches"""
    queryset = Coach.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CoachSerializer

    def get_serializer_class(self):
        if self.action == 'create':
            return CoachCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return CoachSerializer
        return CoachSerializer

    def get_queryset(self):
        """Filtre les coaches par spécialisation et disponibilité"""
        queryset = Coach.objects.select_related('user')
        specialization = self.request.query_params.get('specialization')
        if specialization:
            queryset = queryset.filter(specialization=specialization)
        available = self.request.query_params.get('available')
        if available == 'true':
            queryset = queryset.filter(is_active=True)
        certified = self.request.query_params.get('certified')
        if certified == 'true':
            queryset = queryset.filter(is_certified=True)
        return queryset.order_by('-created_at')

    def create(self, request, *args, **kwargs):
        """
        Gère la création de Coach. Si les champs de création d'utilisateur sont dans la requête,
        on crée d'abord l'utilisateur (User), puis le coach (Coach) en liant l'utilisateur créé.
        
        Corrige le problème 'user: Ce champ est obligatoire.' ou le problème "n'est pas un UUID valide." 
        en créant effectivement l'utilisateur si l'API reçoit phone/email/password/password_confirm.
        """
        data = request.data.copy()
        # Si pas de champ 'user', tenter de créer l'utilisateur
        user_id = data.get('user', None)
        # Cas où on reçoit un dictionnaire au lieu d'un UUID dans 'user', à cause du front mal mappé
        # Ou cas où le front n'envoie pas de champ 'user'
        if not user_id or isinstance(user_id, dict):
            phone = data.get('phone')
            email = data.get('email', '')
            password = data.get('password')
            password_confirm = data.get('password_confirm')
            from apps.accounts.models import User
            import uuid

            errors = {}
            # Validation minimale
            if not phone:
                errors['phone'] = ['Le numéro de téléphone est obligatoire.']
            if not password:
                errors['password'] = ['Le mot de passe est obligatoire.']
            if not password_confirm:
                errors['password_confirm'] = ['La confirmation du mot de passe est obligatoire.']
            if password and password_confirm and password != password_confirm:
                errors['password_confirm'] = ['Les mots de passe ne correspondent pas.']
            if User.objects.filter(phone=phone).exists():
                errors['phone'] = ['Ce numéro de téléphone est déjà utilisé.']
            if email and User.objects.filter(email=email).exists():
                errors['email'] = ['Cet email est déjà utilisé.']
            if errors:
                return Response(errors, status=status.HTTP_400_BAD_REQUEST)
            # Création du user
            user = User.objects.create_user(
                phone=phone,
                email=email or None,
                password=password,
                role='coach'
            )
            data['user'] = str(user.id)
            # Nettoyage des champs non attendus dans Coach
            data.pop('phone', None)
            data.pop('email', None)
            data.pop('password', None)
            data.pop('password_confirm', None)

        serializer = self.get_serializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        coach = serializer.save()
        print("Coach created successfully", coach)
        return coach

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        self.perform_update(serializer)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def perform_update(self, serializer):
        coach = serializer.save()
        print("Coach updated successfully", coach)
        return coach


    @action(detail=True, methods=['get'])
    def performance(self, request, pk=None):
        """Récupère les données de performance d'un coach avec optimisations"""
        coach = self.get_object()
        
        # Utiliser prefetch pour optimiser les requêtes
        
        # Calculer les métriques avec annotations pour réduire les requêtes
        total_entrepreneurs = coach.assignments.count()
        active_assignments = coach.assignments.filter(status='active').count()
        
        # Optimiser les requêtes de sessions
        sessions_stats = coach.sessions.aggregate(
            total=Count('id'),
            completed=Count('id', filter=Q(status='completed')),
            high_ratings=Count('id', filter=Q(entrepreneur_rating__gte=4)),
            avg_rating=Avg('entrepreneur_rating')
        )
        
        total_sessions = sessions_stats['total'] or 0
        completed_sessions = sessions_stats['completed'] or 0
        average_rating = float(sessions_stats['avg_rating'] or 0)
        
        # Calculer le taux de réussite
        success_rate = 0.0
        if total_sessions > 0:
            success_rate = round((completed_sessions / total_sessions) * 100, 2)
        
        # Calculer le score de satisfaction
        satisfaction_score = 0.0
        if total_sessions > 0:
            high_ratings = sessions_stats['high_ratings'] or 0
            satisfaction_score = round((high_ratings / total_sessions) * 100, 2)
        
        # Informations supplémentaires
        data = {
            'coach_id': str(coach.id),
            'coach_name': coach.__str__(),
            'specialization': coach.get_specialization_display(),
            'total_entrepreneurs': total_entrepreneurs,
            'active_assignments': active_assignments,
            'available_slots': coach.available_slots,
            'total_sessions': total_sessions,
            'completed_sessions': completed_sessions,
            'success_rate': success_rate,
            'average_rating': average_rating,
            'satisfaction_score': satisfaction_score,
            'is_certified': coach.is_certified,
            'is_active': coach.is_active,
        }
        
        serializer = CoachPerformanceSerializer(data)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def entrepreneurs(self, request, pk=None):
        """
        Récupère la liste des entrepreneurs associés à un coach spécifique
        via la table d'association CoachAssignment.
        """
        coach = self.get_object()  # Récupère le coach depuis l'URL /coaches/<id>/
        
        # Récupérer les entrepreneurs liés à ce coach
        assignments = CoachAssignment.objects.filter(
            coach=coach,
            status='active'
        ).select_related('entrepreneur')
        entrepreneurs = [a.entrepreneur for a in assignments if a.entrepreneur]

        # Sérialiser les entrepreneurs
        serializer = EntrepreneurSerializer(entrepreneurs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
        
        
        # return Response(entrepreneurs_data)@action(detail=True, methods=['get'])
    # def entrepreneurs(self, request, pk=None):
    #     """Récupère la liste des entrepreneurs d'un coach"""
    #     coach = self.get_object()
    #     assignments = coach.assignments.filter(status='active').select_related(
    #         'entrepreneur', 'entrepreneur__user'
    #     ).prefetch_related('entrepreneur__activities')
        
    #     entrepreneurs_data = []
    #     for assignment in assignments:
    #         # Récupérer les activités de l'entrepreneur
    #         activities = [
    #             {
    #                 'id': str(activity.id),
    #                 'title': activity.title,
    #                 'sector': activity.get_sector_display(),
    #                 'status': activity.status
    #             }
    #             for activity in assignment.entrepreneur.activities.all()
    #         ]
            
    #         # Compter le nombre de sessions
    #         sessions_count = assignment.sessions.count()
    #         completed_sessions = assignment.sessions.filter(status='completed').count()
            
    #         entrepreneurs_data.append({
    #             'id': str(assignment.entrepreneur.id),
    #             'name': assignment.entrepreneur.full_name,
    #             'phone': assignment.entrepreneur.user.phone,
    #             'activities': activities,
    #             'activities_count': len(activities),
    #             'assignment_id': str(assignment.id),
    #             'start_date': assignment.start_date,
    #             'duration_days': assignment.duration_days,
    #             'objectives': assignment.objectives if assignment.objectives else [],
    #             'progress_notes': assignment.progress_notes,
    #             'sessions_count': sessions_count,
    #             'completed_sessions': completed_sessions,
    #             'last_session_date': assignment.sessions.order_by('-scheduled_date').first().scheduled_date if assignment.sessions.exists() else None
    #         })
        
    #     return Response(entrepreneurs_data)
    


class CoachAssignmentViewSet(viewsets.ModelViewSet):
    """ViewSet pour les assignations de coaches"""
    
    queryset = CoachAssignment.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CoachAssignmentCreateSerializer
        return CoachAssignmentSerializer
    
    def get_queryset(self):
        """Filtre les assignations par coach et entrepreneur"""
        queryset = CoachAssignment.objects.select_related('coach', 'entrepreneur')
        
        # Filtre par coach
        coach_id = self.request.query_params.get('coach_id')
        if coach_id:
            queryset = queryset.filter(coach_id=coach_id)
        
        # Filtre par entrepreneur
        entrepreneur_id = self.request.query_params.get('entrepreneur_id')
        if entrepreneur_id:
            queryset = queryset.filter(entrepreneur_id=entrepreneur_id)
        
        # Filtre par statut
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset.order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Termine une assignation"""
        assignment = self.get_object()
        
        if assignment.complete_assignment():
            serializer = self.get_serializer(assignment)
            return Response({
                'message': 'Assignation terminée avec succès',
                'assignment': serializer.data
            })
        else:
            return Response({
                'error': 'Impossible de terminer l\'assignation'
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def bulk_assign(self, request):
        """Assigner un coach à plusieurs entrepreneurs en une seule fois"""
        from apps.entrepreneurs.models import Entrepreneur
        from django.utils import timezone
        from datetime import datetime
        
        role = getattr(request.user, 'role', '') or ''
        is_platform_admin = (
            getattr(request.user, 'is_superuser', False)
            or getattr(request.user, 'is_staff', False)
            or role in ('admin', 'administrateur')
        )
        if not is_platform_admin:
            return Response({
                'error': 'Seuls les administrateurs peuvent effectuer des assignations en masse'
            }, status=status.HTTP_403_FORBIDDEN)
        
        coach_id = request.data.get('coach')
        entrepreneur_ids = request.data.get('entrepreneurs', [])
        start_date_str = request.data.get('start_date')
        objectives = request.data.get('objectives', ["Assignation en masse par administrateur"])
        
        if not coach_id:
            return Response({
                'error': 'Le champ coach est requis'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not entrepreneur_ids or not isinstance(entrepreneur_ids, list):
            return Response({
                'error': 'Le champ entrepreneurs doit être une liste d\'IDs'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Parser la date de début
        if start_date_str:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            except (ValueError, TypeError):
                start_date = timezone.now().date()
        else:
            start_date = timezone.now().date()
        
        try:
            coach = Coach.objects.get(id=coach_id)
        except Coach.DoesNotExist:
            return Response({
                'error': f'Coach avec l\'ID {coach_id} non trouvé'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Vérifier que le coach a assez de places disponibles
        if coach.max_entrepreneurs > 0:
            current_count = CoachAssignment.objects.filter(coach=coach, status='active').count()
            if current_count + len(entrepreneur_ids) > coach.max_entrepreneurs:
                return Response({
                    'error': f'Le coach n\'a que {coach.max_entrepreneurs - current_count} place(s) disponible(s). Vous essayez d\'assigner {len(entrepreneur_ids)} entrepreneurs.'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        created = []
        skipped = []
        errors = []
        
        for entrepreneur_id in entrepreneur_ids:
            try:
                entrepreneur = Entrepreneur.objects.get(id=entrepreneur_id)
                
                # Vérifier si l'entrepreneur n'est pas déjà assigné à un coach actif
                existing = CoachAssignment.objects.filter(
                    entrepreneur=entrepreneur,
                    status='active'
                ).first()
                
                if existing:
                    skipped.append({
                        'entrepreneur_id': str(entrepreneur.id),
                        'entrepreneur_name': entrepreneur.full_name,
                        'reason': f'Déjà assigné au coach {existing.coach.id}'
                    })
                    continue
                
                # Créer l'assignation
                assignment = CoachAssignment.objects.create(
                    coach=coach,
                    entrepreneur=entrepreneur,
                    status='active',
                    start_date=start_date,
                    objectives=objectives if isinstance(objectives, list) else [objectives]
                )
                
                created.append({
                    'assignment_id': str(assignment.id),
                    'entrepreneur_id': str(entrepreneur.id),
                    'entrepreneur_name': entrepreneur.full_name
                })
                
            except Entrepreneur.DoesNotExist:
                errors.append({
                    'entrepreneur_id': str(entrepreneur_id),
                    'reason': 'Entrepreneur non trouvé'
                })
            except Exception as e:
                errors.append({
                    'entrepreneur_id': str(entrepreneur_id),
                    'reason': str(e)
                })
        
        return Response({
            'message': f'{len(created)} assignation(s) créée(s) avec succès',
            'created': created,
            'skipped': skipped,
            'errors': errors,
            'summary': {
                'total_requested': len(entrepreneur_ids),
                'created': len(created),
                'skipped': len(skipped),
                'errors': len(errors)
            }
        }, status=status.HTTP_201_CREATED if created else status.HTTP_400_BAD_REQUEST)

class CoachingSessionViewSet(viewsets.ModelViewSet):
    """ViewSet pour les sessions de coaching"""

    queryset = CoachingSession.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return CoachingSessionCreateSerializer
        
        return CoachingSessionSerializer

    def get_queryset(self):
        """Filtre les sessions par assignation et statut"""
        queryset = CoachingSession.objects.select_related('assignment', 'assignment__coach', 'assignment__entrepreneur')

        # Filtre par assignation
        assignment_id = self.request.query_params.get('assignment_id')
        if assignment_id:
            queryset = queryset.filter(assignment_id=assignment_id)

        # Filtre par coach
        coach_id = self.request.query_params.get('coach_id')
        if coach_id:
            queryset = queryset.filter(assignment__coach_id=coach_id)

        # Filtre par entrepreneur
        entrepreneur_id = self.request.query_params.get('entrepreneur_id')
        if entrepreneur_id:
            queryset = queryset.filter(assignment__entrepreneur_id=entrepreneur_id)

        # Filtre par statut
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filtre par date
        date_from = self.request.query_params.get('date_from')
        if date_from:
            queryset = queryset.filter(scheduled_date__gte=date_from)

        date_to = self.request.query_params.get('date_to')
        if date_to:
            queryset = queryset.filter(scheduled_date__lte=date_to)

        return queryset.order_by('scheduled_date')
    
    def perform_create(self, serializer):
        """Créer une session et notifier les participants"""
        session = serializer.save()
        
        # Notifier le coach et l'entrepreneur
        try:
            from .notifications import notify_session_created
            notify_session_created(session)
        except Exception as e:
            import logging
            logging.warning(f"⚠️ Erreur notification session créée: {e}")



    # Actions pour les sessions de coaching

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """Vue pour démarrer une session"""
        session = self.get_object()
        if session.start_session():
            serializer = self.get_serializer(session)
            return Response({
                'message': 'Session démarrée avec succès',
                'session': serializer.data
            })
        return Response(
            {'error': 'Impossible de démarrer la session'},
            status=status.HTTP_400_BAD_REQUEST
        )

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Vue pour terminer une session"""
        session = self.get_object()

        # Récupérer les données de la requête
        notes = request.data.get('notes', '')
        action_items = request.data.get('action_items', [])
        entrepreneur_rating = request.data.get('entrepreneur_rating')

        if session.complete_session(notes, action_items, entrepreneur_rating):
            serializer = self.get_serializer(session)
            return Response({
                'message': 'Session terminée avec succès',
                'session': serializer.data
            })
        return Response(
            {'error': 'Impossible de terminer la session'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Vue pour annuler une session"""
        session = self.get_object()
        
        if session.status == 'cancelled':
            return Response(
                {'error': 'La session est déjà annulée'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if session.status == 'completed':
            return Response(
                {'error': 'Impossible d\'annuler une session terminée'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        session.status = 'cancelled'
        session.save()
        
        serializer = self.get_serializer(session)
        return Response({
            'message': 'Session annulée avec succès',
            'session': serializer.data
        })
        
    @action(detail=True, methods=['post'])
    def evaluation_completed_by_entrepreneur(self, request, pk=None):
        """Vue pour terminer une session"""
        session = self.get_object()

        # Récupérer les données de la requête
        feedback = request.data.get('feedback', '')
        coach_rating = request.data.get('coach_rating')
        if session.evaluation_completed(coach_rating):
            serializer = self.get_serializer(session)
            return Response({
                'message': 'Évaluation terminée avec succès',
                'session': serializer.data
            })
        return Response(
            {'error': 'Impossible de terminer la session'},
            status=status.HTTP_400_BAD_REQUEST
        )