"""Versioned chart configuration schema, validation, and inheritance helpers."""

from copy import deepcopy
from functools import lru_cache
import json
from pathlib import Path
import re
from urllib.parse import quote


SCHEMA_PATH = Path(__file__).with_name("chart_schema.json")
HEX_COLOR = re.compile(r"^#[0-9A-Fa-f]{6}$")
SAFE_FAMILY = re.compile(r"^[a-z][a-z0-9_]{0,39}$")
UNSAFE_KEYS = {"__proto__", "prototype", "constructor"}
LEGACY_CHART_BACKGROUND = "#FFFFFF"
LEGACY_CHART_PALETTE = ["#1B3F7E", "#F57C00", "#238A57", "#2D72B8", "#6B4AA0"]


@lru_cache(maxsize=1)
def load_schema():
    """Return the packaged canonical chart schema."""
    return json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))


def property_definitions():
    """Yield dotted property paths with their canonical definitions."""
    for group, fields in load_schema()["groups"].items():
        for key, definition in fields.items():
            yield f"{group}.{key}", definition


class ChartConfigError(ValueError):
    """Raised when a persisted chart payload violates the canonical schema."""

    def __init__(self, errors):
        self.errors = list(errors)
        super().__init__(
            "; ".join(f"{path}: {message}" for path, message in self.errors)
        )


def system_defaults():
    """Return nested built-in values from the schema."""
    return {
        group: {key: deepcopy(definition["default"]) for key, definition in fields.items()}
        for group, fields in load_schema()["groups"].items()
    }


def _record(errors, strict, path, message):
    if strict:
        errors.append((path, message))


def _number(value, definition, path, strict, errors, integer=False, optional=False):
    if value is None and optional:
        return None
    if isinstance(value, bool):
        _record(errors, strict, path, "must be a number")
        return deepcopy(definition["default"])
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        _record(errors, strict, path, "must be a number")
        return deepcopy(definition["default"])
    low = definition.get("min")
    high = definition.get("max")
    if low is not None and parsed < low:
        _record(errors, strict, path, f"must be at least {low}")
        parsed = low
    if high is not None and parsed > high:
        _record(errors, strict, path, f"must be at most {high}")
        parsed = high
    return int(round(parsed)) if integer else parsed


def _validate_value(value, definition, path, strict, errors):
    value_type = definition["type"]
    if value_type in {"color", "optional_color"}:
        text = str(value or "")
        if not text and value_type == "optional_color":
            return ""
        if not HEX_COLOR.fullmatch(text):
            _record(errors, strict, path, "must be a six-digit hex color")
            return deepcopy(definition["default"])
        return text.upper()
    if value_type == "boolean":
        if isinstance(value, bool):
            return value
        if value in (0, 1):
            return bool(value)
        _record(errors, strict, path, "must be a boolean")
        return bool(definition["default"])
    if value_type == "integer":
        return _number(value, definition, path, strict, errors, integer=True)
    if value_type == "number":
        return _number(value, definition, path, strict, errors)
    if value_type == "optional_number":
        return _number(value, definition, path, strict, errors, optional=True)
    if value_type == "enum":
        if value not in definition["values"]:
            _record(errors, strict, path, "is not an allowed value")
            return deepcopy(definition["default"])
        return value
    if value_type == "text":
        text = str(value or "")
        limit = int(definition.get("max_length", 200))
        if len(text) > limit:
            _record(errors, strict, path, f"must be at most {limit} characters")
            text = text[:limit]
        return text
    if value_type == "palette":
        if not isinstance(value, list):
            _record(errors, strict, path, "must be a color list")
            return deepcopy(definition["default"])
        colors = []
        for index, item in enumerate(value[: int(definition.get("max_items", 8))]):
            if HEX_COLOR.fullmatch(str(item or "")):
                colors.append(str(item).upper())
            else:
                _record(errors, strict, f"{path}.{index}", "must be a six-digit hex color")
        if not colors:
            _record(errors, strict, path, "must contain at least one color")
            return deepcopy(definition["default"])
        return colors
    _record(errors, strict, path, "has an unsupported schema type")
    return deepcopy(definition["default"])


