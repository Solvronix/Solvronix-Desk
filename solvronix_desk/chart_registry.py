"""Permission-filtered chart source discovery for Theme Studio."""

from __future__ import annotations

try:
    import frappe
except ModuleNotFoundError:  # Standalone unit tests inject a bounded fake.
    frappe = None

from solvronix_desk import chart_config


SAFE_DESCRIPTOR_FIELDS = {
    "id",
    "family",
    "label",
    "context",
    "available",
    "preview_kind",
    "requires_filters",
    "requires_runtime_preview",
}


def _rows(client, doctype, fields):
    getter = getattr(client, "get_list", None) or getattr(client, "get_all")
    try:
        return getter(
            doctype,
            fields=fields,
            order_by="name asc",
            limit_page_length=500,
        )
    except Exception:
        try:
            return getter(
                doctype,
                fields=["name"],
                order_by="name asc",
                limit_page_length=500,
            )
        except Exception:
            return []


def _allowed(client, doctype, name, user):
    try:
        return bool(client.has_permission(doctype, ptype="read", doc=name, user=user))
    except TypeError:
        try:
            return bool(client.has_permission(doctype, "read", name, user=user))
        except Exception:
            return False
    except Exception:
        return False


def _descriptor(family, name, label, context, preview_kind, **extra):
    segments = [name]
    if family == "dashboard_graph":
        segments.append("default")
    entry = {
        "id": chart_config.encode_identity(family, *segments),
        "family": family,
        "label": str(label or name),
        "context": str(context or ""),
        "available": True,
        "preview_kind": preview_kind,
    }
    entry.update(extra)
    return {key: value for key, value in entry.items() if key in SAFE_DESCRIPTOR_FIELDS}


def dashboard_chart_sources(user, client):
    entries = []
    for row in _rows(client, "Dashboard Chart", ["name", "chart_name", "chart_type", "type"]):
        name = str(row.get("name") or "")
        if name and _allowed(client, "Dashboard Chart", name, user):
            entries.append(
                _descriptor(
                    "dashboard_chart",
                    name,
                    row.get("chart_name") or name,
                    row.get("type") or row.get("chart_type") or "Dashboard Chart",
                    "dashboard_chart",
                    requires_runtime_preview=False,
                )
            )
    return entries


def dashboard_graph_sources(user, client):
    entries = []
    for row in _rows(client, "Dashboard", ["name", "dashboard_name"]):
        name = str(row.get("name") or "")
        if name and _allowed(client, "Dashboard", name, user):
            entries.append(
                _descriptor(
                    "dashboard_graph",
                    name,
                    row.get("dashboard_name") or name,
                    "Dashboard Graph",
                    "dashboard",
                    requires_runtime_preview=True,
                )
            )
    return entries


def number_card_sources(user, client):
    entries = []
    for row in _rows(client, "Number Card", ["name", "label"]):
        name = str(row.get("name") or "")
        if name and _allowed(client, "Number Card", name, user):
            entries.append(
                _descriptor(
                    "number_card",
                    name,
                    row.get("label") or name,
                    "Number Card",
                    "number_card",
                    requires_runtime_preview=False,
                )
            )
    return entries


def report_chart_sources(user, client):
    entries = []
    fields = ["name", "report_type", "ref_doctype"]
    for row in _rows(client, "Report", fields):
        name = str(row.get("name") or "")
        if name and _allowed(client, "Report", name, user):
            entries.append(
                _descriptor(
                    "report_chart",
                    name,
                    name,
                    row.get("ref_doctype") or row.get("report_type") or "Report",
                    "report",
                    requires_runtime_preview=True,
                    requires_filters=False,
                )
            )
    return entries


def opaque_stale_entries(configured_ids, visible_ids):
    visible = set(visible_ids)
    entries = []
    for chart_id in configured_ids or []:
        if chart_id in visible:
            continue
        try:
            chart_config.decode_identity(chart_id)
        except chart_config.ChartConfigError:
            continue
        entries.append({"id": chart_id, "available": False})
    return entries


def list_chart_sources(user=None, configured_ids=None, frappe_module=None):
    """Return safe descriptors for sources readable by the current manager."""
    client = frappe_module or frappe
    if client is None:
        return []
    user = user or getattr(getattr(client, "session", None), "user", None)
    entries = []
    for loader in (
        dashboard_chart_sources,
        dashboard_graph_sources,
        number_card_sources,
        report_chart_sources,
    ):
        entries.extend(loader(user, client))
    entries.sort(key=lambda item: (item.get("family", ""), item.get("label", "")))
    entries.extend(opaque_stale_entries(configured_ids, [item["id"] for item in entries]))
    return entries
