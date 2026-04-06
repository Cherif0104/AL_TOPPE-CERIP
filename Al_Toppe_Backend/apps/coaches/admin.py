from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.translation import gettext_lazy as _
from .models import Coach, CoachAssignment, CoachingSession


@admin.register(Coach)
class CoachAdmin(admin.ModelAdmin):
    list_display = (
        'user_phone', 'organization', 'specialization', 'is_certified',
        'is_active', 'max_entrepreneurs', 'current_entrepreneurs_count',
        'available_slots', 'success_rate', 'average_rating', 'created_at',
    )
    list_filter = (
        'specialization', 'is_certified', 'is_active', 'created_at',
    )
    search_fields = (
        'user__phone', 'organization',
    )
    readonly_fields = (
        'created_at', 'updated_at', 'current_entrepreneurs_count',
        'available_slots', 'get_total_sessions', 'get_completed_sessions',
    )

    fieldsets = (
        (_('Utilisateur'), {'fields': ('user',)}),
        (_('Informations professionnelles'), {
            'fields': (
                'organization', 'specialization', 'years_experience',
                'is_certified', 'is_active', 'max_entrepreneurs',
            )
        }),
        (_('Profil'), {
            'fields': ('bio', 'skills', 'certifications')
        }),
        (_('Contact & disponibilité'), {
            'fields': ('preferred_contact_method', 'availability_schedule')
        }),
        (_('Performance'), {
            'fields': ('success_rate', 'average_rating', 'get_total_sessions', 'get_completed_sessions')
        }),
        (_('Informations système'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def user_phone(self, obj):
        return obj.user.phone
    user_phone.short_description = _('Téléphone')


@admin.register(CoachAssignment)
class CoachAssignmentAdmin(admin.ModelAdmin):
    list_display = (
        'coach_link', 'entrepreneur_link', 'status', 'start_date', 'end_date',
        'duration_days', 'created_at',
    )
    list_filter = (
        'status', 'start_date', 'created_at',
    )
    search_fields = (
        'coach__user__phone', 'entrepreneur__first_name', 'entrepreneur__last_name',
    )
    readonly_fields = ('created_at', 'updated_at', 'duration_days')

    fieldsets = (
        (_('Assignation'), {'fields': ('coach', 'entrepreneur', 'status', 'start_date', 'end_date')}),
        (_('Objectifs & suivi'), {'fields': ('objectives', 'progress_notes')}),
        (_('Évaluations'), {'fields': ('initial_assessment', 'final_assessment')}),
        (_('Informations système'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def coach_link(self, obj):
        url = reverse('admin:coaches_coach_change', args=[obj.coach.id])
        return format_html('<a href="{}">{}</a>', url, obj.coach.user.phone)
    coach_link.short_description = _('Coach')

    def entrepreneur_link(self, obj):
        url = reverse('admin:entrepreneurs_entrepreneur_change', args=[obj.entrepreneur.id])
        return format_html('<a href="{}">{}</a>', url, obj.entrepreneur.full_name)
    entrepreneur_link.short_description = _('Entrepreneur')


@admin.register(CoachingSession)
class CoachingSessionAdmin(admin.ModelAdmin):
    list_display = (
        'assignment_link', 'session_type', 'status', 'scheduled_date',
        'duration_minutes', 'coach_rating', 'entrepreneur_rating', 'created_at',
    )
    list_filter = (
        'session_type', 'status', 'scheduled_date', 'created_at',
    )
    search_fields = (
        'assignment__coach__user__phone', 'assignment__entrepreneur__first_name',
        'assignment__entrepreneur__last_name', 'agenda', 'notes',
    )
    readonly_fields = (
        'created_at', 'updated_at', 'coach', 'entrepreneur', 'actual_duration_minutes',
    )

    fieldsets = (
        (_('Assignation'), {'fields': ('assignment', 'coach', 'entrepreneur')}),
        (_('Planification'), {'fields': ('session_type', 'status', 'scheduled_date', 'duration_minutes')}),
        (_('Réalisation'), {'fields': ('actual_start_time', 'actual_end_time', 'actual_duration_minutes')}),
        (_('Contenu & suivi'), {'fields': ('agenda', 'notes', 'action_items')}),
        (_('Évaluations'), {'fields': ('entrepreneur_rating', 'coach_rating', 'feedback')}),
        (_('Informations système'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def assignment_link(self, obj):
        url = reverse('admin:coaches_coachassignment_change', args=[obj.assignment.id])
        return format_html('<a href="{}">{}</a>', url, obj.assignment)
    assignment_link.short_description = _('Assignation')

    def coach(self, obj):
        return obj.coach
    coach.short_description = _('Coach')

    def entrepreneur(self, obj):
        return obj.entrepreneur
    entrepreneur.short_description = _('Entrepreneur')

