"""
Core API URL configuration for nutrii.

Phase 10 deliverable — public read-only API with no authentication.
"""

from django.urls import path

from . import views

urlpatterns = [
    # Health check
    path("health/", views.health_check, name="health-check"),

    # Foods
    path("foods/", views.FoodListView.as_view(), name="food-list"),
    path("foods/<uuid:pk>/", views.FoodDetailView.as_view(), name="food-detail"),
    path("foods/<uuid:pk>/health-index/", views.FoodHealthIndexView.as_view(), name="food-health-index"),
    path("foods/<uuid:pk>/studies/", views.FoodStudiesView.as_view(), name="food-studies"),
    path("foods/<uuid:pk>/guide/", views.FoodGuideView.as_view(), name="food-guide"),
    path("foods/search/", views.FoodSearchView.as_view(), name="food-search"),
    path("foods/compare/", views.FoodCompareView.as_view(), name="food-compare"),

    # Molecules
    path("molecules/", views.MoleculeListView.as_view(), name="molecule-list"),
    path("molecules/<uuid:pk>/", views.MoleculeDetailView.as_view(), name="molecule-detail"),
    path("molecules/search/", views.MoleculeSearchView.as_view(), name="molecule-search"),

    # Studies
    path("studies/recent/", views.RecentStudiesView.as_view(), name="recent-studies"),

    # Ban list
    path("ban-list/", views.BanListView.as_view(), name="ban-list"),

    # Categories
    path("categories/", views.CategoryListView.as_view(), name="category-list"),

    # Processing methods
    path("processing-methods/", views.ProcessingMethodListView.as_view(), name="processing-method-list"),

    # OCR scan
    path("scan/", views.IngredientScanView.as_view(), name="ingredient-scan"),

    # Stats
    path("stats/", views.PlatformStatsView.as_view(), name="platform-stats"),
]
