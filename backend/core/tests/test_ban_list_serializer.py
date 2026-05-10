"""
Tests for BanListEntrySerializer and BanListFoodSerializer.

Phase 1.3 deliverable — verifies nested food object serialization.
"""

import uuid

import pytest

from core.models import BanListEntry, Food, FoodCategory
from core.serializers import BanListEntrySerializer, BanListFoodSerializer


@pytest.mark.django_db
class TestBanListFoodSerializer:
    """Test the lightweight food serializer used inside ban-list responses."""

    def test_fields_present(self):
        """BanListFoodSerializer must expose id, name, category, health_index."""
        cat = FoodCategory.objects.create(name="Seafood")
        food = Food.objects.create(
            name="Puffer Fish",
            category=cat,
            health_index=12,
        )
        serializer = BanListFoodSerializer(food)
        data = serializer.data

        assert set(data.keys()) == {"id", "name", "category", "health_index"}
        assert data["id"] == str(food.id)
        assert data["name"] == "Puffer Fish"
        assert data["category"] == "Seafood"
        assert data["health_index"] == 12

    def test_category_from_related_name(self):
        """category field must resolve to Food.category.name, not the raw FK."""
        cat = FoodCategory.objects.create(name="Legumes")
        food = Food.objects.create(name="Raw Kidney Beans", category=cat)
        serializer = BanListFoodSerializer(food)

        assert serializer.data["category"] == "Legumes"

    def test_null_category(self):
        """When Food.category is None, the category output must be None."""
        food = Food.objects.create(name="Mystery Meat", category=None)
        serializer = BanListFoodSerializer(food)

        assert "category" in serializer.data
        assert serializer.data["category"] is None

    def test_null_health_index(self):
        """health_index is nullable on the model; serializer must handle None."""
        food = Food.objects.create(name="Unscored Food", health_index=None)
        serializer = BanListFoodSerializer(food)

        assert serializer.data["health_index"] is None

    def test_fields_are_read_only(self):
        """No field on BanListFoodSerializer should accept write input."""
        # Attempt to deserialize with arbitrary data — all fields should be ignored
        # because they are read-only (source=..., read_only=True) or ModelSerializer
        # fields that are not marked writable.
        payload = {
            "id": str(uuid.uuid4()),
            "name": "Hacked Name",
            "category": "Hacked Category",
            "health_index": 999,
        }
        serializer = BanListFoodSerializer(data=payload)
        # If any field were writable, serializer.is_valid() would be True and
        # create a new object. Because all fields are read-only, there is no
        # writable data and is_valid should be False (empty).
        assert serializer.is_valid() is False


@pytest.mark.django_db
class TestBanListEntrySerializer:
    """Test the full ban-list entry serializer with nested food object."""

    def test_nested_food_structure(self):
        """BanListEntrySerializer.food must be a nested object, not a raw UUID."""
        cat = FoodCategory.objects.create(name="Toxins")
        food = Food.objects.create(
            name="Batrachotoxin",
            category=cat,
            health_index=0,
        )
        entry = BanListEntry.objects.create(
            food=food,
            reason="Extremely potent neurotoxin.",
            lethal_dose_mg=0.002,
            is_conditionally_safe=False,
            regulatory_status={"EU": {"status": "banned"}},
        )
        serializer = BanListEntrySerializer(entry)
        data = serializer.data

        # food must be a dict, not a string/UUID
        assert isinstance(data["food"], dict)
        assert data["food"]["id"] == str(food.id)
        assert data["food"]["name"] == "Batrachotoxin"
        assert data["food"]["category"] == "Toxins"
        assert data["food"]["health_index"] == 0

    def test_food_field_is_read_only(self):
        """Attempting to write the nested food object must be ignored."""
        cat = FoodCategory.objects.create(name="Dairy")
        food = Food.objects.create(name="Raw Milk", category=cat)
        entry = BanListEntry.objects.create(
            food=food,
            reason="Risk of listeria.",
        )
        payload = {
            "id": str(entry.id),
            "food": {"id": str(uuid.uuid4()), "name": "Fake Food"},
            "reason": "Updated reason",
        }
        serializer = BanListEntrySerializer(entry, data=payload, partial=True)
        # food is read_only=True, so it should not be part of validated_data
        assert serializer.is_valid() is True
        assert "food" not in serializer.validated_data

    def test_entry_fields_present(self):
        """Top-level entry fields must all be present in the output."""
        food = Food.objects.create(name="Unpasteurized Cheese")
        entry = BanListEntry.objects.create(
            food=food,
            reason="Brucella risk.",
            lethal_dose_mg=None,
            is_conditionally_safe=True,
            safe_condition="Only when pasteurized.",
            regulatory_status={"US": {"status": "restricted"}},
        )
        serializer = BanListEntrySerializer(entry)
        data = serializer.data

        assert set(data.keys()) == {
            "id",
            "food",
            "reason",
            "lethal_dose_mg",
            "is_conditionally_safe",
            "safe_condition",
            "regulatory_status",
        }
        assert data["reason"] == "Brucella risk."
        assert data["lethal_dose_mg"] is None
        assert data["is_conditionally_safe"] is True
        assert data["safe_condition"] == "Only when pasteurized."
        assert data["regulatory_status"] == {"US": {"status": "restricted"}}

    def test_entry_with_null_food_category(self):
        """If the related food has no category, food.category must be None."""
        food = Food.objects.create(name="Unknown Substance", category=None)
        entry = BanListEntry.objects.create(
            food=food,
            reason="Unidentified compound.",
        )
        serializer = BanListEntrySerializer(entry)

        assert serializer.data["food"]["category"] is None
        assert serializer.data["food"]["name"] == "Unknown Substance"

    def test_entry_food_field_uses_ban_list_food_serializer(self):
        """Verify the nested serializer class is BanListFoodSerializer, not another."""
        food_field = BanListEntrySerializer().fields["food"]
        assert isinstance(food_field, BanListFoodSerializer)

    def test_ban_list_food_serializer_category_field_read_only(self):
        """BanListFoodSerializer.category must be a read-only CharField."""
        from rest_framework import serializers as drf_serializers

        cat_field = BanListFoodSerializer().fields["category"]
        assert isinstance(cat_field, drf_serializers.CharField)
        assert cat_field.read_only is True
        assert cat_field.source == "category.name"
        assert cat_field.allow_null is True

    def test_multiple_entries_serialization(self):
        """Many entries must each contain correctly nested food objects."""
        cat1 = FoodCategory.objects.create(name="Fish")
        cat2 = FoodCategory.objects.create(name="Fungi")
        food1 = Food.objects.create(name="Fugu", category=cat1, health_index=5)
        food2 = Food.objects.create(name="Death Cap", category=cat2, health_index=0)
        entry1 = BanListEntry.objects.create(
            food=food1,
            reason="Tetrodotoxin.",
            is_conditionally_safe=True,
            safe_condition="Prepared by licensed chef.",
        )
        entry2 = BanListEntry.objects.create(
            food=food2,
            reason="Amatoxins — liver failure.",
            is_conditionally_safe=False,
        )

        serializer = BanListEntrySerializer([entry1, entry2], many=True)
        data = serializer.data

        assert len(data) == 2
        assert data[0]["food"]["name"] == "Fugu"
        assert data[0]["food"]["category"] == "Fish"
        assert data[0]["food"]["health_index"] == 5
        assert data[1]["food"]["name"] == "Death Cap"
        assert data[1]["food"]["category"] == "Fungi"
        assert data[1]["food"]["health_index"] == 0
