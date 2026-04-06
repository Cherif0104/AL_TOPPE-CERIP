from django.urls import path
from rest_framework.permissions import IsAuthenticated
from . import views

app_name = 'ai'

urlpatterns = [
    # ═══════════════════════════════════════════════════════════════════
    # 🎤 ENDPOINTS VOCAUX (Voice AI)
    # ═══════════════════════════════════════════════════════════════════
    path('voice/analyze/', views.VoiceAnalyzeAPIView.as_view(), name='voice-analyze'),
    path('voice/execute/', views.VoiceExecuteAPIView.as_view(), name='voice-execute'),
    path('text/analyze/', views.TextAnalyzeAPIView.as_view(), name='text-analyze'),
    
    # Anciens endpoints (rétrocompatibilité)
    path('voice/', views.VoiceCommandAPIView.as_view(), name='voice-command'),
    path('text/', views.TextCommandAPIView.as_view(), name='text-command'),
    
    # ═══════════════════════════════════════════════════════════════════
    # 🆕 ENDPOINTS IA AVANCÉS (Nouveaux services)
    # ═══════════════════════════════════════════════════════════════════
    
    # 📊 Analyse financière
    path('financial/analyze/', views.FinancialHealthAnalysisAPIView.as_view(), name='financial-analyze'),
    
    # 💡 Recommandations IA
    path('recommendations/generate/', views.GenerateRecommendationsAPIView.as_view(), name='recommendations-generate'),
    
    # 📝 Business Plans IA
    path('business-plan/generate/', views.GenerateBusinessPlanAIAPIView.as_view(), name='business-plan-generate'),
    
    # 🔔 Rappels dépenses récurrentes
    path('recurring-expenses/detect/', views.DetectRecurringExpensesAPIView.as_view(), name='recurring-expenses-detect'),
]


