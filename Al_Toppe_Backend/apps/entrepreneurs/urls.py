from django.urls import path
from . import views

app_name = 'entrepreneurs'

urlpatterns = [
    # Entrepreneurs
    path('', views.EntrepreneurListView.as_view(), name='entrepreneur-list'),
    path('summary/', views.EntrepreneurSummaryView.as_view(), name='entrepreneur-summary'),
    path('search/', views.entrepreneur_search, name='entrepreneur-search'),
    path('<uuid:id>/', views.EntrepreneurDetailView.as_view(), name='entrepreneur-detail'),
    path('<uuid:entrepreneur_id>/dashboard/', views.entrepreneur_dashboard, name='entrepreneur-dashboard'),
    
    # Localisations
    path('<uuid:entrepreneur_id>/locations/', views.LocationListView.as_view(), name='location-list'),
    path('<uuid:entrepreneur_id>/locations/<uuid:id>/', views.LocationDetailView.as_view(), name='location-detail'),
    
    # Activités
    path('<uuid:entrepreneur_id>/activities/', views.ActivityListView.as_view(), name='activity-list'),
    path('<uuid:entrepreneur_id>/activities/<uuid:id>/', views.ActivityDetailView.as_view(), name='activity-detail'),
]

