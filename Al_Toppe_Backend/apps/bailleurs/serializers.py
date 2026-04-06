from rest_framework import serializers
from .models import Bailleur, FundingProgram, FundingApplication


class BailleurSerializer(serializers.ModelSerializer):
    """Serializer pour les bailleurs"""
    
    active_programs_count = serializers.ReadOnlyField()
    success_rate = serializers.ReadOnlyField()
    
    class Meta:
        model = Bailleur
        fields = [
            'id', 'user', 'organization_name', 'organization_type', 'contact_person',
            'contact_position', 'website', 'sectors_supported', 'regions_covered',
            'funding_capacity', 'is_active', 'total_funding_provided',
            'entrepreneurs_supported', 'active_programs_count', 'success_rate',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class FundingProgramSerializer(serializers.ModelSerializer):
    """Serializer pour les programmes de financement"""
    
    bailleur_name = serializers.ReadOnlyField(source='bailleur.organization_name')
    is_active = serializers.ReadOnlyField()
    is_accepting_applications = serializers.ReadOnlyField()
    approval_rate = serializers.ReadOnlyField()
    remaining_budget = serializers.ReadOnlyField()
    
    class Meta:
        model = FundingProgram
        fields = [
            'id', 'bailleur', 'bailleur_name', 'program_name', 'description',
            'funding_type', 'min_amount', 'max_amount', 'start_date', 'end_date',
            'application_deadline', 'target_sectors', 'target_regions',
            'eligibility_criteria', 'required_documents', 'status',
            'total_applications', 'approved_applications', 'total_funding_allocated',
            'is_active', 'is_accepting_applications', 'approval_rate', 'remaining_budget',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_application_deadline(self, value):
        """Valide la date limite de candidature"""
        start_date = self.initial_data.get('start_date')
        end_date = self.initial_data.get('end_date')
        
        if start_date and value and value <= start_date:
            raise serializers.ValidationError(
                "La date limite de candidature doit être postérieure à la date de début"
            )
        
        if end_date and value and value > end_date:
            raise serializers.ValidationError(
                "La date limite de candidature ne peut pas être après la date de fin"
            )
        
        return value
    
    def validate_max_amount(self, value):
        """Valide le montant maximum"""
        min_amount = self.initial_data.get('min_amount')
        if min_amount and value and value <= min_amount:
            raise serializers.ValidationError(
                "Le montant maximum doit être supérieur au montant minimum"
            )
        return value


class FundingApplicationSerializer(serializers.ModelSerializer):
    """Serializer pour les candidatures aux programmes de financement"""
    
    entrepreneur_name = serializers.ReadOnlyField(source='entrepreneur.full_name')
    program_name = serializers.ReadOnlyField(source='program.program_name')
    bailleur_name = serializers.ReadOnlyField(source='program.bailleur.organization_name')
    is_approved = serializers.ReadOnlyField()
    is_rejected = serializers.ReadOnlyField()
    approval_rate = serializers.ReadOnlyField()
    
    class Meta:
        model = FundingApplication
        fields = [
            'id', 'entrepreneur', 'entrepreneur_name', 'activity', 'program',
            'program_name', 'bailleur_name', 'requested_amount', 'status',
            'submitted_at', 'review_date', 'approved_amount', 'rejection_reason',
            'business_plan', 'project_description', 'expected_impact',
            'implementation_timeline', 'supporting_documents', 'evaluation_score',
            'evaluation_notes', 'is_approved', 'is_rejected', 'approval_rate',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'submitted_at', 'created_at', 'updated_at']
    
    def validate_requested_amount(self, value):
        """Valide le montant demandé"""
        program = self.initial_data.get('program')
        if program:
            if program.min_amount and value < program.min_amount:
                raise serializers.ValidationError(
                    f"Le montant demandé doit être au moins {program.min_amount} FCFA"
                )
            if program.max_amount and value > program.max_amount:
                raise serializers.ValidationError(
                    f"Le montant demandé ne peut pas dépasser {program.max_amount} FCFA"
                )
        return value
    
    def validate_program(self, value):
        """Valide que le programme accepte encore des candidatures"""
        if not value.is_accepting_applications:
            raise serializers.ValidationError(
                "Ce programme n'accepte plus de candidatures"
            )
        return value


class BailleurCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création de bailleurs"""
    
    class Meta:
        model = Bailleur
        fields = [
            'user', 'organization_name', 'organization_type', 'contact_person',
            'contact_position', 'website', 'sectors_supported', 'regions_covered',
            'funding_capacity', 'is_active'
        ]
    
    def validate_user(self, value):
        """Valide que l'utilisateur a le rôle bailleur"""
        if value.role != 'bailleur':
            raise serializers.ValidationError("L'utilisateur doit avoir le rôle bailleur")
        return value


class FundingProgramCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création de programmes"""
    
    class Meta:
        model = FundingProgram
        fields = [
            'bailleur', 'program_name', 'description', 'funding_type',
            'min_amount', 'max_amount', 'start_date', 'end_date',
            'application_deadline', 'target_sectors', 'target_regions',
            'eligibility_criteria', 'required_documents', 'status'
        ]
    
    def validate_bailleur(self, value):
        """Valide que le bailleur est actif"""
        if not value.is_active:
            raise serializers.ValidationError("Le bailleur doit être actif")
        return value


class FundingApplicationCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création de candidatures"""
    
    class Meta:
        model = FundingApplication
        fields = [
            'entrepreneur', 'activity', 'program', 'requested_amount',
            'project_description', 'expected_impact', 'implementation_timeline',
            'supporting_documents'
        ]
    
    def validate(self, data):
        """Validation personnalisée"""
        entrepreneur = data.get('entrepreneur')
        program = data.get('program')
        
        # Vérifier que l'entrepreneur n'a pas déjà une candidature active
        existing_application = FundingApplication.objects.filter(
            entrepreneur=entrepreneur,
            program=program,
            status__in=['submitted', 'under_review']
        ).first()
        
        if existing_application:
            raise serializers.ValidationError(
                "Cet entrepreneur a déjà une candidature active pour ce programme"
            )
        
        return data


class ApplicationActionSerializer(serializers.Serializer):
    """Serializer pour les actions sur les candidatures"""
    
    action = serializers.ChoiceField(choices=['submit', 'approve', 'reject'])
    approved_amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False
    )
    rejection_reason = serializers.CharField(required=False, allow_blank=True)
    evaluation_score = serializers.DecimalField(
        max_digits=5, decimal_places=2, required=False
    )
    evaluation_notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate_action(self, value):
        """Valide l'action selon le statut actuel de la candidature"""
        application = self.context.get('application')
        if not application:
            return value
        
        if value == 'submit' and application.status != 'draft':
            raise serializers.ValidationError("Seules les candidatures en brouillon peuvent être soumises")
        elif value == 'approve' and application.status not in ['submitted', 'under_review']:
            raise serializers.ValidationError("Seules les candidatures soumises ou en révision peuvent être approuvées")
        elif value == 'reject' and application.status not in ['submitted', 'under_review']:
            raise serializers.ValidationError("Seules les candidatures soumises ou en révision peuvent être rejetées")
        
        return value
    
    def validate_approved_amount(self, value):
        """Valide le montant approuvé"""
        application = self.context.get('application')
        if not application:
            return value
        
        if value and value > application.requested_amount:
            raise serializers.ValidationError(
                "Le montant approuvé ne peut pas dépasser le montant demandé"
            )
        
        return value


class BailleurImpactSerializer(serializers.Serializer):
    """Serializer pour les données d'impact d'un bailleur"""
    
    bailleur_id = serializers.UUIDField()
    total_programs = serializers.IntegerField()
    active_programs = serializers.IntegerField()
    total_applications = serializers.IntegerField()
    approved_applications = serializers.IntegerField()
    total_funding_provided = serializers.DecimalField(max_digits=15, decimal_places=2)
    entrepreneurs_supported = serializers.IntegerField()
    approval_rate = serializers.FloatField()
    average_funding_amount = serializers.DecimalField(max_digits=12, decimal_places=2)


class ProgramStatisticsSerializer(serializers.Serializer):
    """Serializer pour les statistiques d'un programme"""
    
    program_id = serializers.UUIDField()
    total_applications = serializers.IntegerField()
    approved_applications = serializers.IntegerField()
    rejected_applications = serializers.IntegerField()
    pending_applications = serializers.IntegerField()
    total_funding_allocated = serializers.DecimalField(max_digits=15, decimal_places=2)
    approval_rate = serializers.FloatField()
    average_processing_time = serializers.IntegerField()  # en jours
