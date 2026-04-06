from rest_framework import serializers
from .models import ProductionCycle, ProductionTask


class ProductionTaskSerializer(serializers.ModelSerializer):
    """Serializer pour les tâches de production"""
    
    is_delayed = serializers.ReadOnlyField()
    can_start = serializers.ReadOnlyField()
    dependent_tasks_count = serializers.SerializerMethodField()
    blocking_tasks_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductionTask
        fields = [
            'id', 'production_cycle', 'name', 'sequence_order', 'status',
            'planned_duration_days', 'actual_duration_days', 'depends_on',
            'planned_start_date', 'planned_end_date', 'actual_start_date', 'actual_end_date',
            'description', 'notes', 'is_delayed', 'can_start',
            'dependent_tasks_count', 'blocking_tasks_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_dependent_tasks_count(self, obj):
        """Retourne le nombre de tâches qui dépendent de celle-ci"""
        return obj.get_dependent_tasks().count()
    
    def get_blocking_tasks_count(self, obj):
        """Retourne le nombre de tâches qui bloquent celle-ci"""
        return len(obj.get_blocking_tasks())
    
    def validate_sequence_order(self, value):
        """Valide l'ordre de séquence"""
        production_cycle = self.initial_data.get('production_cycle')
        if production_cycle:
            existing_tasks = ProductionTask.objects.filter(
                production_cycle=production_cycle,
                sequence_order=value
            )
            if self.instance:
                existing_tasks = existing_tasks.exclude(pk=self.instance.pk)
            if existing_tasks.exists():
                raise serializers.ValidationError(
                    "Une tâche avec cet ordre de séquence existe déjà dans ce cycle"
                )
        return value
    
    def validate_depends_on(self, value):
        """Valide la dépendance"""
        if value and self.instance:
            # Éviter les dépendances circulaires
            if value == self.instance:
                raise serializers.ValidationError(
                    "Une tâche ne peut pas dépendre d'elle-même"
                )
            # Vérifier que la tâche dépendante appartient au même cycle
            if value.production_cycle != self.instance.production_cycle:
                raise serializers.ValidationError(
                    "La tâche dépendante doit appartenir au même cycle de production"
                )
        return value


class ProductionCycleSerializer(serializers.ModelSerializer):
    """Serializer pour les cycles de production"""
    
    tasks = ProductionTaskSerializer(many=True, read_only=True)
    is_delayed = serializers.ReadOnlyField()
    progress_percentage = serializers.ReadOnlyField()
    completion_rate = serializers.ReadOnlyField()
    total_tasks = serializers.SerializerMethodField()
    completed_tasks = serializers.SerializerMethodField()
    tasks_progress = serializers.ReadOnlyField()
    
    class Meta:
        model = ProductionCycle
        fields = [
            'id', 'activity', 'title', 'duration_days', 'start_date', 'expected_end_date',
            'actual_end_date', 'status', 'target_quantity', 'actual_quantity',
            'is_delayed', 'progress_percentage', 'completion_rate',
            'total_tasks', 'completed_tasks', 'tasks_progress',
            'tasks', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_total_tasks(self, obj):
        """Retourne le nombre total de tâches"""
        return obj.get_total_tasks()
    
    def get_completed_tasks(self, obj):
        """Retourne le nombre de tâches terminées"""
        return obj.get_completed_tasks()
    
    def validate_expected_end_date(self, value):
        """Valide la date de fin prévue"""
        start_date = self.initial_data.get('start_date')
        if start_date and value <= start_date:
            raise serializers.ValidationError(
                "La date de fin prévue doit être postérieure à la date de début"
            )
        return value
    
    def validate_actual_quantity(self, value):
        """Valide la quantité réalisée"""
        target_quantity = self.initial_data.get('target_quantity')
        if target_quantity and value and value > target_quantity:
            raise serializers.ValidationError(
                "La quantité réalisée ne peut pas dépasser la quantité cible"
            )
        return value


class ProductionCycleDetailSerializer(ProductionCycleSerializer):
    """Serializer détaillé pour les cycles de production avec toutes les tâches"""
    
    tasks = ProductionTaskSerializer(many=True, read_only=True)
    
    class Meta(ProductionCycleSerializer.Meta):
        fields = ProductionCycleSerializer.Meta.fields + ['tasks']


class ProductionTaskCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création de tâches de production"""
    
    class Meta:
        model = ProductionTask
        fields = [
            'production_cycle', 'name', 'sequence_order', 'planned_duration_days',
            'depends_on', 'planned_start_date', 'planned_end_date', 'description'
        ]
    
    def validate_production_cycle(self, value):
        """Valide que le cycle de production existe et est actif"""
        if not value:
            raise serializers.ValidationError("Le cycle de production est requis")
        return value


class ProductionCycleCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création de cycles de production"""
    
    class Meta:
        model = ProductionCycle
        fields = [
            'activity', 'title', 'duration_days', 'start_date', 'expected_end_date',
            'target_quantity', 'status'
        ]
    
    def validate_activity(self, value):
        """Valide que l'activité existe et est active"""
        if not value or not value.is_active:
            raise serializers.ValidationError("L'activité doit être active")
        return value


class ProductionProgressSerializer(serializers.Serializer):
    """Serializer pour les données de progression"""
    
    cycle_id = serializers.UUIDField()
    progress_percentage = serializers.FloatField()
    completion_rate = serializers.FloatField()
    total_tasks = serializers.IntegerField()
    completed_tasks = serializers.IntegerField()
    delayed_tasks = serializers.IntegerField()
    is_delayed = serializers.BooleanField()
    estimated_completion = serializers.DateField(allow_null=True)


class ProductionTaskActionSerializer(serializers.Serializer):
    """Serializer pour les actions sur les tâches"""
    
    action = serializers.ChoiceField(choices=['start', 'complete', 'pause', 'cancel'])
    notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate_action(self, value):
        """Valide l'action selon le statut actuel de la tâche"""
        task = self.context.get('task')
        if not task:
            return value
        
        if value == 'start' and task.status != 'pending':
            raise serializers.ValidationError("Seules les tâches en attente peuvent être démarrées")
        elif value == 'complete' and task.status != 'in_progress':
            raise serializers.ValidationError("Seules les tâches en cours peuvent être terminées")
        
        return value
