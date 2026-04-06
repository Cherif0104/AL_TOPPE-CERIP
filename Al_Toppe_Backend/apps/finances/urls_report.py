from django.urls import path
from . import views

app_name = 'finances'

# Routes pour le reporting (à ajouter dans urls.py principal)
report_urlpatterns = [
    path('entrepreneurs/<uuid:entrepreneur_id>/report/summary/', views.financial_report_summary, name='financial-report-summary'),
    path('entrepreneurs/<uuid:entrepreneur_id>/report/export-pdf/', views.export_financial_report_pdf, name='export-financial-report-pdf'),
]

