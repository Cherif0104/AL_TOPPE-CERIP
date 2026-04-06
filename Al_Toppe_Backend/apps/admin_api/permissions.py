"""Permissions pour l'API d'administration (rôle admin ou compte staff)."""
from rest_framework.permissions import BasePermission


class IsPlatformAdmin(BasePermission):
    """Accès réservé aux administrateurs de la plateforme (staff Django ou rôle admin)."""

    message = "Accès réservé aux administrateurs."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if getattr(user, "is_superuser", False) or getattr(user, "is_staff", False):
            return True
        return getattr(user, "role", None) == "admin"
