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


if __name__ == "__main__":
    unittest.main()
