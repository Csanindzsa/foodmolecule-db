from django.db import migrations


TRIGRAM_INDEX_SQL = [
    "CREATE EXTENSION IF NOT EXISTS pg_trgm",
    "CREATE INDEX IF NOT EXISTS idx_food_name_trgm ON core_food USING GIN (name gin_trgm_ops)",
    "CREATE INDEX IF NOT EXISTS idx_molecule_name_trgm ON core_molecule USING GIN (name gin_trgm_ops)",
    "CREATE INDEX IF NOT EXISTS idx_study_title_trgm ON core_study USING GIN (title gin_trgm_ops)",
]

DROP_TRIGRAM_INDEX_SQL = [
    "DROP INDEX IF EXISTS idx_study_title_trgm",
    "DROP INDEX IF EXISTS idx_molecule_name_trgm",
    "DROP INDEX IF EXISTS idx_food_name_trgm",
]


def create_trigram_indexes(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    for sql in TRIGRAM_INDEX_SQL:
        schema_editor.execute(sql)


def drop_trigram_indexes(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    for sql in DROP_TRIGRAM_INDEX_SQL:
        schema_editor.execute(sql)


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0002_molecule_classification_reasoning"),
    ]

    operations = [
        migrations.RunPython(create_trigram_indexes, drop_trigram_indexes),
    ]
