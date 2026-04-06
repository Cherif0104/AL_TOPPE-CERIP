# Ajout des routes de reporting

Ajoutez ces routes dans `Django/apps/finances/urls.py` :

```python
# Dans urlpatterns, ajoutez :
path('entrepreneurs/<uuid:entrepreneur_id>/report/summary/', views.financial_report_summary, name='financial-report-summary'),
path('entrepreneurs/<uuid:entrepreneur_id>/report/export-pdf/', views.export_financial_report_pdf, name='export-financial-report-pdf'),
```

## Installation des dépendances

Pour l'export PDF, installez reportlab :
```bash
pip install reportlab
```

