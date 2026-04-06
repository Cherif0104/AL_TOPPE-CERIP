from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import BusinessPlanTemplate, BusinessPlan, BusinessPlanValidation, BusinessPlanComment


@admin.register(BusinessPlanTemplate)
class BusinessPlanTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'sector', 'version', 'is_active', 'created_at']
    list_filter = ['sector', 'is_active', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Informations de base', {
            'fields': ('name', 'sector', 'description')
        }),
        ('Structure du plan', {
            'fields': ('structure',),
            'description': 'Structure JSON du template'
        }),
        ('Métadonnées', {
            'fields': ('is_active', 'version', 'created_at', 'updated_at')
        }),
    )


@admin.register(BusinessPlan)
class BusinessPlanAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'entrepreneur_link', 'activity_link', 'sector', 
        'status', 'version', 'is_validated', 'created_at'
    ]
    list_filter = [
        'status', 'is_validated', 'created_at', 'updated_at',
        'activity__sector'
    ]
    search_fields = ['title', 'summary', 'entrepreneur__first_name', 'entrepreneur__last_name']
    readonly_fields = [
        'created_at', 'updated_at', 'entrepreneur_name', 'activity_title',
        'sector', 'validation_date'
    ]
    
    fieldsets = (
        ('Informations de base', {
            'fields': ('title', 'entrepreneur', 'activity', 'template', 'summary')
        }),
        ('Contenu du plan', {
            'fields': (
                'market_analysis', 'offer', 'business_model', 
                'financial_projections', 'implementation_plan'
            ),
            'classes': ('collapse',)
        }),
        ('Statut et version', {
            'fields': ('status', 'version')
        }),
        ('Validation', {
            'fields': ('is_validated', 'validation_date', 'validated_by')
        }),
        ('Informations système', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def entrepreneur_link(self, obj):
        if obj.entrepreneur:
            url = reverse('admin:entrepreneurs_entrepreneur_change', args=[obj.entrepreneur.id])
            return format_html('<a href="{}">{}</a>', url, obj.entrepreneur.full_name)
        return '-'
    entrepreneur_link.short_description = 'Entrepreneur'
    
    def activity_link(self, obj):
        if obj.activity:
            url = reverse('admin:entrepreneurs_activity_change', args=[obj.activity.id])
            return format_html('<a href="{}">{}</a>', url, obj.activity.title)
        return '-'
    activity_link.short_description = 'Activité'
    
    def sector(self, obj):
        return obj.sector_display
    sector.short_description = 'Secteur'


@admin.register(BusinessPlanValidation)
class BusinessPlanValidationAdmin(admin.ModelAdmin):
    list_display = [
        'business_plan_title', 'validator_info', 'validation_type', 
        'is_approved', 'score', 'created_at'
    ]
    list_filter = [
        'validation_type', 'is_approved', 'created_at'
    ]
    search_fields = [
        'business_plan__title', 'validator__phone', 'comments'
    ]
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('Plan d\'affaires', {
            'fields': ('business_plan',)
        }),
        ('Validation', {
            'fields': ('validator', 'validation_type', 'is_approved', 'score', 'comments')
        }),
        ('Informations système', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    def business_plan_title(self, obj):
        if obj.business_plan:
            url = reverse('admin:business_plans_businessplan_change', args=[obj.business_plan.id])
            return format_html('<a href="{}">{}</a>', url, obj.business_plan.title)
        return '-'
    business_plan_title.short_description = 'Plan d\'affaires'
    
    def validator_info(self, obj):
        if obj.validator:
            return f"{obj.validator.phone} ({obj.validator.get_role_display()})"
        return '-'
    validator_info.short_description = 'Validateur'


@admin.register(BusinessPlanComment)
class BusinessPlanCommentAdmin(admin.ModelAdmin):
    list_display = [
        'business_plan_title', 'author_info', 'section', 
        'is_internal', 'created_at'
    ]
    list_filter = [
        'is_internal', 'created_at', 'updated_at'
    ]
    search_fields = [
        'business_plan__title', 'author__phone', 'content', 'section'
    ]
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Commentaire', {
            'fields': ('business_plan', 'author', 'content', 'section')
        }),
        ('Métadonnées', {
            'fields': ('is_internal', 'created_at', 'updated_at')
        }),
    )
    
    def business_plan_title(self, obj):
        if obj.business_plan:
            url = reverse('admin:business_plans_businessplan_change', args=[obj.business_plan.id])
            return format_html('<a href="{}">{}</a>', url, obj.business_plan.title)
        return '-'
    business_plan_title.short_description = 'Plan d\'affaires'
    
    def author_info(self, obj):
        if obj.author:
            return f"{obj.author.phone} ({obj.author.get_role_display()})"
        return '-'
    author_info.short_description = 'Auteur'
