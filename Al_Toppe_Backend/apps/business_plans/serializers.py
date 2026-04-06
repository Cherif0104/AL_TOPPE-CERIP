from rest_framework import serializers
from .models import BusinessPlanTemplate, BusinessPlan, BusinessPlanValidation, BusinessPlanComment


class BusinessPlanTemplateSerializer(serializers.ModelSerializer):
    sector_display = serializers.CharField(source='get_sector_display', read_only=True)
    
    class Meta:
        model = BusinessPlanTemplate
        fields = [
            'id', 'name', 'sector', 'sector_display', 'description', 
            'structure', 'is_active', 'version', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class BusinessPlanTemplateCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessPlanTemplate
        fields = [
            'name', 'sector', 'description', 'structure', 'is_active', 'version'
        ]


class BusinessPlanValidationSerializer(serializers.ModelSerializer):
    validator_phone = serializers.CharField(source='validator.phone', read_only=True)
    validation_type_display = serializers.CharField(source='get_validation_type_display', read_only=True)
    
    class Meta:
        model = BusinessPlanValidation
        fields = [
            'id', 'business_plan', 'validator', 'validator_phone',
            'validation_type', 'validation_type_display', 'is_approved', 
            'comments', 'score', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class BusinessPlanCommentSerializer(serializers.ModelSerializer):
    author_phone = serializers.CharField(source='author.phone', read_only=True)
    
    class Meta:
        model = BusinessPlanComment
        fields = [
            'id', 'business_plan', 'author', 'author_phone', 'content', 
            'section', 'is_internal', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class BusinessPlanCommentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessPlanComment
        fields = ['business_plan', 'content', 'section', 'is_internal']


class BusinessPlanSerializer(serializers.ModelSerializer):
    entrepreneur_name = serializers.CharField(source='entrepreneur.full_name', read_only=True)
    activity_title = serializers.CharField(source='activity.title', read_only=True)
    sector = serializers.CharField(source='activity.sector', read_only=True)
    sector_display = serializers.CharField(source='activity.get_sector_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    template_name = serializers.CharField(source='template.name', read_only=True)
    
    # Relations imbriquées
    validations = BusinessPlanValidationSerializer(many=True, read_only=True)
    comments = BusinessPlanCommentSerializer(many=True, read_only=True)
    
    pdf_file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = BusinessPlan
        fields = [
            'id', 'entrepreneur', 'entrepreneur_name', 'activity', 'activity_title',
            'template', 'template_name', 'title', 'summary', 'market_analysis',
            'offer', 'business_model', 'financial_projections', 'implementation_plan',
            'status', 'status_display', 'version', 'sector', 'sector_display',
            'is_validated', 'validation_date', 'validated_by', 'validations',
            'comments', 'pdf_file', 'pdf_file_url', 'pdf_generated_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'entrepreneur_name', 'activity_title', 'sector', 'sector_display',
            'status_display', 'template_name', 'validation_date', 'validations',
            'comments', 'pdf_file', 'pdf_file_url', 'pdf_generated_at',
            'created_at', 'updated_at'
        ]
    
    def get_pdf_file_url(self, obj):
        """Retourne l'URL de l'endpoint API pour télécharger le PDF si disponible"""
        if obj.pdf_file:
            request = self.context.get('request')
            if request:
                # Utiliser l'endpoint API au lieu de l'URL du fichier média
                url = request.build_absolute_uri(f'/api/business-plans/{obj.id}/pdf/')
                return url
            else:
                # Fallback si pas de request - utiliser les settings Django
                from django.conf import settings
                # En production, utiliser le domaine configuré
                if hasattr(settings, 'ALLOWED_HOSTS') and settings.ALLOWED_HOSTS:
                    domain = settings.ALLOWED_HOSTS[0]
                    protocol = 'https' if not settings.DEBUG else 'http'
                    return f'{protocol}://{domain}/api/business-plans/{obj.id}/pdf/'
                # Dernier fallback
                return f'/api/business-plans/{obj.id}/pdf/'
        return None


class BusinessPlanCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessPlan
        fields = [
            'entrepreneur', 'activity', 'template', 'title', 'summary',
            'market_analysis', 'offer', 'business_model', 'financial_projections',
            'implementation_plan', 'status', 'version'
        ]
    
    def validate(self, data):
        # Vérifier que l'entrepreneur et l'activité correspondent
        entrepreneur = data.get('entrepreneur')
        activity = data.get('activity')
        
        if entrepreneur and activity and activity.entrepreneur != entrepreneur:
            raise serializers.ValidationError(
                "L'activité doit appartenir à l'entrepreneur sélectionné."
            )
        
        return data


class BusinessPlanUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessPlan
        fields = [
            'title', 'summary', 'market_analysis', 'offer', 'business_model',
            'financial_projections', 'implementation_plan', 'status'
        ]
    
    def validate_status(self, value):
        # Permettre de remettre à "draft" même si le plan est validé
        # (car une modification invalide la validation précédente)
        if self.instance and self.instance.is_validated:
            if value == 'draft':
                # Permettre de remettre à draft (la validation sera désactivée dans update)
                return value
            elif value != self.instance.status:
                # Empêcher de changer vers un autre statut si validé
                raise serializers.ValidationError(
                    "Impossible de modifier le statut d'un plan validé. Remettez-le à 'Brouillon' pour le modifier."
                )
        return value
    
    def update(self, instance, validated_data):
        # Si le statut est remis à "draft", désactiver la validation
        should_reset_validation = 'status' in validated_data and validated_data['status'] == 'draft'
        
        # Vérifier si le statut passe à "submitted"
        status_changed_to_submitted = (
            'status' in validated_data and 
            validated_data['status'] == 'submitted' and 
            instance.status != 'submitted'
        )
        
        # Mettre à jour les champs normaux
        instance = super().update(instance, validated_data)
        
        # Si on remet à draft, désactiver la validation
        if should_reset_validation:
            instance.is_validated = False
            instance.validation_date = None
            instance.validated_by = None
            instance.save(update_fields=['is_validated', 'validation_date', 'validated_by'])
        
        # Notifier le coach si le plan est soumis
        if status_changed_to_submitted:
            try:
                from .notifications import notify_business_plan_submitted
                notify_business_plan_submitted(instance)
            except Exception as e:
                import logging
                logging.warning(f"⚠️ Erreur notification plan soumis: {e}")
        
        return instance


class BusinessPlanSummarySerializer(serializers.ModelSerializer):
    entrepreneur_name = serializers.CharField(source='entrepreneur.full_name', read_only=True)
    activity_title = serializers.CharField(source='activity.title', read_only=True)
    sector_display = serializers.CharField(source='activity.get_sector_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    validation_count = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()
    
    class Meta:
        model = BusinessPlan
        fields = [
            'id', 'title', 'entrepreneur_name', 'activity_title', 'sector_display',
            'status', 'status_display', 'version', 'is_validated', 'validation_count',
            'comment_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_validation_count(self, obj):
        return obj.validations.count()
    
    def get_comment_count(self, obj):
        return obj.comments.count()


class BusinessPlanDashboardSerializer(serializers.ModelSerializer):
    entrepreneur_name = serializers.CharField(source='entrepreneur.full_name', read_only=True)
    activity_title = serializers.CharField(source='activity.title', read_only=True)
    sector_display = serializers.CharField(source='activity.get_sector_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    # Statistiques
    days_since_creation = serializers.SerializerMethodField()
    validation_score = serializers.SerializerMethodField()
    
    class Meta:
        model = BusinessPlan
        fields = [
            'id', 'title', 'entrepreneur_name', 'activity_title', 'sector_display',
            'status', 'status_display', 'version', 'is_validated', 'days_since_creation',
            'validation_score', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_days_since_creation(self, obj):
        from django.utils import timezone
        delta = timezone.now().date() - obj.created_at.date()
        return delta.days
    
    def get_validation_score(self, obj):
        validations = obj.validations.filter(is_approved=True)
        if validations.exists():
            scores = [v.score for v in validations if v.score]
            return sum(scores) / len(scores) if scores else None
        return None