def _validate_group(group_name, values, path, strict, errors):
    definitions = load_schema()["groups"].get(group_name)
    if definitions is None or not isinstance(values, dict):
        _record(errors, strict, path, "must be a known property group")
        return {}
    clean = {}
    for key, value in values.items():
        field_path = f"{path}.{key}"
        if key in UNSAFE_KEYS or key not in definitions:
            _record(errors, strict, field_path, "is not an allowed property")
            continue
        clean[key] = _validate_value(value, definitions[key], field_path, strict, errors)
    if group_name == "axes":
        low = clean.get("y_min")
        high = clean.get("y_max")
        if low is not None and high is not None and low >= high:
            _record(errors, strict, path, "minimum must be lower than maximum")
            clean.pop("y_min", None)
            clean.pop("y_max", None)
    return clean


def _prune(value):
    if not isinstance(value, dict):
        return value
    cleaned = {}
    for key, item in value.items():
        item = _prune(item)
        if item != {}:
            cleaned[key] = item
    return cleaned


def _validate_owned_groups(values, path, strict, errors, allow_series=False):
    if not isinstance(values, dict):
        _record(errors, strict, path, "must be an object")
        return {}
    clean = {}
    for group, group_values in values.items():
        group_path = f"{path}.{group}"
        if group in UNSAFE_KEYS:
            _record(errors, strict, group_path, "is not an allowed property")
            continue
        if allow_series and group == "series":
            if not isinstance(group_values, dict):
                _record(errors, strict, group_path, "must be an object")
                continue
            series = {}
            for series_key, series_values in group_values.items():
                if series_key in UNSAFE_KEYS or not isinstance(series_key, str):
                    _record(errors, strict, f"{group_path}.{series_key}", "has an unsafe series key")
                    continue
                validated = _validate_group(
                    "series_defaults",
                    series_values,
                    f"{group_path}.{series_key}",
                    strict,
                    errors,
                )
                validated.pop("palette", None)
                if validated:
                    series[series_key] = validated
            if series:
                clean[group] = series
            continue
        validated = _validate_group(group, group_values, group_path, strict, errors)
        if validated:
            clean[group] = validated
    return clean


def encode_identity(family, *segments):
    """Encode chart identity segments without delimiter collisions."""
    family = str(family or "")
    if not SAFE_FAMILY.fullmatch(family):
        raise ChartConfigError([("chart_id", "has an invalid family")])
    encoded = ["v1", family]
    for segment in segments:
        text = str(segment)
        if not text:
            raise ChartConfigError([("chart_id", "contains an empty segment")])
        encoded.append(f"{len(text)}:{text}")
    return "|".join(encoded)


def decode_identity(value):
    """Decode and validate a versioned length-prefixed chart identity."""
    text = str(value or "")
    if not text.startswith("v1|"):
        raise ChartConfigError([("chart_id", "has an unsupported identity version")])
    position = 3
    family_end = text.find("|", position)
    if family_end < 0:
        raise ChartConfigError([("chart_id", "is incomplete")])
    family = text[position:family_end]
    if not SAFE_FAMILY.fullmatch(family):
        raise ChartConfigError([("chart_id", "has an invalid family")])
    position = family_end + 1
    segments = []
    while position < len(text):
        colon = text.find(":", position)
        if colon < 0 or not text[position:colon].isdigit():
            raise ChartConfigError([("chart_id", "has an invalid segment length")])
        length = int(text[position:colon])
        start = colon + 1
        end = start + length
        if length < 1 or end > len(text):
            raise ChartConfigError([("chart_id", "has an invalid segment")])
        segments.append(text[start:end])
        position = end
        if position < len(text):
            if text[position] != "|":
                raise ChartConfigError([("chart_id", "has trailing segment data")])
            position += 1
    if not segments:
        raise ChartConfigError([("chart_id", "must include a source segment")])
    return family, segments


def stable_series_key(kind, source_key):
    """Return a persistent series key or None for unnamed runtime-only series."""
    kind = str(kind or "")
    source = str(source_key or "")
    if not SAFE_FAMILY.fullmatch(kind) or not source:
        return None
    return f"{kind}:{quote(source, safe='')}"


def _migrate_legacy(result):
    defaults = deepcopy(result.get("chart_defaults") or {})
    background = str(result.get("chart_background") or LEGACY_CHART_BACKGROUND)
    palette = result.get("chart_palette") or LEGACY_CHART_PALETTE
    if background != LEGACY_CHART_BACKGROUND:
        defaults.setdefault("surface", {}).setdefault("background", background)
    if palette != LEGACY_CHART_PALETTE:
        defaults.setdefault("series_defaults", {}).setdefault("palette", palette)
    result["chart_defaults"] = defaults
    result["chart_system_version"] = load_schema()["version"]
    return result


