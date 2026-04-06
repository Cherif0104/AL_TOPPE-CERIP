from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from .models import User, PhoneVerification


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Interface d'administration pour le modèle User personnalisé"""
    
    list_display = ('phone', 'email', 'role', 'is_active', 'is_staff', 'created_at')
    list_filter = ('role', 'is_active', 'is_staff', 'language', 'created_at')
    search_fields = ('phone', 'email')
    ordering = ('-created_at',)
    
    fieldsets = (
        (None, {'fields': ('phone', 'password')}),
        (_('Informations personnelles'), {'fields': ('email', 'role', 'language')}),
        (_('Permissions'), {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
        }),
        (_('Dates importantes'), {'fields': ('last_login', 'created_at')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('phone', 'email', 'role', 'password1', 'password2'),
        }),
    )
    
    readonly_fields = ('created_at', 'last_login')
    
    def get_queryset(self, request):
        """Optimiser les requêtes avec select_related"""
        return super().get_queryset(request).select_related('entrepreneur', 'coach', 'bailleur')


@admin.register(PhoneVerification)
class PhoneVerificationAdmin(admin.ModelAdmin):
    """Interface d'administration pour la vérification téléphonique"""
    
    list_display = ('phone', 'otp_code', 'is_verified', 'created_at', 'expires_at', 'status')
    list_filter = ('is_verified', 'created_at')
    search_fields = ('phone',)
    ordering = ('-created_at',)
    
    readonly_fields = ('created_at',)
    
    fieldsets = (
        (None, {'fields': ('phone', 'otp_code', 'is_verified')}),
        (_('Dates'), {'fields': ('created_at', 'expires_at')}),
    )
    
    def status(self, obj):
        """Afficher le statut de validité du code OTP"""
        if obj.is_expired():
            return _('Expiré')
        elif obj.is_verified:
            return _('Vérifié')
        else:
            return _('En attente')
    
    status.short_description = _('Statut')
    
    actions = ['mark_as_verified', 'resend_otp']
    
    def mark_as_verified(self, request, queryset):
        """Marquer les codes OTP comme vérifiés"""
        updated = queryset.update(is_verified=True)
        self.message_user(request, f'{updated} code(s) OTP marqué(s) comme vérifié(s).')
    
    mark_as_verified.short_description = _('Marquer comme vérifié')
    
    def resend_otp(self, request, queryset):
        """Renvoyer les codes OTP (simulation)"""
        self.message_user(request, f'Simulation: {queryset.count()} code(s) OTP renvoyé(s).')
    
    resend_otp.short_description = _('Renvoyer OTP')
