"""Database fields used by nutrii models."""

from __future__ import annotations

import json

from django.contrib.postgres.fields import ArrayField


class PortableArrayField(ArrayField):
    """Postgres ArrayField with a SQLite JSON-text fallback for local tests."""

    def db_type(self, connection):
        if connection.vendor == "postgresql":
            return super().db_type(connection)
        return "text"

    def cast_db_type(self, connection):
        if connection.vendor == "postgresql":
            return super().cast_db_type(connection)
        return "text"

    def get_placeholder(self, value, compiler, connection):
        if connection.vendor == "postgresql":
            return super().get_placeholder(value, compiler, connection)
        return "%s"

    def get_prep_value(self, value):
        prepared = super().get_prep_value(value)
        if prepared is None:
            return None
        return prepared

    def get_db_prep_value(self, value, connection, prepared=False):
        if connection.vendor == "postgresql":
            return super().get_db_prep_value(value, connection, prepared=prepared)
        if value is None:
            return None
        if isinstance(value, str):
            return value
        return json.dumps(list(value))

    def from_db_value(self, value, expression, connection):
        if connection.vendor == "postgresql" or value is None:
            return value
        return self._loads(value)

    def to_python(self, value):
        if value is None or isinstance(value, list):
            return value
        if isinstance(value, str):
            return self._loads(value)
        return super().to_python(value)

    @staticmethod
    def _loads(value):
        if value == "":
            return []
        try:
            loaded = json.loads(value)
        except (TypeError, json.JSONDecodeError):
            return []
        return loaded if isinstance(loaded, list) else []
