"""Permission-safe, normalized ERPNext data for Theme Studio chart previews."""

from __future__ import annotations

import math

from solvronix_desk import chart_config


CHART_TYPES = {
    "bar": "bar",
    "pie": "donut",
    "donut": "donut",
    "percentage": "donut",
}


def _kind(value):
    return CHART_TYPES.get(str(value or "").lower(), "line")


def _number(value):
    try:
        result = float(value or 0)
    except (TypeError, ValueError):
        return 0.0
    return result if math.isfinite(result) else 0.0


def _normalise_chart_data(payload, kind):
    payload = payload or {}
    if isinstance(payload, dict) and isinstance(payload.get("chart"), dict):
        payload = payload["chart"].get("data") or payload
    labels = [str(value or "")[:120] for value in (payload.get("labels") or [])[:60]]
    datasets = []
    for index, dataset in enumerate((payload.get("datasets") or [])[:12]):
        if not isinstance(dataset, dict):
            continue
        values = [_number(value) for value in (dataset.get("values") or [])[:60]]
        if labels:
            values = (values + [0.0] * len(labels))[:len(labels)]
        datasets.append({
            "name": str(dataset.get("name") or dataset.get("label") or f"Series {index + 1}")[:120],
            "values": values,
        })
    if not labels or not datasets or not any(dataset["values"] for dataset in datasets):
        return {"status": "empty", "kind": kind}
    return {"status": "ready", "kind": kind, "labels": labels, "datasets": datasets}


def _default_loaders():
    from frappe.desk.doctype.dashboard_chart.dashboard_chart import get as get_dashboard_chart
    from frappe.desk.doctype.number_card.number_card import get_result as get_number_card

    return {"dashboard_chart": get_dashboard_chart, "number_card": get_number_card}


def _readable_document(client, doctype, name):
    document = client.get_doc(doctype, name)
    checker = getattr(document, "check_permission", None)
    if checker:
        checker("read")
    elif not client.has_permission(doctype, ptype="read", doc=name):
        raise PermissionError("not permitted")
    return document


def get_preview(chart_id, frappe_module=None, loaders=None):
    """Load real data only for sources that Frappe can safely run without UI filters."""
    if frappe_module is None:
        import frappe as frappe_module

    family, segments = chart_config.decode_identity(chart_id)
    source_name = segments[0]
    loaders = loaders or _default_loaders()

    if family == "dashboard_chart":
        document = _readable_document(frappe_module, "Dashboard Chart", source_name)
        kind = _kind(getattr(document, "type", ""))
        if str(getattr(document, "chart_type", "")) in {"Custom", "Report"}:
            return {"status": "runtime_required", "kind": kind}
        payload = loaders["dashboard_chart"](chart_name=source_name)
        return _normalise_chart_data(payload, kind)

    if family == "number_card":
        document = _readable_document(frappe_module, "Number Card", source_name)
        if str(getattr(document, "type", "")) != "Document Type":
            return {"status": "runtime_required", "kind": "sparkline"}
        source = document.as_dict() if hasattr(document, "as_dict") else document
        value = loaders["number_card"](
            doc=source,
            filters=getattr(document, "filters_json", None) or "[]",
        )
        return {
            "status": "ready",
            "kind": "sparkline",
            "value": _number(value),
            "label": str(getattr(document, "label", None) or source_name)[:120],
        }

    return {"status": "runtime_required", "kind": "line"}
