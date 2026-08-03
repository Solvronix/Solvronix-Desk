"""Unit coverage for the schema-driven chart configuration layer."""

import unittest

from solvronix_desk import chart_config


class ChartSchemaTest(unittest.TestCase):
    def test_schema_has_one_versioned_definition_for_required_groups(self):
        schema = chart_config.load_schema()

        self.assertEqual(schema["version"], 1)
        self.assertEqual(
            set(schema["groups"]),
            {
                "chart",
                "surface",
                "series_defaults",
                "axes",
                "legend",
                "labels",
                "tooltip",
                "animation",
                "interaction",
                "advanced",
            },
        )

    def test_each_property_declares_default_type_and_applicability(self):
        for group in chart_config.load_schema()["groups"].values():
            for definition in group.values():
                self.assertTrue(
                    {"type", "default", "applies_to"} <= set(definition),
                    definition,
                )

    def test_schema_exposes_all_approved_control_families(self):
        paths = {path for path, _definition in chart_config.property_definitions()}

        for path in (
            "chart.type",
            "chart.height",
            "series_defaults.color",
            "series_defaults.line_width",
            "series_defaults.bar_radius",
            "axes.x_visible",
            "axes.y_min",
            "legend.position",
            "labels.decimals",
            "tooltip.shared",
            "animation.duration",
            "interaction.hover_emphasis",
            "surface.background",
            "advanced.truncateLegends",
        ):
            self.assertIn(path, paths)


class ChartConfigurationTest(unittest.TestCase):
    def test_legacy_colors_migrate_once_and_global_reset_does_not_reseed(self):
        migrated = chart_config.normalize_payload(
            {"chart_background": "#112233", "chart_palette": ["#445566"]}
        )

        self.assertEqual(migrated["chart_system_version"], 1)
        self.assertEqual(
            migrated["chart_defaults"]["surface"]["background"], "#112233"
        )
        self.assertEqual(
            migrated["chart_defaults"]["series_defaults"]["palette"],
            ["#445566"],
        )

        reset = chart_config.reset_global(migrated)
        self.assertEqual(reset["chart_defaults"], {})
        self.assertEqual(reset["chart_background"], "#FFFFFF")
        self.assertEqual(
            chart_config.normalize_payload(reset)["chart_defaults"], {}
        )

    def test_equal_valued_individual_override_remains_owned_until_reset(self):
        chart_id = chart_config.encode_identity("dashboard_chart", "Test")
        config = chart_config.normalize_payload(
            {
                "chart_system_version": 1,
                "chart_defaults": {"chart": {"height": 300}},
                "chart_overrides": {chart_id: {"chart": {"height": 300}}},
            }
        )

        effective, ownership = chart_config.resolve_chart(config, chart_id)

        self.assertEqual(effective["chart"]["height"], 300)
        self.assertEqual(ownership["chart.height"], "individual")
        changed_global = chart_config.normalize_payload(
            {**config, "chart_defaults": {"chart": {"height": 420}}}
        )
        effective, ownership = chart_config.resolve_chart(changed_global, chart_id)
        self.assertEqual(effective["chart"]["height"], 300)
        self.assertEqual(ownership["chart.height"], "individual")

    def test_property_and_chart_reset_prune_only_explicit_ownership(self):
        chart_id = chart_config.encode_identity("dashboard_chart", "Sales")
        config = chart_config.normalize_payload(
            {
                "chart_system_version": 1,
                "chart_overrides": {
                    chart_id: {
                        "chart": {"height": 320, "responsive": False},
                        "surface": {"background": "#ABCDEF"},
                    }
                },
            }
        )

        reset_one = chart_config.reset_property(config, chart_id, "chart.height")
        self.assertNotIn(
            "height", reset_one["chart_overrides"][chart_id]["chart"]
        )
        self.assertFalse(
            reset_one["chart_overrides"][chart_id]["chart"]["responsive"]
        )
        self.assertEqual(chart_config.reset_chart(reset_one)["chart_overrides"], {})

    def test_strict_validation_rejects_unknown_unsafe_and_invalid_relationships(self):
        bad_payloads = [
            {"chart_system_version": 99},
            {
                "chart_system_version": 1,
                "chart_defaults": {"advanced": {"__proto__": {}}},
            },
            {
                "chart_system_version": 1,
                "chart_defaults": {"chart": {"height": 9999}},
            },
            {
                "chart_system_version": 1,
                "chart_defaults": {"axes": {"y_min": 10, "y_max": 5}},
            },
        ]

        for payload in bad_payloads:
            with self.subTest(payload=payload):
                with self.assertRaises(chart_config.ChartConfigError):
                    chart_config.normalize_payload(payload, strict=True)

    def test_non_strict_reads_drop_unknown_values_and_clamp_numbers(self):
        config = chart_config.normalize_payload(
            {
                "chart_system_version": 1,
                "chart_defaults": {
                    "chart": {"height": 9999, "unknown": "discard"},
                    "advanced": {"unknown": "discard"},
                },
            }
        )

        self.assertEqual(config["chart_defaults"]["chart"]["height"], 900)
        self.assertNotIn("unknown", config["chart_defaults"]["chart"])
        self.assertEqual(config["chart_defaults"].get("advanced", {}), {})

    def test_stable_identity_round_trips_punctuation_and_unicode(self):
        encoded = chart_config.encode_identity(
            "report_chart", "Sales: پاکستان", "gross|margin"
        )

        self.assertEqual(
            chart_config.decode_identity(encoded),
            ("report_chart", ["Sales: پاکستان", "gross|margin"]),
        )
        with self.assertRaises(chart_config.ChartConfigError):
            chart_config.decode_identity("dashboard_chart:unsafe")

    def test_series_keys_use_source_metadata_not_labels(self):
        first = chart_config.stable_series_key("dataset", "net_total")
        translated = chart_config.stable_series_key("dataset", "net_total")

        self.assertEqual(first, translated)
        self.assertIsNone(chart_config.stable_series_key("dataset", ""))


if __name__ == "__main__":
    unittest.main()
