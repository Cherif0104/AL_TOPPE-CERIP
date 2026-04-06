from rest_framework import serializers
from .models import Category, CashflowEntry, Budget, BudgetItem


class CategorySerializer(serializers.ModelSerializer):
    """Sérialiseur pour les catégories"""
    
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    total_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    entries_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Category
        fields = [
            'id', 'name', 'description', 'type', 'type_display', 'icon', 'color',
            'is_active', 'total_amount', 'entries_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CategoryCreateSerializer(serializers.ModelSerializer):
    """Sérialiseur pour la création de catégories"""
    
    class Meta:
        model = Category
        fields = ['name', 'description', 'type', 'icon', 'color', 'is_active']
    
    def validate_name(self, value):
        """Validation du nom de la catégorie"""
        if Category.objects.filter(name__iexact=value).exists():
            raise serializers.ValidationError("Une catégorie avec ce nom existe déjà.")
        return value


class CashflowEntrySerializer(serializers.ModelSerializer):
    """Sérialiseur pour les entrées de trésorerie"""
    
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    frequency_display = serializers.CharField(source='get_frequency_display', read_only=True)
    payment_status_display = serializers.CharField(source='get_payment_status_display', read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    days_overdue = serializers.IntegerField(read_only=True)
    
    # Relations
    entrepreneur_name = serializers.CharField(source='entrepreneur.full_name', read_only=True)
    activity_title = serializers.CharField(source='activity.title', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    class Meta:
        model = CashflowEntry
        fields = [
            'id', 'entrepreneur', 'entrepreneur_name', 'activity', 'activity_title',
            'title', 'description', 'type', 'type_display', 'amount', 'category', 'category_name',
            'date', 'due_date', 'frequency', 'frequency_display', 'payment_status',
            'payment_status_display', 'payment_method', 'reference', 'is_overdue',
            'days_overdue', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CashflowEntryCreateSerializer(serializers.ModelSerializer):
    """Sérialiseur pour la création d'entrées de trésorerie"""
    
    class Meta:
        model = CashflowEntry
        fields = [
            'entrepreneur', 'activity', 'title', 'description', 'type', 'amount',
            'category', 'date', 'due_date', 'frequency', 'payment_status',
            'payment_method', 'reference'
        ]
    
    def validate(self, attrs):
        """Validation des données"""
        # Vérifier que l'entrepreneur et l'activité correspondent
        entrepreneur = attrs.get('entrepreneur')
        activity = attrs.get('activity')
        
        if entrepreneur and activity and activity.entrepreneur != entrepreneur:
            raise serializers.ValidationError(
                "L'activité doit appartenir à l'entrepreneur sélectionné."
            )
        
        # Vérifier que la date d'échéance est après la date de l'entrée
        date = attrs.get('date')
        due_date = attrs.get('due_date')
        
        if due_date and date and due_date < date:
            raise serializers.ValidationError(
                "La date d'échéance doit être après la date de l'entrée."
            )
        
        return attrs


class CashflowEntryUpdateSerializer(serializers.ModelSerializer):
    """Sérialiseur pour la mise à jour des entrées de trésorerie"""
    
    class Meta:
        model = CashflowEntry
        fields = [
            'title', 'description', 'amount', 'category', 'date', 'due_date',
            'frequency', 'payment_status', 'payment_method', 'reference',
            'invoice_number', 'client_supplier', 'has_invoice'
        ]


class BudgetItemSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les éléments de budget"""
    
    category_name = serializers.CharField(source='category.name', read_only=True)
    actual_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    variance = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    variance_percentage = serializers.FloatField(read_only=True)
    
    class Meta:
        model = BudgetItem
        fields = [
            'id', 'budget', 'category', 'category_name', 'budgeted_amount',
            'actual_amount', 'variance', 'variance_percentage', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class BudgetItemCreateSerializer(serializers.ModelSerializer):
    """Sérialiseur pour la création d'éléments de budget"""
    
    class Meta:
        model = BudgetItem
        fields = ['category', 'budgeted_amount', 'notes']


class BudgetSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les budgets"""
    
    period_display = serializers.CharField(source='get_period_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    net_budget = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    progress_percentage = serializers.FloatField(read_only=True)
    
    # Résultats réels
    actual_income = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    actual_expenses = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    actual_net = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    
    # Écarts
    variance_income = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    variance_expenses = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    variance_net = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    
    # Relations
    entrepreneur_name = serializers.CharField(source='entrepreneur.full_name', read_only=True)
    activity_title = serializers.CharField(source='activity.title', read_only=True)
    budget_items = BudgetItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = Budget
        fields = [
            'id', 'entrepreneur', 'entrepreneur_name', 'activity', 'activity_title',
            'name', 'description', 'period', 'period_display', 'start_date', 'end_date',
            'total_income_budget', 'total_expense_budget', 'net_budget', 'status',
            'status_display', 'progress_percentage', 'actual_income', 'actual_expenses',
            'actual_net', 'variance_income', 'variance_expenses', 'variance_net',
            'budget_items', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class BudgetCreateSerializer(serializers.ModelSerializer):
    """Sérialiseur pour la création de budgets"""
    
    budget_items = BudgetItemCreateSerializer(many=True, required=False)
    
    class Meta:
        model = Budget
        fields = [
            'entrepreneur', 'activity', 'name', 'description', 'period',
            'start_date', 'end_date', 'total_income_budget', 'total_expense_budget',
            'status', 'budget_items'
        ]
    
    def validate(self, attrs):
        """Validation des données"""
        # Vérifier que l'entrepreneur et l'activité correspondent
        entrepreneur = attrs.get('entrepreneur')
        activity = attrs.get('activity')
        
        if entrepreneur and activity and activity.entrepreneur != entrepreneur:
            raise serializers.ValidationError(
                "L'activité doit appartenir à l'entrepreneur sélectionné."
            )
        
        # Vérifier que la date de fin est après la date de début
        start_date = attrs.get('start_date')
        end_date = attrs.get('end_date')
        
        if start_date and end_date and end_date <= start_date:
            raise serializers.ValidationError(
                "La date de fin doit être après la date de début."
            )
        
        return attrs
    
    def create(self, validated_data):
        """Créer le budget avec ses éléments"""
        budget_items_data = validated_data.pop('budget_items', [])
        budget = Budget.objects.create(**validated_data)
        
        # Créer les éléments de budget
        for item_data in budget_items_data:
            BudgetItem.objects.create(budget=budget, **item_data)
        
        return budget


class BudgetUpdateSerializer(serializers.ModelSerializer):
    """Sérialiseur pour la mise à jour des budgets"""
    
    class Meta:
        model = Budget
        fields = [
            'name', 'description', 'total_income_budget', 'total_expense_budget', 'status'
        ]


class FinancialSummarySerializer(serializers.Serializer):
    """Sérialiseur pour le résumé financier"""
    
    # Période
    period_start = serializers.DateField()
    period_end = serializers.DateField()
    
    # Revenus
    total_income = serializers.DecimalField(max_digits=12, decimal_places=2)
    income_count = serializers.IntegerField()
    
    # Dépenses
    total_expenses = serializers.DecimalField(max_digits=12, decimal_places=2)
    expenses_count = serializers.IntegerField()
    
    # Résultat
    net_result = serializers.DecimalField(max_digits=12, decimal_places=2)
    profit_margin = serializers.FloatField()
    
    # Catégories principales
    top_income_categories = serializers.ListField()
    top_expense_categories = serializers.ListField()
    
    # Tendances
    daily_averages = serializers.DictField()
    weekly_totals = serializers.ListField()
    
    # Alertes
    overdue_payments = serializers.IntegerField()
    low_balance_alerts = serializers.ListField()


class CategorySummarySerializer(serializers.Serializer):
    """Sérialiseur pour le résumé des catégories"""
    
    category_id = serializers.UUIDField()
    category_name = serializers.CharField()
    category_type = serializers.CharField()
    total_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    entries_count = serializers.IntegerField()
    percentage_of_total = serializers.FloatField()
    trend = serializers.CharField()  # 'up', 'down', 'stable'
