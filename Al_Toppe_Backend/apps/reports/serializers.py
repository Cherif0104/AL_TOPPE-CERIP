from rest_framework import serializers
from .models import Report, ReportTemplate, ReportSchedule, ReportDistribution


class ReportSerializer(serializers.ModelSerializer):
    """Serializer pour les rapports"""
    
    is_overdue = serializers.ReadOnlyField()
    
    class Meta:
        model = Report
        fields = [
            'id', 'title', 'description', 'report_type', 'format', 'target_user',
            'activity', 'period_start', 'period_end', 'data', 'template_config',
            'is_generated', 'file_path', 'file_size', 'generated_at',
            'generation_duration', 'is_overdue', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'is_generated', 'file_path', 'file_size', 'generated_at', 'generation_duration', 'created_at', 'updated_at']
    
    def validate_period_end(self, value):
        """Valide la fin de période"""
        period_start = self.initial_data.get('period_start')
        if period_start and value and value <= period_start:
            raise serializers.ValidationError(
                "La fin de période doit être postérieure au début de période"
            )
        return value


class ReportTemplateSerializer(serializers.ModelSerializer):
    """Serializer pour les templates de rapports"""
    
    class Meta:
        model = ReportTemplate
        fields = [
            'id', 'name', 'description', 'category', 'is_system', 'template_config',
            'sections', 'charts_config', 'default_format', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_default_format(self, value):
        """Valide le format par défaut"""
        valid_formats = ['pdf', 'excel', 'csv', 'json', 'html']
        if value not in valid_formats:
            raise serializers.ValidationError(
                f"Le format doit être l'un des suivants : {', '.join(valid_formats)}"
            )
        return value


class ReportScheduleSerializer(serializers.ModelSerializer):
    """Serializer pour les planifications de rapports"""
    
    is_active = serializers.ReadOnlyField()
    last_generated = serializers.ReadOnlyField()
    next_generation = serializers.ReadOnlyField()
    total_generated = serializers.ReadOnlyField()
    success_rate = serializers.ReadOnlyField()
    
    class Meta:
        model = ReportSchedule
        fields = [
            'id', 'name', 'description', 'template', 'target_user', 'frequency',
            'start_date', 'end_date', 'generation_time', 'auto_send', 'recipients',
            'status', 'is_active', 'last_generated', 'next_generation',
            'total_generated', 'success_rate', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'last_generated', 'next_generation', 'total_generated', 'success_rate', 'created_at', 'updated_at']
    
    def validate_end_date(self, value):
        """Valide la date de fin"""
        start_date = self.initial_data.get('start_date')
        if start_date and value and value <= start_date:
            raise serializers.ValidationError(
                "La date de fin doit être postérieure à la date de début"
            )
        return value
    
    def validate_generation_time(self, value):
        """Valide l'heure de génération"""
        if not value:
            raise serializers.ValidationError("L'heure de génération est requise")
        return value


class ReportDistributionSerializer(serializers.ModelSerializer):
    """Serializer pour les distributions de rapports"""
    
    can_retry = serializers.ReadOnlyField()
    
    class Meta:
        model = ReportDistribution
        fields = [
            'id', 'report', 'recipient', 'delivery_method', 'status', 'attempts',
            'max_attempts', 'sent_at', 'delivered_at', 'error_message',
            'can_retry', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'sent_at', 'delivered_at', 'created_at', 'updated_at']
    
    def validate_delivery_method(self, value):
        """Valide la méthode de livraison"""
        valid_methods = ['email', 'sms', 'whatsapp', 'push', 'download']
        if value not in valid_methods:
            raise serializers.ValidationError(
                f"La méthode de livraison doit être l'une des suivantes : {', '.join(valid_methods)}"
            )
        return value
    
    def validate_max_attempts(self, value):
        """Valide le nombre maximum de tentatives"""
        if value < 1:
            raise serializers.ValidationError(
                "Le nombre maximum de tentatives doit être au moins 1"
            )
        if value > 10:
            raise serializers.ValidationError(
                "Le nombre maximum de tentatives ne peut pas dépasser 10"
            )
        return value


class ReportCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création de rapports"""
    
    class Meta:
        model = Report
        fields = [
            'title', 'description', 'report_type', 'format', 'target_user',
            'activity', 'period_start', 'period_end', 'data', 'template_config'
        ]


class ReportTemplateCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création de templates"""
    
    class Meta:
        model = ReportTemplate
        fields = [
            'name', 'description', 'category', 'template_config', 'sections',
            'charts_config', 'default_format', 'is_active'
        ]


class ReportScheduleCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création de planifications"""
    
    class Meta:
        model = ReportSchedule
        fields = [
            'name', 'description', 'template', 'target_user', 'frequency',
            'start_date', 'end_date', 'generation_time', 'auto_send', 'recipients',
            'status'
        ]


class ReportDistributionCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création de distributions"""
    
    class Meta:
        model = ReportDistribution
        fields = [
            'report', 'recipient', 'delivery_method', 'max_attempts'
        ]


class ReportGenerationSerializer(serializers.Serializer):
    """Serializer pour la génération de rapports"""
    
    report_id = serializers.UUIDField()
    generation_status = serializers.CharField()
    file_path = serializers.CharField(required=False)
    file_size = serializers.IntegerField(required=False)
    generation_duration = serializers.IntegerField(required=False)
    error_message = serializers.CharField(required=False)


class ReportDownloadSerializer(serializers.Serializer):
    """Serializer pour le téléchargement de rapports"""
    
    report_id = serializers.UUIDField()
    download_url = serializers.URLField()
    file_name = serializers.CharField()
    file_size = serializers.IntegerField()
    expires_at = serializers.DateTimeField(required=False)


class ScheduleActionSerializer(serializers.Serializer):
    """Serializer pour les actions sur les planifications"""
    
    action = serializers.ChoiceField(choices=['activate', 'deactivate', 'pause', 'resume'])
    reason = serializers.CharField(required=False, allow_blank=True)
    
    def validate_action(self, value):
        """Valide l'action selon le statut actuel de la planification"""
        schedule = self.context.get('schedule')
        if not schedule:
            return value
        
        if value == 'activate' and schedule.status != 'paused':
            raise serializers.ValidationError("Seules les planifications en pause peuvent être activées")
        elif value == 'deactivate' and schedule.status != 'active':
            raise serializers.ValidationError("Seules les planifications actives peuvent être désactivées")
        
        return value


class DistributionActionSerializer(serializers.Serializer):
    """Serializer pour les actions sur les distributions"""
    
    action = serializers.ChoiceField(choices=['retry', 'cancel', 'mark_delivered'])
    notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate_action(self, value):
        """Valide l'action selon le statut actuel de la distribution"""
        distribution = self.context.get('distribution')
        if not distribution:
            return value
        
        if value == 'retry' and not distribution.can_retry:
            raise serializers.ValidationError("Cette distribution ne peut pas être réessayée")
        elif value == 'mark_delivered' and distribution.status != 'sent':
            raise serializers.ValidationError("Seules les distributions envoyées peuvent être marquées comme livrées")
        
        return value


class ReportStatisticsSerializer(serializers.Serializer):
    """Serializer pour les statistiques de rapports"""
    
    total_reports = serializers.IntegerField()
    generated_reports = serializers.IntegerField()
    pending_reports = serializers.IntegerField()
    overdue_reports = serializers.IntegerField()
    total_templates = serializers.IntegerField()
    active_schedules = serializers.IntegerField()
    successful_distributions = serializers.IntegerField()
    failed_distributions = serializers.IntegerField()


class TemplateUsageSerializer(serializers.Serializer):
    """Serializer pour l'utilisation des templates"""
    
    template_id = serializers.UUIDField()
    template_name = serializers.CharField()
    usage_count = serializers.IntegerField()
    last_used = serializers.DateTimeField(required=False)
    success_rate = serializers.FloatField()


class SchedulePerformanceSerializer(serializers.Serializer):
    """Serializer pour la performance des planifications"""
    
    schedule_id = serializers.UUIDField()
    schedule_name = serializers.CharField()
    total_generated = serializers.IntegerField()
    successful_generations = serializers.IntegerField()
    failed_generations = serializers.IntegerField()
    success_rate = serializers.FloatField()
    average_generation_time = serializers.FloatField()






