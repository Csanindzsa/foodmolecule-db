"""
Django management command to seed the database from JSON files.

Usage:
    python manage.py seed_data
    python manage.py seed_data --clear
    python manage.py seed_data --path /custom/seed/dir
"""

from __future__ import annotations

import json
from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

from core.models import Food, FoodCategory, FoodMolecule, Molecule
from scripts.transformers.normalizer import normalize_name


class Command(BaseCommand):
    help = "Seed the database from JSON files in the data/seed directory."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Flush all seed data before re-inserting.",
        )
        parser.add_argument(
            "--path",
            type=str,
            default=None,
            help="Custom path to the seed data directory.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        seed_path = self._resolve_seed_path(options["path"])
        self.stdout.write(f"Using seed data directory: {seed_path}")

        if options["clear"]:
            self._clear_seed_data()

        molecules_dir = seed_path / "molecules"
        foods_dir = seed_path / "foods"

        molecule_count = 0
        food_count = 0
        food_molecule_count = 0

        # Process molecules first (foods depend on them)
        if molecules_dir.exists():
            molecule_count = self._seed_molecules(molecules_dir)
        else:
            self.stdout.write(
                self.style.WARNING(f"Molecules directory not found: {molecules_dir}")
            )

        # Process foods
        if foods_dir.exists():
            food_count, food_molecule_count = self._seed_foods(foods_dir)
        else:
            self.stdout.write(
                self.style.WARNING(f"Foods directory not found: {foods_dir}")
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {molecule_count} molecules, {food_count} foods, "
                f"{food_molecule_count} food-molecule relationships"
            )
        )

    def _resolve_seed_path(self, custom_path):
        if custom_path:
            return Path(custom_path).resolve()
        project_root = Path(settings.BASE_DIR).parent
        return project_root / "data" / "seed"

    def _clear_seed_data(self):
        self.stdout.write(self.style.WARNING("Clearing existing seed data..."))
        # Delete in reverse dependency order to avoid FK constraints
        FoodMolecule.objects.all().delete()
        Food.objects.all().delete()
        Molecule.objects.all().delete()
        FoodCategory.objects.all().delete()
        self.stdout.write(self.style.SUCCESS("Existing seed data cleared."))

    def _seed_molecules(self, molecules_dir):
        self.stdout.write("Seeding molecules...")
        count = 0

        for json_file in sorted(molecules_dir.glob("*.json")):
            self.stdout.write(f"  Processing {json_file.name}...", ending=" ")
            with open(json_file, "r", encoding="utf-8") as f:
                try:
                    data = json.load(f)
                except json.JSONDecodeError as e:
                    self.stdout.write(self.style.ERROR(f"Invalid JSON: {e}"))
                    continue

            try:
                defaults = self._build_molecule_defaults(data)
                molecule_name = normalize_name(data["name"])
                molecule, created = self._upsert_with_uuid(
                    Molecule, data["id"], molecule_name, defaults
                )

                action = "created" if created else "updated"
                self.stdout.write(self.style.SUCCESS(action))
                count += 1
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"Error processing {json_file.name}: {e}")
                )

        return count

    def _build_molecule_defaults(self, data):
        defaults = {}

        # Map JSON fields directly to model fields
        field_mapping = {
            "pubchem_cid": "pubchem_cid",
            "iupac_name": "iupac_name",
            "cas_number": "cas_number",
            "molecular_formula": "molecular_formula",
            "harm_level": "harm_level",
            "harm_mechanisms": "harm_mechanisms",
            "classification_reasoning": "classification_reasoning",
            "is_heat_stable": "is_heat_stable",
            "is_neutralizable": "is_neutralizable",
            "structure_image_url": "structure_image_url",
            "metadata": "metadata",
        }

        for json_key, model_field in field_mapping.items():
            if json_key in data:
                defaults[model_field] = data[json_key]

        # Decimal fields require conversion
        if "molecular_weight" in data and data["molecular_weight"] is not None:
            defaults["molecular_weight"] = Decimal(str(data["molecular_weight"]))
        elif "molecular_weight" in data:
            defaults["molecular_weight"] = None

        if (
            "threshold_concern_mg_per_day" in data
            and data["threshold_concern_mg_per_day"] is not None
        ):
            defaults["threshold_concern_mg_per_day"] = Decimal(
                str(data["threshold_concern_mg_per_day"])
            )
        elif "threshold_concern_mg_per_day" in data:
            defaults["threshold_concern_mg_per_day"] = None

        # name is handled separately by _upsert_with_uuid — do NOT add it to defaults
        # Sanitize None values for CharField/TextField fields (blank=True, not null=True)
        for field in ["iupac_name", "cas_number", "molecular_formula", "structure_image_url"]:
            if field in defaults and defaults[field] is None:
                defaults[field] = ""
        return defaults

    def _seed_foods(self, foods_dir):
        self.stdout.write("Seeding foods...")
        food_count = 0
        food_molecule_count = 0

        for json_file in sorted(foods_dir.glob("*.json")):
            self.stdout.write(f"  Processing {json_file.name}...", ending=" ")
            with open(json_file, "r", encoding="utf-8") as f:
                try:
                    data = json.load(f)
                except json.JSONDecodeError as e:
                    self.stdout.write(self.style.ERROR(f"Invalid JSON: {e}"))
                    continue

            # Handle category lookup/creation
            category = None
            if data.get("category"):
                category, _ = FoodCategory.objects.get_or_create(
                    name=data["category"],
                    defaults={"description": ""},
                )

            try:
                defaults = self._build_food_defaults(data, category)
                food, created = self._upsert_with_uuid(
                    Food, data["id"], data["name"], defaults, unique_name=False
                )

                action = "created" if created else "updated"
                self.stdout.write(self.style.SUCCESS(action))
                food_count += 1

                # Process nested molecules
                molecules_data = data.get("molecules", [])
                for mol_data in molecules_data:
                    raw_molecule_name = mol_data.get("molecule_name", "")
                    molecule_name = normalize_name(raw_molecule_name)
                    molecule = Molecule.objects.filter(name__iexact=molecule_name).first()
                    if not molecule:
                        self.stdout.write(
                            self.style.WARNING(
                                f"    Molecule '{raw_molecule_name}' not found -- skipping"
                            )
                        )
                        continue

                    fm_defaults = {
                        "unit": mol_data.get("unit", ""),
                        "amount_notes": mol_data.get("amount_notes", ""),
                        "is_beneficial": mol_data.get("is_beneficial", False),
                    }

                    if mol_data.get("amount_per_100g") is not None:
                        fm_defaults["amount_per_100g"] = Decimal(
                            str(mol_data["amount_per_100g"])
                        )
                    else:
                        fm_defaults["amount_per_100g"] = None

                    fm, fm_created = FoodMolecule.objects.update_or_create(
                        food=food,
                        molecule=molecule,
                        defaults=fm_defaults,
                    )
                    food_molecule_count += 1
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"Error processing {json_file.name}: {e}")
                )

        return food_count, food_molecule_count

    def _build_food_defaults(self, data, category):
        # name is handled separately by _upsert_with_uuid — do NOT include it here
        defaults = {
            "aliases": data.get("aliases", []),
            "origin": (data.get("origin") or ""),
            "overall_safety_score": data.get("overall_safety_score"),
            "health_index": data.get("health_index"),
            "ban_listed": data.get("ban_listed", False),
            "image_url": (data.get("image_url") or ""),
            "metadata": data.get("metadata", {}),
            "category": category,
        }
        return defaults

    def _upsert_with_uuid(self, model_class, json_id, name, defaults, unique_name=True):
        """
        Upsert a model instance using JSON id as PK when creating.

        1. Try to find by id (from JSON)
        2. If not found, try to find by name (when unique_name=True)
        3. If found, update name and defaults (excluding id)
        4. If not found, create with JSON id as PK
        """
        # Try by id first
        try:
            instance = model_class.objects.get(id=json_id)
        except model_class.DoesNotExist:
            # Try by name (only when unique_name is True, e.g. for Molecule)
            if unique_name:
                instance = model_class.objects.filter(name__iexact=name).first()
                if instance is None:
                    # Create new with JSON id
                    instance = model_class.objects.create(
                        id=json_id, name=name, **defaults
                    )
                    return instance, True
            else:
                # Create new with JSON id (name is not unique, e.g. for Food)
                instance = model_class.objects.create(
                    id=json_id, name=name, **defaults
                )
                return instance, True

        # Update existing instance (do not change id)
        instance.name = name
        for field, value in defaults.items():
            setattr(instance, field, value)
        instance.save()
        return instance, False
