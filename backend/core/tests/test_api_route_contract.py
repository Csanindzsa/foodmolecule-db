from django.urls.resolvers import URLPattern

from core import urls


EXPECTED_PUBLIC_API_ROUTES = [
    ("health-check", "health/"),
    ("food-list", "foods/"),
    ("food-detail", "foods/<uuid:pk>/"),
    ("food-health-index", "foods/<uuid:pk>/health-index/"),
    ("food-studies", "foods/<uuid:pk>/studies/"),
    ("food-guide", "foods/<uuid:pk>/guide/"),
    ("food-search", "foods/search/"),
    ("food-compare", "foods/compare/"),
    ("molecule-list", "molecules/"),
    ("molecule-detail", "molecules/<uuid:pk>/"),
    ("molecule-search", "molecules/search/"),
    ("recent-studies", "studies/recent/"),
    ("ban-list", "ban-list/"),
    ("category-list", "categories/"),
    ("processing-method-list", "processing-methods/"),
    ("ingredient-scan", "scan/"),
    ("platform-stats", "stats/"),
]


def test_public_api_route_contract_has_expected_routes():
    routes = [
        (pattern.name, str(pattern.pattern))
        for pattern in urls.urlpatterns
        if isinstance(pattern, URLPattern)
    ]

    assert routes == EXPECTED_PUBLIC_API_ROUTES
    assert len(routes) == 17
