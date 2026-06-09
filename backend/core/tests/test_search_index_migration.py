import importlib
from types import SimpleNamespace


migration = importlib.import_module("core.migrations.0003_postgres_trigram_search_indexes")


class FakeSchemaEditor:
    def __init__(self, vendor: str):
        self.connection = SimpleNamespace(vendor=vendor)
        self.sql: list[str] = []

    def execute(self, sql: str) -> None:
        self.sql.append(sql)


def test_trigram_index_migration_skips_sqlite():
    schema_editor = FakeSchemaEditor("sqlite")

    migration.create_trigram_indexes(None, schema_editor)
    migration.drop_trigram_indexes(None, schema_editor)

    assert schema_editor.sql == []


def test_trigram_index_migration_creates_expected_postgres_indexes():
    schema_editor = FakeSchemaEditor("postgresql")

    migration.create_trigram_indexes(None, schema_editor)

    assert schema_editor.sql == [
        "CREATE EXTENSION IF NOT EXISTS pg_trgm",
        "CREATE INDEX IF NOT EXISTS idx_food_name_trgm ON core_food USING GIN (name gin_trgm_ops)",
        "CREATE INDEX IF NOT EXISTS idx_molecule_name_trgm ON core_molecule USING GIN (name gin_trgm_ops)",
        "CREATE INDEX IF NOT EXISTS idx_study_title_trgm ON core_study USING GIN (title gin_trgm_ops)",
    ]


def test_trigram_index_migration_drops_expected_postgres_indexes():
    schema_editor = FakeSchemaEditor("postgresql")

    migration.drop_trigram_indexes(None, schema_editor)

    assert schema_editor.sql == [
        "DROP INDEX IF EXISTS idx_study_title_trgm",
        "DROP INDEX IF EXISTS idx_molecule_name_trgm",
        "DROP INDEX IF EXISTS idx_food_name_trgm",
    ]
