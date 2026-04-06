from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.translation import gettext_lazy as _
from .models import Bailleur, FundingProgram, FundingApplication


@admin.register(Bailleur)
class BailleurAdmin(admin.ModelAdmin):
    list_display = (
        'organization_name', 'organization_type', 'user_phone', 'is_active',
        'funding_capacity', 'total_funding_provided', 'entrepreneurs_supported',
        'active_programs_count', 'success_rate', 'created_at',
    )
    list_filter = (
        'organization_type', 'is_active', 'created_at',
    )
    search_fields = (
        'organization_name', 'contact_person', 'user__phone',
    )
    readonly_fields = (
        'created_at', 'updated_at', 'active_programs_count', 'success_rate',
    )

    fieldsets = (
        (_('Utilisateur'), {'fields': ('user',)}),
        (_('Organisation'), {
            'fields': ('organization_name', 'organization_type', 'website')
        }),
        (_('Contact'), {
            'fields': ('contact_person', 'contact_position')
        }),
        (_('Couverture'), {
            'fields': ('sectors_supported', 'regions_covered')
        }),
        (_('Capacité & métriques'), {
            'fields': (
                'funding_capacity', 'total_funding_provided', 'entrepreneurs_supported',
                'active_programs_count', 'success_rate'
            )
        }),
        (_('Statut & Timestamps'), {
            'fields': ('is_active', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def user_phone(self, obj):
        return obj.user.phone
    user_phone.short_description = _('Téléphone')


@admin.register(FundingProgram)
class FundingProgramAdmin(admin.ModelAdmin):
    list_display = (
        'program_name', 'bailleur_link', 'funding_type', 'status',
        'start_date', 'end_date', 'application_deadline', 'is_active',
        'total_applications', 'approved_applications', 'approval_rate',
        'total_funding_allocated',
    )
    list_filter = (
        'funding_type', 'status', 'start_date', 'created_at',
    )
    search_fields = (
        'program_name', 'bailleur__organization_name',
    )
    readonly_fields = (
        'created_at', 'updated_at', 'is_active', 'approval_rate', 'remaining_budget',
    )

    fieldsets = (
        (_('Bailleur'), {'fields': ('bailleur',)}),
        (_('Informations de base'), {
            'fields': ('program_name', 'description', 'funding_type')
        }),
        (_('Montants'), {
            'fields': ('min_amount', 'max_amount', 'total_funding_allocated', 'remaining_budget')
        }),
        (_('Périodes'), {
            'fields': ('start_date', 'end_date', 'application_deadline')
        }),
        (_('Cibles & critères'), {
            'fields': ('target_sectors', 'target_regions', 'eligibility_criteria', 'required_documents')
        }),
        (_('Statut & métriques'), {
            'fields': ('status', 'total_applications', 'approved_applications', 'approval_rate', 'is_active')
        }),
        (_('Informations système'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def bailleur_link(self, obj):
        url = reverse('admin:bailleurs_bailleur_change', args=[obj.bailleur.id])
        return format_html('<a href="{}">{}</a>', url, obj.bailleur.organization_name)
    bailleur_link.short_description = _('Bailleur')


@admin.register(FundingApplication)
class FundingApplicationAdmin(admin.ModelAdmin):
    list_display = (
        'entrepreneur_link', 'program_link', 'requested_amount', 'status',
        'submitted_at', 'review_date', 'approved_amount', 'is_approved',
    )
    list_filter = (
        'status', 'submitted_at', 'review_date', 'created_at',
    )
    search_fields = (
        'entrepreneur__first_name', 'entrepreneur__last_name', 'program__program_name',
    )
    readonly_fields = (
        'created_at', 'updated_at', 'approval_rate', 'submitted_at', 'review_date',
    )

    fieldsets = (
        (_('Candidature'), {'fields': ('entrepreneur', 'activity', 'program', 'business_plan')}),
        (_('Montants'), {'fields': ('requested_amount', 'approved_amount', 'approval_rate')}),
        (_('Contenu'), {'fields': ('project_description', 'expected_impact', 'implementation_timeline', 'supporting_documents')}),
        (_('Évaluation'), {'fields': ('evaluation_score', 'evaluation_notes')}),
        (_('Statut & dates'), {'fields': ('status', 'submitted_at', 'review_date')}),
        (_('Informations système'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def entrepreneur_link(self, obj):
        url = reverse('admin:entrepreneurs_entrepreneur_change', args=[obj.entrepreneur.id])
        return format_html('<a href="{}">{}</a>', url, obj.entrepreneur.full_name)
    entrepreneur_link.short_description = _('Entrepreneur')

    def program_link(self, obj):
        url = reverse('admin:bailleurs_fundingprogram_change', args=[obj.program.id])
        return format_html('<a href="{}">{}</a>', url, obj.program.program_name)
    program_link.short_description = _('Programme')

