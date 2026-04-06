from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.translation import gettext_lazy as _
from .models import Report, ReportTemplate, ReportSchedule, ReportDistribution


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = (
        'title', 'report_type', 'format', 'target_user', 'activity',
        'period_start', 'period_end', 'is_generated', 'generated_at', 'file_size',
    )
    list_filter = (
        'report_type', 'format', 'is_generated', 'period_start', 'created_at',
    )
    search_fields = ('title', 'target_user__phone', 'activity__title')
    readonly_fields = (
        'created_at', 'updated_at', 'generated_at', 'generation_duration', 'file_size',
    )

    fieldsets = (
        (_('Informations'), {'fields': ('title', 'description')}),
        (_('Configuration'), {'fields': ('report_type', 'format')}),
        (_('Cible'), {'fields': ('target_user', 'activity')}),
        (_('Période'), {'fields': ('period_start', 'period_end')}),
        (_('Contenu'), {'fields': ('data', 'template_config')}),
        (_('Statut'), {'fields': ('is_generated', 'file_path', 'file_size', 'generated_at', 'generation_duration')}),
        (_('Timestamps'), {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )


@admin.register(ReportTemplate)
class ReportTemplateAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'category', 'is_system', 'is_active', 'default_format', 'created_at',
    )
    list_filter = (
        'category', 'is_system', 'is_active', 'created_at',
    )
    search_fields = ('name', 'description')
    readonly_fields = ('created_at', 'updated_at')

    fieldsets = (
        (_('Informations'), {'fields': ('name', 'description')}),
        (_('Classification'), {'fields': ('category', 'is_system', 'is_active')}),
        (_('Configuration'), {'fields': ('template_config', 'sections', 'charts_config', 'default_format')}),
        (_('Timestamps'), {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )


@admin.register(ReportSchedule)
class ReportScheduleAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'template_link', 'target_user', 'frequency', 'status',
        'start_date', 'end_date', 'last_generated', 'next_generation', 'total_generated',
    )
    list_filter = (
        'frequency', 'status', 'start_date', 'created_at',
    )
    search_fields = ('name', 'target_user__phone')
    readonly_fields = (
        'created_at', 'updated_at', 'last_generated', 'next_generation', 'success_rate', 'total_generated',
    )

    fieldsets = (
        (_('Informations'), {'fields': ('name', 'description')}),
        (_('Configuration'), {'fields': ('template', 'target_user', 'frequency', 'generation_time', 'auto_send', 'recipients')}),
        (_('Période'), {'fields': ('start_date', 'end_date')}),
        (_('Statut & métriques'), {'fields': ('status', 'last_generated', 'next_generation', 'total_generated', 'success_rate')}),
        (_('Timestamps'), {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )

    def template_link(self, obj):
        url = reverse('admin:reports_reporttemplate_change', args=[obj.template.id])
        return format_html('<a href="{}">{}</a>', url, obj.template.name)
    template_link.short_description = _('Template')


@admin.register(ReportDistribution)
class ReportDistributionAdmin(admin.ModelAdmin):
    list_display = (
        'report_link', 'recipient', 'delivery_method', 'status', 'attempts', 'max_attempts',
        'sent_at', 'delivered_at', 'created_at',
    )
    list_filter = (
        'delivery_method', 'status', 'created_at', 'sent_at', 'delivered_at',
    )
    search_fields = ('report__title', 'recipient__phone')
    readonly_fields = ('created_at', 'updated_at')

    fieldsets = (
        (_('Distribution'), {'fields': ('report', 'recipient', 'delivery_method')}),
        (_('Statut'), {'fields': ('status', 'attempts', 'max_attempts', 'sent_at', 'delivered_at', 'error_message')}),
        (_('Timestamps'), {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )

    def report_link(self, obj):
        url = reverse('admin:reports_report_change', args=[obj.report.id])
        return format_html('<a href="{}">{}</a>', url, obj.report.title)
    report_link.short_description = _('Rapport')

