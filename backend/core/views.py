"""
Core API views for nutrii.

Phase 10 deliverable — fully public, read-only API.
"""

from __future__ import annotations

from django.db.models import Max, Q, Prefetch
from rest_framework import generics, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView

from . import serializers
from .health_index import compute_health_index
from .models import BanListEntry, Food, FoodCategory, FoodMolecule, Molecule, ProcessingMethod, Study


@api_view(["GET"])
def health_check(request):
    return Response({"status": "ok", "service": "nutrii-api"})


class FoodListView(generics.ListAPIView):
    queryset = Food.objects.select_related("category").prefetch_related(
        Prefetch("foodmolecule_set", queryset=FoodMolecule.objects.select_related("molecule"))
    ).all()
    serializer_class = serializers.FoodListSerializer

    def get_queryset(self):
        qs = super().get_queryset().annotate(max_molecule_harm_value=Max("foodmolecule__molecule__harm_level"))
        q = self.request.query_params.get("q", "").strip()
        category = self.request.query_params.get("category")
        min_score = self.request.query_params.get("min_health_index")
        max_score = self.request.query_params.get("max_health_index")
        max_hazard = self.request.query_params.get("max_hazard_level")
        ingredient_ids = [
            value.strip()
            for value in self.request.query_params.get("ingredients", "").split(",")
            if value.strip()
        ]
        dietary_preferences = [
            value.strip()
            for value in self.request.query_params.get("dietary_preferences", "").split(",")
            if value.strip()
        ]

        if q:
            qs = qs.filter(
                Q(name__icontains=q)
                | Q(aliases__icontains=q)
                | Q(foodmolecule__molecule__name__icontains=q)
            )
        if category:
            qs = qs.filter(category__name__iexact=category)
        if min_score:
            qs = qs.filter(health_index__gte=int(min_score))
        if max_score:
            qs = qs.filter(health_index__lte=int(max_score))
        if max_hazard is not None:
            qs = qs.filter(max_molecule_harm_value__lte=int(max_hazard))
        if ingredient_ids:
            qs = qs.filter(molecules__id__in=ingredient_ids)
        for preference in dietary_preferences:
            if preference in {"organic", "gluten_free", "alcohol_free", "lactose_free"}:
                qs = qs.filter(**{f"metadata__is_{preference}": True})
            else:
                qs = qs.filter(metadata__dietary_preferences__contains=[preference])

        return qs.distinct().order_by("-health_index", "name")


class FoodDetailView(generics.RetrieveAPIView):
    queryset = Food.objects.prefetch_related(
        Prefetch("foodmolecule_set", queryset=FoodMolecule.objects.select_related("molecule")),
        "score_revisions",
        "ai_guides",
    ).select_related("category")
    serializer_class = serializers.FoodDetailSerializer


class FoodHealthIndexView(APIView):
    def get(self, request, pk):
        food = Food.objects.prefetch_related("foodmolecule_set__molecule").get(pk=pk)
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
        return Food.objects.get(pk=food_id).foodstudy_set.select_related("study").order_by("-study__analyzed_at")


class FoodGuideView(APIView):
    def get(self, request, pk):
        food = Food.objects.get(pk=pk)
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

        # Trigram similarity search on name and aliases
        foods = Food.objects.filter(
            Q(name__icontains=q) | Q(aliases__icontains=q)
        ).select_related("category")[:50]

        molecules = Molecule.objects.filter(
            Q(name__icontains=q) | Q(iupac_name__icontains=q) | Q(cas_number__iexact=q)
        )[:20]

        return Response({
            "query": q,
            "foods": serializers.FoodListSerializer(foods, many=True).data,
            "molecules": serializers.MoleculeSerializer(molecules, many=True).data,
            "count": len(foods) + len(molecules),
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

        foods = Food.objects.prefetch_related("foodmolecule_set__molecule").filter(id__in=ids)
        if len(foods) != len(ids):
            return Response({"detail": "One or more food IDs not found"}, status=status.HTTP_404_NOT_FOUND)

        comparison = []
        all_molecule_names = set()
        for food in foods:
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

        return Response({
            "foods": comparison,
            "shared_molecules": list(shared),
            "total_unique_molecules": len(all_molecule_names),
        })


class MoleculeListView(generics.ListAPIView):
    queryset = Molecule.objects.all()
    serializer_class = serializers.MoleculeSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        harm = self.request.query_params.get("harm_level")
        if harm is not None:
            qs = qs.filter(harm_level=int(harm))
        return qs.order_by("name")


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

        results = Molecule.objects.filter(
            Q(name__icontains=q) | Q(cas_number__iexact=q) | Q(pubchem_cid=q if q.isdigit() else None)
        )[:20]

        return Response({
            "query": q,
            "results": serializers.MoleculeSerializer(results, many=True).data,
            "count": len(results),
        })


class RecentStudiesView(generics.ListAPIView):
    queryset = Study.objects.filter(ai_summary__isnull=False).exclude(ai_summary="").order_by("-analyzed_at")[:50]
    serializer_class = serializers.StudySerializer


class BanListView(generics.ListAPIView):
    queryset = BanListEntry.objects.select_related("food").all()
    serializer_class = serializers.BanListEntrySerializer

    def get_queryset(self):
        qs = super().get_queryset()
        conditional = self.request.query_params.get("conditional")
        if conditional is not None:
            qs = qs.filter(is_conditionally_safe=conditional.lower() == "true")
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
