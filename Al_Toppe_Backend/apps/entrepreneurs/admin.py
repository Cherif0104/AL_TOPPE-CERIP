from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.translation import gettext_lazy as _
from .models import Entrepreneur, Location, Activity


@admin.register(Entrepreneur)
class EntrepreneurAdmin(admin.ModelAdmin):
    """Interface d'administration pour les entrepreneurs"""
    
    list_display = ['full_name', 'phone', 'cni_number', 'region', 'activities_count', 'status', 'created_at']
    list_filter = ['civility', 'created_at', 'user__is_active']
    search_fields = ['first_name', 'last_name', 'cni_number', 'user__phone']
    readonly_fields = ['created_at', 'updated_at', 'activities_count', 'total_revenue']
    
    fieldsets = (
        (_('Informations personnelles'), {
            'fields': ('user', 'first_name', 'last_name', 'civility', 'cni_number', 'birth_date')
        }),
        (_('Coordonnées'), {
            'fields': ('address', 'whatsapp')
        }),
        (_('Informations système'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def phone(self, obj):
        """Afficher le numéro de téléphone de l'utilisateur"""
        return obj.user.phone
    phone.short_description = _('Téléphone')
    
    def region(self, obj):
        """Afficher la région principale de l'entrepreneur"""
        primary_location = obj.locations.filter(is_primary=True).first()
        return primary_location.region if primary_location else '-'
    region.short_description = _('Région')
    
    def activities_count(self, obj):
        """Afficher le nombre d'activités"""
        count = obj.get_activities_count()
        if count > 0:
            url = reverse('admin:entrepreneurs_activity_changelist') + f'?entrepreneur__id__exact={obj.id}'
            return format_html('<a href="{}">{} activité(s)</a>', url, count)
        return '0 activité'
    activities_count.short_description = _('Activités')
    
    def total_revenue(self, obj):
        """Afficher le revenu total"""
        revenue = obj.get_total_revenue()
        if revenue > 0:
            return f"{revenue:,.0f} FCFA"
        return '0 FCFA'
    total_revenue.short_description = _('Revenu total')
    
    def status(self, obj):
        """Afficher le statut de l'entrepreneur"""
        if obj.user.is_active:
            return format_html('<span style="color: green;">●</span> Actif')
        else:
            return format_html('<span style="color: red;">●</span> Inactif')
    status.short_description = _('Statut')
    
    actions = ['activate_entrepreneurs', 'deactivate_entrepreneurs']
    
    def activate_entrepreneurs(self, request, queryset):
        """Activer les entrepreneurs sélectionnés"""
        updated = queryset.update(user__is_active=True)
        self.message_user(request, f'{updated} entrepreneur(s) activé(s) avec succès.')
    activate_entrepreneurs.short_description = _('Activer les entrepreneurs sélectionnés')
    
    def deactivate_entrepreneurs(self, request, queryset):
        """Désactiver les entrepreneurs sélectionnés"""
        updated = queryset.update(user__is_active=False)
        self.message_user(request, f'{updated} entrepreneur(s) désactivé(s) avec succès.')
    deactivate_entrepreneurs.short_description = _('Désactiver les entrepreneurs sélectionnés')


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    """Interface d'administration pour les localisations"""
    
    list_display = ['entrepreneur', 'address', 'city', 'region', 'is_primary', 'coordinates', 'created_at']
    list_filter = ['region', 'city', 'is_primary', 'created_at']
    search_fields = ['entrepreneur__first_name', 'entrepreneur__last_name', 'address', 'city', 'region']
    readonly_fields = ['created_at']
    
    fieldsets = (
        (_('Entrepreneur'), {
            'fields': ('entrepreneur',)
        }),
        (_('Adresse'), {
            'fields': ('address', 'region', 'city')
        }),
        (_('Géolocalisation'), {
            'fields': ('lat', 'lng'),
            'classes': ('collapse',)
        }),
        (_('Statut'), {
            'fields': ('is_primary',)
        }),
        (_('Informations système'), {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    def coordinates(self, obj):
        """Afficher les coordonnées géographiques"""
        if obj.lat and obj.lng:
            return f"{obj.lat}, {obj.lng}"
        return '-'
    coordinates.short_description = _('Coordonnées')


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    """Interface d'administration pour les activités"""
    
    list_display = ['title', 'entrepreneur', 'sector', 'legal_form', 'status', 'age_days', 'revenue', 'created_at']
    list_filter = ['sector', 'legal_form', 'status', 'creation_date', 'created_at']
    search_fields = ['title', 'entrepreneur__first_name', 'entrepreneur__last_name']
    readonly_fields = ['created_at', 'updated_at', 'age_days', 'revenue', 'expenses', 'profit']
    
    fieldsets = (
        (_('Informations de base'), {
            'fields': ('entrepreneur', 'title', 'sector', 'description')
        }),
        (_('Localisation'), {
            'fields': ('location',)
        }),
        (_('Informations légales'), {
            'fields': ('creation_date', 'legal_form', 'tax_regime')
        }),
        (_('Statut'), {
            'fields': ('status',)
        }),
        (_('Informations système'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def age_days(self, obj):
        """Afficher l'âge de l'activité en jours"""
        return f"{obj.age_in_days} jours"
    age_days.short_description = _('Âge')
    
    def revenue(self, obj):
        """Afficher le revenu total"""
        revenue = obj.get_total_revenue()
        if revenue > 0:
            return f"{revenue:,.0f} FCFA"
        return '0 FCFA'
    revenue.short_description = _('Revenus')
    
    def expenses(self, obj):
        """Afficher le total des dépenses"""
        expenses = obj.get_total_expenses()
        if expenses > 0:
            return f"{expenses:,.0f} FCFA"
        return '0 FCFA'
    expenses.short_description = _('Dépenses')
    
    def profit(self, obj):
        """Afficher le bénéfice"""
        profit = obj.get_profit()
        if profit > 0:
            return format_html('<span style="color: green;">+{:,} FCFA</span>', profit)
        elif profit < 0:
            return format_html('<span style="color: red;">{:,} FCFA</span>', profit)
        else:
            return '0 FCFA'
    profit.short_description = _('Bénéfice')
    
    actions = ['activate_activities', 'deactivate_activities', 'mark_as_suspended']
    
    def activate_activities(self, request, queryset):
        """Activer les activités sélectionnées"""
        updated = queryset.update(status='active')
        self.message_user(request, f'{updated} activité(s) activée(s) avec succès.')
    activate_activities.short_description = _('Activer les activités sélectionnées')
    
    def deactivate_activities(self, request, queryset):
        """Désactiver les activités sélectionnées"""
        updated = queryset.update(status='inactive')
        self.message_user(request, f'{updated} activité(s) désactivée(s) avec succès.')
    deactivate_activities.short_description = _('Désactiver les activités sélectionnées')
    
    def mark_as_suspended(self, request, queryset):
        """Marquer les activités comme suspendues"""
        updated = queryset.update(status='suspended')
        self.message_user(request, f'{updated} activité(s) marquée(s) comme suspendue(s).')
    mark_as_suspended.short_description = _('Marquer comme suspendues')
