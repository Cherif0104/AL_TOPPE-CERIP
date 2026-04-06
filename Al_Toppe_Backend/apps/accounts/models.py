from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone
import uuid
from .validators import validate_phone_number


class UserManager(BaseUserManager):
    """Manager personnalisé pour le modèle User"""
    
    def create_user(self, phone, email=None, password=None, **extra_fields):
        """Créer un utilisateur normal"""
        if not phone:
            raise ValueError('Le numéro de téléphone est obligatoire')
        
        email = self.normalize_email(email) if email else None
        user = self.model(phone=phone, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, phone, email=None, password=None, **extra_fields):
        """Créer un superutilisateur"""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Le superutilisateur doit avoir is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Le superutilisateur doit avoir is_superuser=True.')
        
        return self.create_user(phone, email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """Modèle User personnalisé pour AL-TOPPE"""
    
    # Rôles disponibles
    ROLE_CHOICES = [
        ('entrepreneur', 'Entrepreneur'),
        ('coach', 'Coach'),
        ('bailleur', 'Bailleur'),
        ('admin', 'Administrateur'),
    ]
    
    # Champs d'identification
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # phone = models.CharField(max_length=20, unique=True, verbose_name="Numéro de téléphone")
    email = models.EmailField(unique=True, null=True, blank=True, verbose_name="Adresse email")
 # Dans le modèle
    phone = models.CharField(
        max_length=20, 
        unique=True, 
        validators=[validate_phone_number],
        verbose_name="Numéro de téléphone"
    )
    # Informations de base
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='entrepreneur', verbose_name="Rôle")
    is_active = models.BooleanField(default=True, verbose_name="Compte actif")
    is_staff = models.BooleanField(default=False, verbose_name="Membre du staff")
    
    # Préférences
    language = models.CharField(max_length=5, default='fr', verbose_name="Langue préférée")
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now, verbose_name="Date de création")
    last_login = models.DateTimeField(null=True, blank=True, verbose_name="Dernière connexion")
    
    # Manager
    objects = UserManager()
    
    # Champs d'authentification
    USERNAME_FIELD = 'phone'
    REQUIRED_FIELDS = []
    
    class Meta:
        verbose_name = "Utilisateur"
        verbose_name_plural = "Utilisateurs"
        db_table = 'users'
    
    def __str__(self):
        return f"{self.phone} ({self.get_role_display()})"
    
    def get_full_name(self):
        """Retourne le nom complet de l'utilisateur"""
        try:
            if hasattr(self, 'entrepreneur') and self.entrepreneur:
                return f"{self.entrepreneur.first_name} {self.entrepreneur.last_name}"
            elif hasattr(self, 'coach') and self.coach:
                return f"Coach {self.coach.organization}"
            elif hasattr(self, 'bailleur') and self.bailleur:
                return f"{self.bailleur.organization_name}"
        except:
            pass
        return self.phone
    
    def get_short_name(self):
        """Retourne le nom court de l'utilisateur"""
        try:
            if hasattr(self, 'entrepreneur') and self.entrepreneur:
                return self.entrepreneur.first_name
        except:
            pass
        return self.phone
    
    @property
    def is_entrepreneur(self):
        """Vérifie si l'utilisateur est un entrepreneur"""
        return self.role == 'entrepreneur'
    
    @property
    def is_coach(self):
        """Vérifie si l'utilisateur est un coach"""
        return self.role == 'coach'
    
    @property
    def is_bailleur(self):
        """Vérifie si l'utilisateur est un bailleur"""
        return self.role == 'bailleur'
    
    @property
    def is_admin(self):
        """Vérifie si l'utilisateur est un administrateur (codes API + staff Django)."""
        return (
            self.role in ('admin', 'administrateur')
            or getattr(self, 'is_staff', False)
            or getattr(self, 'is_superuser', False)
        )
    
    def update_last_login(self):
        """Met à jour la date de dernière connexion"""
        self.last_login = timezone.now()
        self.save(update_fields=['last_login'])


class PhoneVerification(models.Model):
    """Modèle pour la vérification des numéros de téléphone"""
    
    phone = models.CharField(max_length=20, verbose_name="Numéro de téléphone")
    otp_code = models.CharField(max_length=6, verbose_name="Code OTP")
    is_verified = models.BooleanField(default=False, verbose_name="Vérifié")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    expires_at = models.DateTimeField(verbose_name="Date d'expiration")
    
    class Meta:
        verbose_name = "Vérification téléphonique"
        verbose_name_plural = "Vérifications téléphoniques"
        db_table = 'phone_verifications'
    
    def __str__(self):
        return f"{self.phone} - {self.otp_code}"
    
    def is_expired(self):
        """Vérifie si le code OTP a expiré"""
        from django.utils import timezone
        return timezone.now() > self.expires_at