def _sync_legacy_projections(result):
    defaults = result.get("chart_defaults") or {}
    result["chart_background"] = (
        defaults.get("surface", {}).get("background") or LEGACY_CHART_BACKGROUND
    )
    result["chart_palette"] = deepcopy(
        defaults.get("series_defaults", {}).get("palette") or LEGACY_CHART_PALETTE
    )


def normalize_payload(raw, *, strict=False):
    """Normalize chart fields while preserving unrelated theme configuration."""
    result = deepcopy(raw) if isinstance(raw, dict) else {}
    errors = []
    version = result.get("chart_system_version")
    if version is None:
        result = _migrate_legacy(result)
    elif version != load_schema()["version"]:
        _record(errors, strict, "chart_system_version", "is not supported")
        result["chart_system_version"] = load_schema()["version"]
        result["chart_defaults"] = {}
        result["chart_overrides"] = {}

    result["chart_defaults"] = _validate_owned_groups(
        result.get("chart_defaults") or {}, "chart_defaults", strict, errors
    )
    raw_overrides = result.get("chart_overrides") or {}
    overrides = {}
    if not isinstance(raw_overrides, dict):
        _record(errors, strict, "chart_overrides", "must be an object")
    else:
        for chart_id, values in raw_overrides.items():
            try:
                decode_identity(chart_id)
            except ChartConfigError as error:
                _record(errors, strict, f"chart_overrides.{chart_id}", str(error))
                continue
            clean = _validate_owned_groups(
                values, f"chart_overrides.{chart_id}", strict, errors, allow_series=True
            )
            if clean:
                overrides[chart_id] = clean
    result["chart_overrides"] = overrides
    result["chart_system_version"] = load_schema()["version"]
    _sync_legacy_projections(result)
    if errors:
        raise ChartConfigError(errors)
    return result


def _deep_overlay(base, owned):
    result = deepcopy(base)
    for key, value in (owned or {}).items():
        if isinstance(value, dict) and isinstance(result.get(key), dict):
            result[key] = _deep_overlay(result[key], value)
        else:
            result[key] = deepcopy(value)
    return result


def _mark_ownership(mapping, values, owner, prefix=""):
    for key, value in (values or {}).items():
        path = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict):
            _mark_ownership(mapping, value, owner, path)
        else:
            mapping[path] = owner


def resolve_chart(config, chart_id):
    """Resolve system, global, and explicit individual chart values."""
    normalized = normalize_payload(config)
    effective = system_defaults()
    ownership = {}
    _mark_ownership(ownership, effective, "system")
    global_values = normalized.get("chart_defaults") or {}
    effective = _deep_overlay(effective, global_values)
    _mark_ownership(ownership, global_values, "global")
    individual = (normalized.get("chart_overrides") or {}).get(chart_id, {})
    series = individual.get("series") or {}
    non_series = {key: value for key, value in individual.items() if key != "series"}
    effective = _deep_overlay(effective, non_series)
    _mark_ownership(ownership, non_series, "individual")
    if series:
        effective["series"] = {}
        for series_key, values in series.items():
            effective["series"][series_key] = _deep_overlay(
                effective.get("series_defaults", {}), values
            )
        _mark_ownership(ownership, {"series": series}, "individual")
    return effective, ownership


def _delete_path(target, parts):
    if not isinstance(target, dict) or not parts or parts[0] not in target:
        return
    if len(parts) == 1:
        target.pop(parts[0], None)
        return
    _delete_path(target[parts[0]], parts[1:])
    if target.get(parts[0]) == {}:
        target.pop(parts[0], None)


def reset_property(config, chart_id, property_path):
    result = normalize_payload(config)
    owned = result.get("chart_overrides", {}).get(chart_id)
    if owned:
        _delete_path(owned, str(property_path or "").split("."))
        if not owned:
            result["chart_overrides"].pop(chart_id, None)
    return normalize_payload(result)


def reset_chart(config, chart_id=None):
    result = normalize_payload(config)
    target = chart_id or next(iter(result.get("chart_overrides", {})), None)
    if target:
        result["chart_overrides"].pop(target, None)
    return normalize_payload(result)


def reset_global(config):
    result = normalize_payload(config)
    result["chart_defaults"] = {}
    _sync_legacy_projections(result)
    return normalize_payload(result)
