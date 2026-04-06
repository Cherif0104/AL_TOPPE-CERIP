from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views
from . import health_views

app_name = 'accounts'

urlpatterns = [
    # Santé de l'application
    path('health/', health_views.health_check, name='health-check'),
    
    # Authentification
    path('register/', views.UserRegistrationView.as_view(), name='user-register'),
    path('login/', views.LoginView.as_view(), name='user-login'),
    path('logout/', views.LogoutView.as_view(), name='user-logout'),
    path('refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    
    # Vérification téléphonique
    path('verify-phone/', views.PhoneVerificationView.as_view(), name='phone-verification'),
    path('resend-otp/', views.resend_otp, name='resend-otp'),
    
    # Profil utilisateur
    path('profile/', views.UserProfileView.as_view(), name='user-profile'),
    path('profile/update/', views.ProfileUpdateView.as_view(), name='profile-update'),
    path('user-info/', views.user_info, name='user-info'),
    
    # Gestion des mots de passe
    path('password/change/', views.PasswordChangeView.as_view(), name='password-change'),
    path('password/reset/request/', views.PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('password/reset/confirm/', views.PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
]
