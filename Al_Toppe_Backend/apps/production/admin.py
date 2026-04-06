from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.translation import gettext_lazy as _
from .models import ProductionCycle, ProductionTask


@admin.register(ProductionCycle)
class ProductionCycleAdmin(admin.ModelAdmin):
    list_display = (
        'title', 'activity', 'status', 'start_date', 'expected_end_date', 'actual_end_date',
        'duration_days', 'target_quantity', 'actual_quantity', 'progress_percentage', 'completion_rate',
    )
    list_filter = (
        'status', 'start_date', 'expected_end_date', 'created_at',
    )
    search_fields = (
        'title', 'activity__title', 'activity__entrepreneur__first_name', 'activity__entrepreneur__last_name',
    )
    readonly_fields = (
        'created_at', 'updated_at', 'progress_percentage', 'completion_rate', 'get_total_tasks', 'get_completed_tasks',
    )

    fieldsets = (
        (_('Activité'), {'fields': ('activity',)}),
        (_('Informations'), {'fields': ('title', 'duration_days', 'status')}),
        (_('Dates'), {'fields': ('start_date', 'expected_end_date', 'actual_end_date')}),
        (_('Quantités'), {'fields': ('target_quantity', 'actual_quantity')}),
        (_('Suivi'), {'fields': ('get_total_tasks', 'get_completed_tasks', 'progress_percentage', 'completion_rate')}),
        (_('Timestamps'), {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )

    def duration_days(self, obj):
        if obj.actual_end_date and obj.start_date:
            return (obj.actual_end_date - obj.start_date).days
        return '-'
    duration_days.short_description = _('Durée (jours)')


@admin.register(ProductionTask)
class ProductionTaskAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'production_cycle_link', 'sequence_order', 'status',
        'planned_start_date', 'planned_end_date', 'actual_start_date', 'actual_end_date',
        'is_delayed', 'can_start',
    )
    list_filter = (
        'status', 'planned_start_date', 'planned_end_date', 'created_at',
    )
    search_fields = (
        'name', 'production_cycle__title',
    )
    readonly_fields = (
        'created_at', 'updated_at', 'is_delayed', 'can_start', 'get_dependent_tasks', 'get_blocking_tasks',
    )

    fieldsets = (
        (_('Cycle'), {'fields': ('production_cycle',)}),
        (_('Informations'), {'fields': ('name', 'sequence_order', 'status')}),
        (_('Dépendances'), {'fields': ('depends_on', 'get_blocking_tasks', 'get_dependent_tasks')}),
        (_('Dates prévues'), {'fields': ('planned_start_date', 'planned_end_date')}),
        (_('Dates réelles'), {'fields': ('actual_start_date', 'actual_end_date', 'actual_duration_days')}),
        (_('Contenu'), {'fields': ('description', 'notes')}),
        (_('Timestamps'), {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )

    def production_cycle_link(self, obj):
        url = reverse('admin:production_productioncycle_change', args=[obj.production_cycle.id])
        return format_html('<a href="{}">{}</a>', url, obj.production_cycle.title)
    production_cycle_link.short_description = _('Cycle de production')

