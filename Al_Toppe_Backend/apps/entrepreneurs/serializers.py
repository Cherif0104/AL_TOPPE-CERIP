from rest_framework import serializers
import re
from .models import Entrepreneur, Location, Activity


class LocationSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les localisations"""
    
    class Meta:
        model = Location
        fields = [
            'id', 'address', 'region', 'city', 'lat', 'lng', 
            'is_primary', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class LocationCreateSerializer(serializers.ModelSerializer):
    """Sérialiseur pour la création de localisations"""
    
    class Meta:
        model = Location
        fields = [
            'address', 'region', 'city', 'lat', 'lng', 'is_primary'
        ]
    
    def validate(self, attrs):
        """Validation des données de localisation"""
        # Vérifier que les coordonnées sont cohérentes
        lat = attrs.get('lat')
        lng = attrs.get('lng')
        
        if lat is not None and (lat < -90 or lat > 90):
            raise serializers.ValidationError("La latitude doit être comprise entre -90 et 90.")
        
        if lng is not None and (lng < -180 or lng > 180):
            raise serializers.ValidationError("La longitude doit être comprise entre -180 et 180.")
        
        return attrs


class ActivitySerializer(serializers.ModelSerializer):
    """Sérialiseur pour les activités"""
    
    sector_display = serializers.CharField(source='get_sector_display', read_only=True)
    legal_form_display = serializers.CharField(source='get_legal_form_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    frequency_display = serializers.CharField(source='get_frequency_display', read_only=True)
    age_days = serializers.IntegerField(read_only=True)
    total_revenue = serializers.SerializerMethodField()
    total_expenses = serializers.SerializerMethodField()
    profit = serializers.SerializerMethodField()
    def get_total_revenue(self, obj):
        return obj.get_total_revenue()
    def get_total_expenses(self, obj):
        return obj.get_total_expenses()
    def get_profit(self, obj):
        return obj.get_profit()
    # status = serializers.SerializerMethodField()
    
    class Meta:
        model = Activity
        fields = [
            'id', 'title', 'sector', 'sector_display', 'description', 'creation_date',
            'legal_form', 'legal_form_display', 'tax_regime', 'status', 'status_display',
            'frequency', 'frequency_display', 'frequency_day',
            'age_days', 'total_revenue', 'total_expenses', 'profit', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    # def get_status(self, obj):
    #     # Retourne par exemple un code ou label par défaut
    #     return getattr(obj, 'status', 'unknown')

class ActivityCreateSerializer(serializers.ModelSerializer):
    """Sérialiseur pour la création d'activités"""
    
    class Meta:
        model = Activity
        fields = [
            'title', 'sector', 'description', 'creation_date',
            'legal_form', 'tax_regime', 'location', 'frequency', 'frequency_day'
        ]
    
    def validate_creation_date(self, value):
        """Validation de la date de création"""
        from django.utils import timezone
        
        if value > timezone.now().date():
            raise serializers.ValidationError("La date de création ne peut pas être dans le futur.")
        
        return value

    def validate_frequency_day(self, value):
        """Validation du jour de fréquence"""
        if value is not None and (value < 1 or value > 31):
            raise serializers.ValidationError("Le jour doit être compris entre 1 et 31.")
        return value


class EntrepreneurSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les entrepreneurs"""
    
    civility_display = serializers.CharField(source='get_civility_display', read_only=True)
    full_name = serializers.CharField(read_only=True)
    age = serializers.IntegerField(read_only=True)
    phone = serializers.CharField(source='user.phone', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    is_active = serializers.BooleanField(source='user.is_active', read_only=True)
    activities_count = serializers.IntegerField(read_only=True)
    total_revenue = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    
    # Relations
    locations = LocationSerializer(many=True, read_only=True)
    activities = ActivitySerializer(many=True, read_only=True)
    
    class Meta:
        model = Entrepreneur
        fields = [
            'id', 'user','first_name', 'last_name', 'full_name', 'civility', 'civility_display',
            'cni_number', 'address', 'whatsapp', 'birth_date', 'age',
            'phone', 'email', 'is_active', 'activities_count', 'total_revenue',
            'locations', 'activities', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class EntrepreneurCreateSerializer(serializers.ModelSerializer):
    """Sérialiseur pour la création d'entrepreneurs"""

    cni_number = serializers.CharField(required=False, allow_blank=True, max_length=50)

    # Champs utilisateur
    phone = serializers.CharField(max_length=20, write_only=True)
    email = serializers.EmailField(required=False, allow_blank=True, write_only=True)
    password = serializers.CharField(write_only=True, min_length=6)
    password_confirm = serializers.CharField(write_only=True)
    primary_address = serializers.CharField(write_only=True)
    primary_region = serializers.CharField(write_only=True)
    primary_city = serializers.CharField(write_only=True)
    primary_lat = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True, write_only=True)
    primary_lng = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True, write_only=True)

    class Meta:
        model = Entrepreneur
        fields = [
            'id', 'first_name', 'last_name', 'civility', 'cni_number', 'address',
            'whatsapp', 'birth_date', 'phone', 'email', 'password', 'password_confirm',
            'primary_address', 'primary_region', 'primary_city', 'primary_lat', 'primary_lng'
        ]
        read_only_fields = ['id']

    def validate_phone(self, value):
        """Valider le format des numéros sénégalais"""
        # Format attendu: 221 XX XXX XX XX
        pattern = r'^221\s(77|76|71|70|75|78)\s\d{3}\s\d{2}\s\d{2}$'
        if not re.match(pattern, value):
            raise serializers.ValidationError(
                'Le numéro doit être au format "221 XX XXX XX XX" et commencer par 77, 76, 70, 71, 75 ou 78'
            )
        return value

    def validate(self, attrs):
        """Validation des données"""
        # Vérifier que les mots de passe correspondent
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password_confirm": "Les mots de passe ne correspondent pas."})

        # CNI optionnel ; si renseigné, 12 à 14 chiffres (formats usités au Sénégal)
        raw_cni = (attrs.get('cni_number') or '').strip()
        if not raw_cni:
            attrs['cni_number'] = None
        else:
            digits = ''.join(c for c in raw_cni if c.isdigit())
            if len(digits) < 12 or len(digits) > 14:
                raise serializers.ValidationError({
                    "cni_number": "Si renseigné, le N° CNI doit contenir entre 12 et 14 chiffres."
                })
            attrs['cni_number'] = digits

        return attrs

    def create(self, validated_data):
        from apps.accounts.models import User
        from .models import Location
        from apps.coaches.models import Coach, CoachAssignment
        from django.utils import timezone
        import uuid

        # Extraire les données
        phone = validated_data.pop('phone')
        email = validated_data.pop('email', '')
        password = validated_data.pop('password')
        validated_data.pop('password_confirm')  # On ne garde pas la confirmation

        primary_address = validated_data.pop('primary_address')
        primary_region = validated_data.pop('primary_region')
        primary_city = validated_data.pop('primary_city')
        primary_lat = validated_data.pop('primary_lat', None)
        primary_lng = validated_data.pop('primary_lng', None)

        # Vérifier si l'utilisateur existe déjà
        if User.objects.filter(phone=phone).exists():
            raise serializers.ValidationError({"phone": "Ce numéro de téléphone est déjà utilisé."})

        if email and User.objects.filter(email=email).exists():
            raise serializers.ValidationError({"email": "Cet email est déjà utilisé."})

        # Créer l'utilisateur
        user = User.objects.create_user(
            phone=phone,
            email=email or None,
            password=password,
            role='entrepreneur'
        )

        # Créer l'entrepreneur
        entrepreneur = Entrepreneur.objects.create(
            user=user,
            **validated_data
        )

        # Créer la localisation principale
        Location.objects.create(
            entrepreneur=entrepreneur,
            address=primary_address,
            region=primary_region,
            city=primary_city,
            lat=primary_lat,
            lng=primary_lng,
            is_primary=True
        )

        # Créer automatiquement l'assignation au coach par défaut
        try:
            # ID du coach par défaut
            default_coach_id = '17c20ae5-67ab-4801-afe2-d8788f66fa2a'
            
            # Vérifier si le coach existe
            try:
                coach = Coach.objects.get(id=default_coach_id)
            except Coach.DoesNotExist:
                # Si le coach n'existe pas, essayer de trouver un coach disponible
                coach = Coach.objects.filter(is_available=True).first()
                if not coach:
                    # Si aucun coach disponible, on ne crée pas d'assignation
                    # mais on continue la création de l'entrepreneur
                    print(f"⚠️ Aucun coach disponible pour assigner l'entrepreneur {entrepreneur.id}")
                    return entrepreneur
            
            # Vérifier qu'il n'y a pas déjà une assignation
            if not CoachAssignment.objects.filter(coach=coach, entrepreneur=entrepreneur).exists():
                # Créer l'assignation
                CoachAssignment.objects.create(
                    coach=coach,
                    entrepreneur=entrepreneur,
                    status='active',
                    start_date=timezone.now().date(),
                    objectives=["Accompagnement initial de l'entrepreneur"],
                )
                print(f"✅ Assignation créée : Coach {coach.id} → Entrepreneur {entrepreneur.id}")
        except Exception as e:
            # En cas d'erreur, on continue quand même la création de l'entrepreneur
            # mais on log l'erreur pour le debug
            print(f"⚠️ Erreur lors de la création de l'assignation : {str(e)}")
            # Ne pas bloquer la création de l'entrepreneur si l'assignation échoue

        # Retourner toutes les informations de l'entrepreneur y compris l'id
        return entrepreneur





class EntrepreneurUpdateSerializer(serializers.ModelSerializer):
    """Sérialiseur pour la mise à jour des entrepreneurs"""
    
    class Meta:
        model = Entrepreneur
        fields = [
            'first_name', 'last_name', 'civility', 'address',
            'whatsapp', 'birth_date'
        ]


class EntrepreneurSummarySerializer(serializers.ModelSerializer):
    """Sérialiseur pour le résumé des entrepreneurs"""
    
    full_name = serializers.CharField(read_only=True)
    phone = serializers.CharField(source='user.phone', read_only=True)
    activities_count = serializers.IntegerField(read_only=True)
    total_revenue = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    primary_region = serializers.CharField(read_only=True)
    
    class Meta:
        model = Entrepreneur
        fields = [
            'id', 'full_name', 'phone', 'civility', 'activities_count',
            'total_revenue', 'primary_region', 'created_at'
        ]
    
    def to_representation(self, instance):
        """Personnaliser la représentation"""
        data = super().to_representation(instance)
        
        # Ajouter la région principale
        primary_location = instance.locations.filter(is_primary=True).first()
        data['primary_region'] = primary_location.region if primary_location else None
        
        return data
