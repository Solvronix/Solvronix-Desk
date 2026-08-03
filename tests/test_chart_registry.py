"""Permission and metadata coverage for Theme Studio chart discovery."""

import types
import unittest

from solvronix_desk import chart_config, chart_registry


class FakeFrappe(types.SimpleNamespace):
    def __init__(self):
        super().__init__()
        self.session = types.SimpleNamespace(user="manager@example.com")
        self.rows = {
            "Dashboard Chart": [
                {"name": "Allowed Chart", "chart_name": "Allowed Chart", "chart_type": "Count", "type": "Bar"},
                {"name": "Secret Chart", "chart_name": "Secret Chart", "chart_type": "Line"},
            ],
            "Dashboard": [{"name": "Sales Dashboard"}],
            "Number Card": [{"name": "Open Orders", "label": "Open Orders"}],
            "Report": [
                {"name": "Sales Analytics", "report_type": "Query Report", "ref_doctype": "Sales Invoice"},
                {"name": "Secret Report", "report_type": "Script Report", "ref_doctype": "Salary Slip"},
            ],
        }

    def get_all(self, doctype, **_kwargs):
        return list(self.rows.get(doctype, []))

    def has_permission(self, doctype, **kwargs):
        name = kwargs.get("doc")
        return not str(name).startswith("Secret")


class ChartRegistryTest(unittest.TestCase):
    def setUp(self):
        self.fake = FakeFrappe()

    def test_discovery_returns_only_permitted_safe_descriptors(self):
        entries = chart_registry.list_chart_sources(
            "manager@example.com", frappe_module=self.fake
        )

        labels = {entry.get("label") for entry in entries}
        self.assertIn("Allowed Chart", labels)
        self.assertIn("Sales Dashboard", labels)
        self.assertIn("Open Orders", labels)
        self.assertIn("Sales Analytics", labels)
        self.assertNotIn("Secret Chart", labels)
        self.assertNotIn("Secret Report", labels)
        allowed_chart = next(entry for entry in entries if entry.get("label") == "Allowed Chart")
        self.assertEqual(allowed_chart["context"], "Bar")
        for entry in entries:
            self.assertLessEqual(set(entry), chart_registry.SAFE_DESCRIPTOR_FIELDS)
            self.assertNotIn("query", entry)
            self.assertNotIn("script", entry)

    def test_dynamic_reports_require_guarded_runtime_preview(self):
        entries = chart_registry.list_chart_sources(
            "manager@example.com", frappe_module=self.fake
        )
        report = next(entry for entry in entries if entry.get("label") == "Sales Analytics")

        self.assertTrue(report["requires_runtime_preview"])
        self.assertEqual(report["preview_kind"], "report")

    def test_inaccessible_stale_override_is_opaque_and_deletable(self):
        stale_id = chart_config.encode_identity("dashboard_chart", "Deleted Salary Chart")

        entries = chart_registry.list_chart_sources(
            "manager@example.com",
            configured_ids=[stale_id],
            frappe_module=self.fake,
        )
        stale = next(entry for entry in entries if entry["id"] == stale_id)

        self.assertEqual(stale, {"id": stale_id, "available": False})

    def test_malformed_configured_identity_is_not_reflected(self):
        entries = chart_registry.list_chart_sources(
            "manager@example.com",
            configured_ids=["dashboard_chart:unsafe"],
            frappe_module=self.fake,
        )

        self.assertFalse(any(entry["id"] == "dashboard_chart:unsafe" for entry in entries))


if __name__ == "__main__":
    unittest.main()
