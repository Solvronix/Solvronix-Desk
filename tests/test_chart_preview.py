"""Permission-safe ERPNext data loading for Theme Studio chart previews."""

import types
import unittest

from solvronix_desk import chart_config, chart_preview


class FakeDocument(types.SimpleNamespace):
    def check_permission(self, permtype="read"):
        if permtype != "read" or getattr(self, "denied", False):
            raise PermissionError("not permitted")

    def as_dict(self):
        return dict(self.__dict__)


class FakeFrappe(types.SimpleNamespace):
    def __init__(self, documents):
        super().__init__()
        self.documents = documents

    def get_doc(self, doctype, name):
        return self.documents[(doctype, name)]


class ChartPreviewTest(unittest.TestCase):
    def test_dashboard_chart_returns_normalized_real_erpnext_data(self):
        chart_id = chart_config.encode_identity("dashboard_chart", "Sales Trend")
        document = FakeDocument(
            name="Sales Trend", chart_name="Sales Trend", chart_type="Count", type="Bar"
        )
        fake = FakeFrappe({("Dashboard Chart", "Sales Trend"): document})
        calls = []

        result = chart_preview.get_preview(
            chart_id,
            frappe_module=fake,
            loaders={
                "dashboard_chart": lambda **kwargs: calls.append(kwargs) or {
                    "labels": ["Jan", "Feb"],
                    "datasets": [{"name": "Invoices", "values": [12, 19]}],
                }
            },
        )

        self.assertEqual(calls, [{"chart_name": "Sales Trend"}])
        self.assertEqual(result["status"], "ready")
        self.assertEqual(result["kind"], "bar")
        self.assertEqual(result["labels"], ["Jan", "Feb"])
        self.assertEqual(result["datasets"][0]["values"], [12.0, 19.0])

    def test_runtime_dependent_dashboard_chart_falls_back_without_executing_source(self):
        chart_id = chart_config.encode_identity("dashboard_chart", "Custom Revenue")
        document = FakeDocument(
            name="Custom Revenue", chart_name="Custom Revenue", chart_type="Custom", type="Line"
        )
        fake = FakeFrappe({("Dashboard Chart", "Custom Revenue"): document})
        calls = []

        result = chart_preview.get_preview(
            chart_id,
            frappe_module=fake,
            loaders={"dashboard_chart": lambda **kwargs: calls.append(kwargs)},
        )

        self.assertEqual(calls, [])
        self.assertEqual(result, {"status": "runtime_required", "kind": "line"})

    def test_number_card_returns_real_current_value(self):
        chart_id = chart_config.encode_identity("number_card", "Open Orders")
        document = FakeDocument(
            name="Open Orders", label="Open Orders", type="Document Type", filters_json="[]"
        )
        fake = FakeFrappe({("Number Card", "Open Orders"): document})

        result = chart_preview.get_preview(
            chart_id,
            frappe_module=fake,
            loaders={"number_card": lambda **kwargs: 37},
        )

        self.assertEqual(result["status"], "ready")
        self.assertEqual(result["kind"], "sparkline")
        self.assertEqual(result["value"], 37.0)
        self.assertEqual(result["label"], "Open Orders")

    def test_read_permission_is_checked_before_loading_data(self):
        chart_id = chart_config.encode_identity("dashboard_chart", "Secret")
        document = FakeDocument(
            name="Secret", chart_type="Count", type="Line", denied=True
        )
        fake = FakeFrappe({("Dashboard Chart", "Secret"): document})
        calls = []

        with self.assertRaises(PermissionError):
            chart_preview.get_preview(
                chart_id,
                frappe_module=fake,
                loaders={"dashboard_chart": lambda **kwargs: calls.append(kwargs)},
            )

        self.assertEqual(calls, [])


if __name__ == "__main__":
    unittest.main()
