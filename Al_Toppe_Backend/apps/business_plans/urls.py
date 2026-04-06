from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Router pour les vues basées sur les ViewSets (si nécessaire)
router = DefaultRouter()

# URLs du module Business Plans
urlpatterns = [
    # ============================================================================
    # TEMPLATES DE PLANS D'AFFAIRES
    # ============================================================================
    path('templates/', views.BusinessPlanTemplateListView.as_view(), name='business-plan-templates'),
    path('templates/<uuid:pk>/', views.BusinessPlanTemplateDetailView.as_view(), name='business-plan-template-detail'),
    
    # ============================================================================
    # PLANS D'AFFAIRES
    # ============================================================================
    path('', views.BusinessPlanListView.as_view(), name='business-plans'),
    path('<uuid:pk>/', views.BusinessPlanDetailView.as_view(), name='business-plan-detail'),
    
    # Plans d'affaires par entrepreneur
    path('entrepreneurs/<uuid:entrepreneur_id>/', views.EntrepreneurBusinessPlanListView.as_view(), name='entrepreneur-business-plans'),
    
    # Tableau de bord
    path('dashboard/', views.BusinessPlanDashboardView.as_view(), name='business-plan-dashboard'),
    path('dashboard/statistics/', views.BusinessPlanDashboardView.as_view(), name='business-plan-statistics'),
    
    # ============================================================================
    # VALIDATIONS
    # ============================================================================
    path('validations/', views.BusinessPlanValidationListView.as_view(), name='business-plan-validations'),
    path('validations/<uuid:pk>/', views.BusinessPlanValidationDetailView.as_view(), name='business-plan-validation-detail'),
    
    # Validation d'un plan spécifique
    path('<uuid:business_plan_id>/validations/', views.BusinessPlanValidationCreateView.as_view(), name='business-plan-validation-create'),
    
    # ============================================================================
    # COMMENTAIRES
    # ============================================================================
    path('comments/', views.BusinessPlanCommentListView.as_view(), name='business-plan-comments'),
    path('comments/<uuid:pk>/', views.BusinessPlanCommentDetailView.as_view(), name='business-plan-comment-detail'),
    
    # Commentaires d'un plan spécifique
    path('<uuid:business_plan_id>/comments/', views.BusinessPlanCommentListView.as_view(), name='business-plan-comments-list'),
    
    # ============================================================================
    # VUES SPÉCIALISÉES
    # ============================================================================
    path('search/', views.BusinessPlanSearchView.as_view(), name='business-plan-search'),
    
    # Export et résumé
    path('<uuid:pk>/export/pdf/', views.business_plan_export_pdf_view, name='business-plan-export-pdf'),
    path('<uuid:pk>/pdf/', views.business_plan_download_pdf_view, name='business-plan-download-pdf'),
    path('<uuid:pk>/export/summary/', views.BusinessPlanExportSummaryView.as_view(), name='business-plan-export-summary'),
    
    # ============================================================================
    # TEMPLATES GUIDÉS
    # ============================================================================
    path('guided/<str:sector>/questions/', views.GuidedTemplateQuestionsView.as_view(), name='guided-template-questions'),
    path('guided/generate/', views.GuidedPlanGenerationView.as_view(), name='guided-plan-generate'),
    
    # ============================================================================
    # WORKFLOW DE VALIDATION
    # ============================================================================
    path('<uuid:pk>/workflow/status/', views.WorkflowStatusView.as_view(), name='business-plan-workflow-status'),
    path('<uuid:business_plan_id>/workflow/validate/', views.ValidationWithWorkflowView.as_view(), name='business-plan-workflow-validate'),
    
    # Inclure les routes du router si nécessaire
    path('api/', include(router.urls)),
]
