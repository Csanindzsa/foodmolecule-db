"""
Core API views for nutrii.

Phase 10 deliverable — fully public, read-only API.
"""

from __future__ import annotations

import importlib.util
import sys
import uuid
from pathlib import Path

from django.shortcuts import get_object_or_404
from django.db.models import Count, Max, Q, Prefetch
from rest_framework import generics, parsers, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView

from . import serializers
from .analytics import AnalyticsEvent, log_event
from .food_deduplication import dedupe_foods_by_molecule_signature, dedupe_foods_by_normalized_name
from .health_index import compute_health_index
from .models import BanListEntry, Food, FoodCategory, FoodMolecule, Molecule, ProcessingMethod, Study


MAX_SCAN_IMAGE_BYTES = 8 * 1024 * 1024
OCR_SCANNER_PATH = Path(__file__).resolve().parents[2] / "ocr" / "src" / "pipeline" / "scan.py"
FOOD_DEDUPE_MODES = frozenset({
    "ingredient_signature",
    "ingredients",
    "exact",
    "molecule_set",
    "molecules",
    "normalized_name",
    "name",
})


def _build_label_scanner():
    spec = importlib.util.spec_from_file_location("nutrii_ocr_scan", OCR_SCANNER_PATH)
    if spec is None or spec.loader is None:
        raise ImportError(f"Could not load OCR scanner from {OCR_SCANNER_PATH}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    LabelScanner = module.LabelScanner

    return LabelScanner()


def _apply_food_dedupe(foods, mode: str):
    """Apply opt-in backend duplicate filtering to food iterables/querysets."""
    if mode in {"ingredient_signature", "ingredients", "exact"}:
        return dedupe_foods_by_molecule_signature(foods, include_amounts=True)
    if mode in {"molecule_set", "molecules"}:
        return dedupe_foods_by_molecule_signature(foods, include_amounts=False)
    if mode in {"normalized_name", "name"}:
        return dedupe_foods_by_normalized_name(foods)
    return foods


def _ingredient_query(ingredients: list[str]) -> Q:
    query = Q()
    for ingredient in ingredients:
        cleaned = ingredient.strip()
        if len(cleaned) < 3:
            continue
        query |= Q(name__icontains=cleaned) | Q(aliases__icontains=cleaned)
    return query


def _molecule_query(ingredients: list[str]) -> Q:
    query = Q()
    for ingredient in ingredients:
        cleaned = ingredient.strip()
        if len(cleaned) < 3:
            continue
        query |= Q(name__icontains=cleaned) | Q(iupac_name__icontains=cleaned) | Q(cas_number__iexact=cleaned)
    return query


def _parse_int_query_param(request, name: str):
    raw_value = request.query_params.get(name)
    if raw_value in (None, ""):
        return None
    try:
        return int(raw_value)
    except ValueError:
        raise ValueError(f"Query parameter '{name}' must be an integer.")


def _parse_choice_query_param(request, name: str, choices, default=None):
    raw_value = request.query_params.get(name)
    if raw_value in (None, ""):
        return default
    value = raw_value.strip().lower()
    if value not in choices:
        allowed = ", ".join(sorted(choices))
        raise ValueError(f"Query parameter '{name}' must be one of: {allowed}.")
    return value


def _parse_bool_query_param(request, name: str):
    raw_value = request.query_params.get(name)
    if raw_value in (None, ""):
        return None
    value = raw_value.strip().lower()
    if value in {"true", "1", "yes"}:
        return True
    if value in {"false", "0", "no"}:
        return False
    raise ValueError(f"Query parameter '{name}' must be true or false.")


def _parse_uuid_csv_query_param(request, name: str):
    raw_value = request.query_params.get(name, "")
    values = [value.strip() for value in raw_value.split(",") if value.strip()]
    parsed = []
    for value in values:
        try:
            parsed.append(uuid.UUID(value))
        except ValueError:
            raise ValueError(f"Query parameter '{name}' must contain valid UUIDs.")
    return parsed


@api_view(["GET"])
def health_check(request):
    return Response({"status": "ok", "service": "nutrii-api"})


class FoodListView(generics.ListAPIView):
    queryset = Food.objects.select_related("category").prefetch_related(
        Prefetch("foodmolecule_set", queryset=FoodMolecule.objects.select_related("molecule"))
    ).all()
    serializer_class = serializers.FoodListSerializer

    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    def get_queryset(self):
        qs = super().get_queryset().annotate(
            link_count=Count("foodmolecule", distinct=True),
            max_molecule_harm_value=Max("foodmolecule__molecule__harm_level"),
        )
        q = self.request.query_params.get("q", "").strip()
        category = self.request.query_params.get("category")
        dietary_preferences = [
            value.strip()
            for value in self.request.query_params.get("dietary_preferences", "").split(",")
            if value.strip()
        ]
        sort_fields = {
            "name_asc": ("name",),
            "name_desc": ("-name",),
            "links_desc": ("-link_count", "name"),
            "links_asc": ("link_count", "name"),
            "safety_desc": ("-health_index", "name"),
            "safety_asc": ("health_index", "name"),
            "hazard_desc": ("-max_molecule_harm_value", "name"),
            "hazard_asc": ("max_molecule_harm_value", "name"),
        }
        sort = _parse_choice_query_param(self.request, "sort", sort_fields.keys(), default="safety_desc")
        dedupe = _parse_choice_query_param(self.request, "dedupe", FOOD_DEDUPE_MODES, default="")
        ingredient_ids = _parse_uuid_csv_query_param(self.request, "ingredients")

        if q:
            qs = qs.filter(
                Q(name__icontains=q)
                | Q(aliases__icontains=q)
                | Q(foodmolecule__molecule__name__icontains=q)
            )
        if category:
            qs = qs.filter(category__name__iexact=category)
        min_score_value = _parse_int_query_param(self.request, "min_health_index")
        max_score_value = _parse_int_query_param(self.request, "max_health_index")
        max_hazard_value = _parse_int_query_param(self.request, "max_hazard_level")
        if min_score_value is not None:
            qs = qs.filter(health_index__gte=min_score_value)
        if max_score_value is not None:
            qs = qs.filter(health_index__lte=max_score_value)
        if max_hazard_value is not None:
            qs = qs.filter(max_molecule_harm_value__lte=max_hazard_value)
        if ingredient_ids:
            qs = qs.filter(molecules__id__in=ingredient_ids)
        for preference in dietary_preferences:
            if preference in {"organic", "gluten_free", "alcohol_free", "lactose_free"}:
                qs = qs.filter(**{f"metadata__is_{preference}": True})
            else:
                qs = qs.filter(metadata__dietary_preferences__contains=[preference])

        qs = qs.distinct().order_by(*sort_fields[sort])
        if dedupe:
            return _apply_food_dedupe(qs, dedupe)
        return qs


class FoodDetailView(generics.RetrieveAPIView):
    queryset = Food.objects.prefetch_related(
        Prefetch("foodmolecule_set", queryset=FoodMolecule.objects.select_related("molecule")),
        "score_revisions",
        "ai_guides",
    ).select_related("category")
    serializer_class = serializers.FoodDetailSerializer

    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        log_event(AnalyticsEvent("view", entity_id=str(kwargs["pk"])), request)
        return response


class FoodHealthIndexView(APIView):
    def get(self, request, pk):
        food = get_object_or_404(Food.objects.prefetch_related("foodmolecule_set__molecule"), pk=pk)
        result = compute_health_index(food)
        return Response({
            "food_id": str(pk),
            "health_index": result.score,
            "benefit_score": result.benefit_score,
            "safety_score": result.safety_score,
            "bioavailability_score": result.bioavailability_score,
            "label": result.label,
        })


class FoodStudiesView(generics.ListAPIView):
    serializer_class = serializers.FoodStudySerializer

    def get_queryset(self):
        food_id = self.kwargs["pk"]
        food = get_object_or_404(Food, pk=food_id)
        return food.foodstudy_set.select_related("study").order_by("-study__analyzed_at")


class FoodGuideView(APIView):
    def get(self, request, pk):
        food = get_object_or_404(Food, pk=pk)
        guide = food.ai_guides.first()
        if not guide:
            return Response({"food_id": str(pk), "guide": None}, status=status.HTTP_404_NOT_FOUND)
        return Response({
            "food_id": str(pk),
            "guide": guide.guide_markdown,
            "version": guide.version,
            "generated_by": guide.generated_by,
            "generated_at": guide.generated_at,
        })


class FoodSearchView(APIView):
    def get(self, request):
        q = request.query_params.get("q", "").strip().lower()
        if not q:
            return Response({"results": [], "count": 0})
        try:
            dedupe = _parse_choice_query_param(request, "dedupe", FOOD_DEDUPE_MODES, default="")
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        # Trigram similarity search on name and aliases
        foods = Food.objects.filter(
            Q(name__icontains=q) | Q(aliases__icontains=q)
        ).select_related("category").prefetch_related(
            Prefetch("foodmolecule_set", queryset=FoodMolecule.objects.select_related("molecule"))
        )[:50]
        if dedupe:
            foods = _apply_food_dedupe(foods, dedupe)

        molecules = Molecule.objects.filter(
            Q(name__icontains=q) | Q(iupac_name__icontains=q) | Q(cas_number__iexact=q)
        )[:20]

        food_count = len(foods)
        molecule_count = len(molecules)
        log_event(
            AnalyticsEvent(
                "search",
                metadata={
                    "query_length": len(q),
                    "food_count": food_count,
                    "molecule_count": molecule_count,
                    "dedupe": bool(dedupe),
                },
            ),
            request,
        )

        return Response({
            "query": q,
            "foods": serializers.FoodListSerializer(foods, many=True).data,
            "molecules": serializers.MoleculeSerializer(molecules, many=True).data,
            "count": food_count + molecule_count,
        })


class FoodCompareView(APIView):
    def get(self, request):
        ids = request.query_params.get("ids", "").split(",")
        ids = [i.strip() for i in ids if i.strip()]
        if len(ids) < 2 or len(ids) > 3:
            return Response(
                {"detail": "Provide 2–3 food IDs separated by commas (e.g., ?ids=id1,id2)"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            parsed_ids = [uuid.UUID(value) for value in ids]
        except ValueError:
            return Response(
                {"detail": "All compare IDs must be valid UUIDs."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        foods_by_id = {
            food.id: food
            for food in Food.objects.prefetch_related("foodmolecule_set__molecule").filter(id__in=parsed_ids)
        }
        if len(foods_by_id) != len(parsed_ids):
            return Response({"detail": "One or more food IDs not found"}, status=status.HTTP_404_NOT_FOUND)

        comparison = []
        all_molecule_names = set()
        for food_id in parsed_ids:
            food = foods_by_id[food_id]
            molecules = {fm.molecule.name: fm.molecule.harm_level for fm in food.foodmolecule_set.all()}
            all_molecule_names.update(molecules.keys())
            result = compute_health_index(food)
            comparison.append({
                "id": str(food.id),
                "name": food.name,
                "health_index": result.score,
                "safety_score": result.safety_score,
                "molecules": molecules,
            })

        # Shared molecules
        shared = set.intersection(*[set(c["molecules"].keys()) for c in comparison]) if len(comparison) > 1 else set()

        log_event(
            AnalyticsEvent(
                "compare",
                metadata={
                    "requested_count": len(ids),
                    "matched_count": len(comparison),
                    "shared_molecule_count": len(shared),
                    "unique_molecule_count": len(all_molecule_names),
                },
            ),
            request,
        )

        return Response({
            "foods": comparison,
            "shared_molecules": list(shared),
            "total_unique_molecules": len(all_molecule_names),
        })


class MoleculeListView(generics.ListAPIView):
    queryset = Molecule.objects.all()
    serializer_class = serializers.MoleculeSerializer

    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    def get_queryset(self):
        qs = super().get_queryset().annotate(
            linked_food_count=Count("foodmolecule", distinct=True)
        )
        q = self.request.query_params.get("q", "").strip()
        sort_fields = {
            "name_asc": ("name",),
            "name_desc": ("-name",),
            "links_desc": ("-linked_food_count", "name"),
            "links_asc": ("linked_food_count", "name"),
            "safety_desc": ("harm_level", "name"),
            "safety_asc": ("-harm_level", "name"),
        }
        sort = _parse_choice_query_param(self.request, "sort", sort_fields.keys(), default="name_asc")
        if q:
            search_filter = (
                Q(name__icontains=q)
                | Q(iupac_name__icontains=q)
                | Q(cas_number__iexact=q)
            )
            if q.isdigit():
                search_filter |= Q(pubchem_cid=q)
            qs = qs.filter(search_filter)
        harm_value = _parse_int_query_param(self.request, "harm_level")
        max_harm_value = _parse_int_query_param(self.request, "max_harm_level")
        if harm_value is not None:
            qs = qs.filter(harm_level=harm_value)
        if max_harm_value is not None:
            qs = qs.filter(harm_level__lte=max_harm_value)

        return qs.order_by(*sort_fields[sort])


class MoleculeDetailView(generics.RetrieveAPIView):
    queryset = Molecule.objects.prefetch_related(
        "foodmolecule_set__food__category",
        "moleculeneutralization_set__method",
    )
    serializer_class = serializers.MoleculeDetailSerializer


class MoleculeSearchView(APIView):
    def get(self, request):
        q = request.query_params.get("q", "").strip()
        if not q:
            return Response({"results": [], "count": 0})

        filters = Q(name__icontains=q) | Q(cas_number__iexact=q)
        if q.isdigit():
            filters |= Q(pubchem_cid=int(q))
        results = Molecule.objects.filter(filters)[:20]

        return Response({
            "query": q,
            "results": serializers.MoleculeSerializer(results, many=True).data,
            "count": len(results),
        })


class RecentStudiesView(generics.ListAPIView):
    queryset = Study.objects.filter(ai_summary__isnull=False).exclude(ai_summary="").order_by("-analyzed_at")[:50]
    serializer_class = serializers.StudySerializer


class BanListView(generics.ListAPIView):
    queryset = BanListEntry.objects.select_related("food").order_by("food__name", "id")
    serializer_class = serializers.BanListEntrySerializer

    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    def get_queryset(self):
        qs = super().get_queryset()
        conditional = _parse_bool_query_param(self.request, "conditional")
        if conditional is not None:
            qs = qs.filter(is_conditionally_safe=conditional)
        return qs


class CategoryListView(generics.ListAPIView):
    queryset = FoodCategory.objects.prefetch_related("children").all()
    serializer_class = serializers.FoodCategorySerializer


class ProcessingMethodListView(generics.ListAPIView):
    queryset = ProcessingMethod.objects.all()
    serializer_class = serializers.ProcessingMethodSerializer


class PlatformStatsView(APIView):
    def get(self, request):
        return Response({
            "foods": Food.objects.count(),
            "molecules": Molecule.objects.count(),
            "studies": Study.objects.count(),
            "studies_analyzed": Study.objects.exclude(ai_summary="").count(),
            "ban_list_entries": BanListEntry.objects.count(),
        })


class IngredientScanView(APIView):
    """OCR scan endpoint for mobile label photos."""

    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    def post(self, request):
        image = request.FILES.get("image")
        if image is None:
            return Response(
                {"detail": "Upload an image file in the multipart field named 'image'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if image.size > MAX_SCAN_IMAGE_BYTES:
            return Response(
                {"detail": "Image is too large. Maximum size is 8 MB."},
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )

        try:
            scan_result = _build_label_scanner().scan(image.read())
        except ImportError as exc:
            return Response(
                {"detail": "OCR dependencies are not installed.", "error": str(exc)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception as exc:
            return Response(
                {"detail": "OCR scan failed.", "error": str(exc)},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        ingredients = scan_result.ingredients[:30]
        food_query = _ingredient_query(ingredients)
        molecule_query = _molecule_query(ingredients)

        foods = Food.objects.none()
        molecules = Molecule.objects.none()
        if food_query:
            foods = Food.objects.filter(food_query).select_related("category").prefetch_related(
                Prefetch("foodmolecule_set", queryset=FoodMolecule.objects.select_related("molecule"))
            ).distinct()[:20]
        if molecule_query:
            molecules = Molecule.objects.filter(molecule_query).distinct()[:20]

        food_count = len(foods)
        molecule_count = len(molecules)
        log_event(
            AnalyticsEvent(
                "scan",
                metadata={
                    "ingredient_count": len(ingredients),
                    "food_count": food_count,
                    "molecule_count": molecule_count,
                    "confidence": round(float(scan_result.confidence), 2),
                },
            ),
            request,
        )

        return Response({
            "ingredients": ingredients,
            "confidence": scan_result.confidence,
            "raw_text": scan_result.raw_text,
            "foods": serializers.FoodListSerializer(foods, many=True).data,
            "molecules": serializers.MoleculeSerializer(molecules, many=True).data,
            "count": food_count + molecule_count,
        })
