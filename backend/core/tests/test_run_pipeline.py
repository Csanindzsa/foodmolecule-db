from types import SimpleNamespace

from scripts import run_pipeline
from scripts.pipeline.models import FoodEntry, FoodMoleculeLink, MoleculeEntry


class AtomicRecorder:
    def __init__(self, state):
        self.state = state

    def __enter__(self):
        self.state["inside"] = True
        self.state["entered"] += 1

    def __exit__(self, exc_type, exc, tb):
        self.state["inside"] = False
        self.state["exited"] += 1
        return False


def test_run_pipeline_wraps_all_database_writes_in_one_transaction(monkeypatch):
    food = FoodEntry(
        name="Apple",
        molecules=[FoodMoleculeLink(molecule_name="fiber", amount_per_100g=2.4)],
    )
    molecule = MoleculeEntry(name="fiber")
    transaction_state = {"inside": False, "entered": 0, "exited": 0}
    write_events = []

    monkeypatch.setattr(run_pipeline, "load_json_entries", lambda path, model: [food] if model is FoodEntry else [molecule])
    monkeypatch.setattr(run_pipeline, "normalize_all", lambda foods, molecules: (foods, molecules))
    monkeypatch.setattr(run_pipeline, "deduplicate_all", lambda foods, molecules: (foods, molecules))
    monkeypatch.setattr(run_pipeline, "validate_batch", lambda foods, molecules: {})
    monkeypatch.setattr(
        run_pipeline.transaction,
        "atomic",
        lambda: AtomicRecorder(transaction_state),
    )

    def upsert_molecule(entry):
        write_events.append(("molecule", entry.name, transaction_state["inside"]))

    def upsert_food(entry):
        write_events.append(("food", entry.name, transaction_state["inside"]))
        return SimpleNamespace(name=entry.name)

    def link_food_molecules(food_obj, links):
        write_events.append(("link", food_obj.name, len(links), transaction_state["inside"]))

    monkeypatch.setattr(run_pipeline, "upsert_molecule", upsert_molecule)
    monkeypatch.setattr(run_pipeline, "upsert_food", upsert_food)
    monkeypatch.setattr(run_pipeline, "link_food_molecules", link_food_molecules)

    result = run_pipeline.run_pipeline(
        foods_dir=SimpleNamespace(),
        molecules_dir=SimpleNamespace(),
        dry_run=False,
    )

    assert result == {"status": "success", "foods": 1, "molecules": 1}
    assert transaction_state["entered"] == 1
    assert transaction_state["exited"] == 1
    assert write_events == [
        ("molecule", "fiber", True),
        ("food", "apple", True),
        ("link", "apple", 1, True),
    ]
