from rest_framework.permissions import BasePermission


class IsEntrepreneur(BasePermission):
    def has_permission(self, request, view):
        return bool(
            getattr(request.user, 'is_authenticated', False)
            and getattr(request.user, 'role', None) == 'entrepreneur'
            and hasattr(request.user, 'entrepreneur')
        )

class IsCoach(BasePermission):
    def has_permission(self, request, view):
        return bool(
            getattr(request.user, 'is_authenticated', False)
            and getattr(request.user, 'role', None) == 'coach'
            and hasattr(request.user, 'coach')
        )

class IsBailleur(BasePermission):
    def has_permission(self, request, view):
        return bool(
            getattr(request.user, 'is_authenticated', False)
            and getattr(request.user, 'role', None) == 'bailleur'
            and hasattr(request.user, 'bailleur')
        )

class HasCoachAccess(BasePermission):
    def has_object_permission(self, request, view, obj):
        if hasattr(request.user, 'coach'):
            return obj.coach_relations.filter(
                coach=request.user.coach,
                status='active'
            ).exists()
        return False