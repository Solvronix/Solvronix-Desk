"""Versioned chart configuration schema and inheritance helpers."""

from functools import lru_cache
import json
from pathlib import Path


SCHEMA_PATH = Path(__file__).with_name("chart_schema.json")


@lru_cache(maxsize=1)
def load_schema():
    """Return the packaged canonical chart schema."""
    return json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))


def property_definitions():
    """Yield dotted property paths with their canonical definitions."""
    for group, fields in load_schema()["groups"].items():
        for key, definition in fields.items():
            yield f"{group}.{key}", definition
