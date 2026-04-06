from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.translation import gettext_lazy as _
from django.db.models import Sum, Count
from .models import Category, CashflowEntry, Budget, BudgetItem


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    """Interface d'administration pour les catégories"""
    
    list_display = ['name', 'type', 'is_active', 'total_amount', 'entries_count', 'created_at']
    list_filter = ['type', 'is_active', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at', 'total_amount', 'entries_count']
    
    fieldsets = (
        (_('Informations de base'), {
            'fields': ('name', 'description', 'type')
        }),
        (_('Apparence'), {
            'fields': ('icon', 'color')
        }),
        (_('Statut'), {
            'fields': ('is_active',)
        }),
        (_('Informations système'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def total_amount(self, obj):
        """Afficher le montant total de la catégorie"""
        amount = obj.total_amount
        if amount > 0:
            return f"{amount:,.0f} FCFA"
        return '0 FCFA'
    total_amount.short_description = _('Montant total')
    
    def entries_count(self, obj):
        """Afficher le nombre d'entrées de la catégorie"""
        count = obj.cashflow_entries.count()
        if count > 0:
            url = reverse('admin:finances_cashflowentry_changelist') + f'?category__id__exact={obj.id}'
            return format_html('<a href="{}">{} entrée(s)</a>', url, count)
        return '0 entrée'
    entries_count.short_description = _('Nombre d\'entrées')
    
    actions = ['activate_categories', 'deactivate_categories']
    
    def activate_categories(self, request, queryset):
        """Activer les catégories sélectionnées"""
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} catégorie(s) activée(s) avec succès.')
    activate_categories.short_description = _('Activer les catégories sélectionnées')
    
    def deactivate_categories(self, request, queryset):
        """Désactiver les catégories sélectionnées"""
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated} catégorie(s) désactivée(s) avec succès.')
    deactivate_categories.short_description = _('Désactiver les catégories sélectionnées')


@admin.register(CashflowEntry)
class CashflowEntryAdmin(admin.ModelAdmin):
    """Interface d'administration pour les entrées de trésorerie"""
    
    list_display = ['title', 'entrepreneur', 'activity', 'type', 'amount', 'category', 
                   'date', 'payment_status', 'is_overdue', 'created_at']
    list_filter = ['type', 'payment_status', 'frequency', 'category', 'date', 'created_at']
    search_fields = ['title', 'description', 'entrepreneur__first_name', 'entrepreneur__last_name']
    readonly_fields = ['created_at', 'updated_at', 'is_overdue', 'days_overdue']
    
    fieldsets = (
        (_('Informations de base'), {
            'fields': ('entrepreneur', 'activity', 'title', 'description', 'type', 'amount', 'category')
        }),
        (_('Dates et fréquence'), {
            'fields': ('date', 'due_date', 'frequency')
        }),
        (_('Paiement'), {
            'fields': ('payment_status', 'payment_method', 'reference')
        }),
        (_('Informations système'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def is_overdue(self, obj):
        """Afficher si l'entrée est en retard"""
        if obj.is_overdue:
            return format_html('<span style="color: red;">●</span> En retard ({obj.days_overdue} jours)')
        elif obj.payment_status == 'paid':
            return format_html('<span style="color: green;">●</span> Payé')
        elif obj.payment_status == 'pending':
            return format_html('<span style="color: orange;">●</span> En attente')
        else:
            return format_html('<span style="color: gray;">●</span> {obj.get_payment_status_display()}')
    is_overdue.short_description = _('Statut')
    
    def days_overdue(self, obj):
        """Afficher le nombre de jours de retard"""
        if obj.is_overdue:
            return f"{obj.days_overdue} jours"
        return '-'
    days_overdue.short_description = _('Jours de retard')
    
    actions = ['mark_as_paid', 'mark_as_pending', 'mark_as_overdue']
    
    def mark_as_paid(self, request, queryset):
        """Marquer les entrées comme payées"""
        updated = queryset.update(payment_status='paid')
        self.message_user(request, f'{updated} entrée(s) marquée(s) comme payée(s).')
    mark_as_paid.short_description = _('Marquer comme payées')
    
    def mark_as_pending(self, request, queryset):
        """Marquer les entrées comme en attente"""
        updated = queryset.update(payment_status='pending')
        self.message_user(request, f'{updated} entrée(s) marquée(s) comme en attente.')
    mark_as_pending.short_description = _('Marquer comme en attente')
    
    def mark_as_overdue(self, request, queryset):
        """Marquer les entrées comme en retard"""
        updated = queryset.update(payment_status='overdue')
        self.message_user(request, f'{updated} entrée(s) marquée(s) comme en retard.')
    mark_as_overdue.short_description = _('Marquer comme en retard')


@admin.register(Budget)
class BudgetAdmin(admin.ModelAdmin):
    """Interface d'administration pour les budgets"""
    
    list_display = ['name', 'entrepreneur', 'activity', 'period', 'start_date', 'end_date', 
                   'total_income_budget', 'total_expense_budget', 'net_budget', 'status', 
                   'progress_percentage', 'variance_net']
    list_filter = ['period', 'status', 'start_date', 'created_at']
    search_fields = ['name', 'entrepreneur__first_name', 'entrepreneur__last_name']
    readonly_fields = ['created_at', 'updated_at', 'net_budget', 'progress_percentage', 
                      'actual_income', 'actual_expenses', 'actual_net', 'variance_income', 
                      'variance_expenses', 'variance_net']
    
    fieldsets = (
        (_('Informations de base'), {
            'fields': ('entrepreneur', 'activity', 'name', 'description', 'period')
        }),
        (_('Période'), {
            'fields': ('start_date', 'end_date')
        }),
        (_('Montants budgétés'), {
            'fields': ('total_income_budget', 'total_expense_budget')
        }),
        (_('Statut'), {
            'fields': ('status',)
        }),
        (_('Résultats réels'), {
            'fields': ('actual_income', 'actual_expenses', 'actual_net'),
            'classes': ('collapse',)
        }),
        (_('Écarts'), {
            'fields': ('variance_income', 'variance_expenses', 'variance_net'),
            'classes': ('collapse',)
        }),
        (_('Informations système'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def net_budget(self, obj):
        """Afficher le budget net"""
        amount = obj.net_budget
        if amount > 0:
            return  format_html('<span style="color: green;">{} FCFA</span>', "{:,.0f}".format(amount))
        elif amount < 0:
            return format_html('<span style="color: red;">{} FCFA</span>', "{:,.0f}".format(amount))
        else:
            return '0 FCFA'
    net_budget.short_description = _('Budget net')
    
    def progress_percentage(self, obj):
        """Afficher le pourcentage de progression"""
        progress = obj.progress_percentage
        if progress >= 100:
            color = 'green'
        elif progress >= 75:
            color = 'orange'
        elif progress >= 50:
            color = 'blue'
        else:
            color = 'gray'
        
        return format_html('<span style="color: {};">{}%</span>', color, progress)
    progress_percentage.short_description = _('Progression')
    
    def variance_net(self, obj):
        """Afficher l'écart net"""
        variance = obj.variance_net
        if variance > 0:
            return format_html('<span style="color: green;">{} FCFA</span>', "{:,.0f}".format(variance))
        # elif variance < 0:
        #     return format_html('<span style="color: red;">{} FCFA</span>', "{:,.0f}".format(variance))
        else:
            return '0 FCFA'
    variance_net.short_description = _('Écart net')
    
    actions = ['activate_budgets', 'complete_budgets', 'cancel_budgets']
    
    def activate_budgets(self, request, queryset):
        """Activer les budgets sélectionnés"""
        updated = queryset.update(status='active')
        self.message_user(request, f'{updated} budget(s) activé(s) avec succès.')
    activate_budgets.short_description = _('Activer les budgets sélectionnés')
    
    def complete_budgets(self, request, queryset):
        """Marquer les budgets comme terminés"""
        updated = queryset.update(status='completed')
        self.message_user(request, f'{updated} budget(s) marqué(s) comme terminé(s).')
    complete_budgets.short_description = _('Marquer comme terminés')
    
    def cancel_budgets(self, request, queryset):
        """Annuler les budgets sélectionnés"""
        updated = queryset.update(status='cancelled')
        self.message_user(request, f'{updated} budget(s) annulé(s).')
    cancel_budgets.short_description = _('Annuler les budgets')


@admin.register(BudgetItem)
class BudgetItemAdmin(admin.ModelAdmin):
    """Interface d'administration pour les éléments de budget"""
    
    list_display = ['budget', 'category', 'budgeted_amount', 'actual_amount', 'variance', 
                   'variance_percentage', 'created_at']
    list_filter = ['budget__status', 'category__type', 'created_at']
    search_fields = ['budget__name', 'category__name']
    readonly_fields = ['created_at', 'updated_at', 'actual_amount', 'variance', 'variance_percentage']
    
    fieldsets = (
        (_('Informations de base'), {
            'fields': ('budget', 'category', 'budgeted_amount', 'notes')
        }),
        (_('Résultats réels'), {
            'fields': ('actual_amount', 'variance', 'variance_percentage'),
            'classes': ('collapse',)
        }),
        (_('Informations système'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def variance(self, obj):
        """Afficher l'écart"""
        variance = obj.variance
        if variance > 0:
            return format_html('<span style="color: green;">+{} FCFA</span>', "{:,.0f}".format(variance))
        elif variance < 0:
            return format_html('<span style="color: red;">{} FCFA</span>', "{:,.0f}".format(variance))
        else:
            return '0 FCFA'
    variance.short_description = _('Écart')
    
    # # def variance_percentage(self, obj):
    # #     """Afficher le pourcentage d'écart"""
    # #     percentage = obj.variance_percentage
    # #     if percentage > 0:
    # #         return format_html('<span style="color: green;">+{:.1f}%</span>', float(percentage))
    # #     elif percentage < 0:
    # #         return format_html('<span style="color: red;">{:.1f}%</span>', abs(float(percentage)))
    # #     else:
    # #         return '0%'
    # variance_percentage.short_description = _('Écart %')
