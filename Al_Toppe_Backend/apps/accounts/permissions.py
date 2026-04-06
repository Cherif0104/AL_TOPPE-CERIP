class IsEntrepreneur(BasePermission):
    def has_permission(self, request, view):
        return hasattr(request.user, 'entrepreneur')

class IsCoach(BasePermission):
    def has_permission(self, request, view):
        return hasattr(request.user, 'coach')

class IsBailleur(BasePermission):
    def has_permission(self, request, view):
        return hasattr(request.user, 'bailleur')

class HasCoachAccess(BasePermission):
    def has_object_permission(self, request, view, obj):
        if hasattr(request.user, 'coach'):
            return obj.coach_relations.filter(
                coach=request.user.coach,
                status='active'
            ).exists()
        return False