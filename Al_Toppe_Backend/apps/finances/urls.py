from django.urls import path
from . import views

app_name = 'finances'

urlpatterns = [
    # Catégories
    path('categories/', views.CategoryListView.as_view(), name='category-list'),
    path('categories/<uuid:id>/', views.CategoryDetailView.as_view(), name='category-detail'),
    
    # Entrées de trésorerie
    path('entrepreneurs/<uuid:entrepreneur_id>/cashflow/', views.CashflowEntryListView.as_view(), name='cashflow-list'),
    path('entrepreneurs/<uuid:entrepreneur_id>/cashflow/<uuid:id>/', views.CashflowEntryDetailView.as_view(), name='cashflow-detail'),
    
    # Budgets
    path('entrepreneurs/<uuid:entrepreneur_id>/budgets/', views.BudgetListView.as_view(), name='budget-list'),
    path('entrepreneurs/<uuid:entrepreneur_id>/budgets/<uuid:id>/', views.BudgetDetailView.as_view(), name='budget-detail'),
    
    # Éléments de budget
    path('entrepreneurs/<uuid:entrepreneur_id>/budgets/<uuid:budget_id>/items/', views.BudgetItemListView.as_view(), name='budget-item-list'),
    path('entrepreneurs/<uuid:entrepreneur_id>/budgets/<uuid:budget_id>/items/<uuid:id>/', views.BudgetItemDetailView.as_view(), name='budget-item-detail'),
    
    # Tableaux de bord et analyses
    path('entrepreneurs/<uuid:entrepreneur_id>/dashboard/', views.financial_dashboard, name='financial-dashboard'),
    path('entrepreneurs/<uuid:entrepreneur_id>/categories/summary/', views.category_summary, name='category-summary'),
    path('entrepreneurs/<uuid:entrepreneur_id>/cashflow/analysis/', views.cashflow_analysis, name='cashflow-analysis'),
    
    # Compte de résultat
    path('entrepreneurs/<uuid:entrepreneur_id>/income-statement/', views.generate_income_statement, name='income-statement'),
    
    # Reporting
    path('entrepreneurs/<uuid:entrepreneur_id>/report/summary/', views.financial_report_summary, name='financial-report-summary'),
    path('entrepreneurs/<uuid:entrepreneur_id>/report/export-pdf/', views.export_financial_report_pdf, name='export-financial-report-pdf'),

    # Alert
]
