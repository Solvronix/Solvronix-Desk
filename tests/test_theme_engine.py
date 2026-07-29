import importlib.util
from pathlib import Path
import sys
import types
import unittest


ROOT = Path(__file__).resolve().parents[1]
ENGINE_PATH = ROOT / "solvronix_desk" / "theme_engine.py"


class FrappeStub(types.ModuleType):
    def throw(self, message):
        raise ValueError(message)


def load_engine():
    previous = sys.modules.get("frappe")
    sys.modules["frappe"] = FrappeStub("frappe")
    try:
        spec = importlib.util.spec_from_file_location("theme_engine_test_module", ENGINE_PATH)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
    finally:
        if previous is None:
            sys.modules.pop("frappe", None)
        else:
            sys.modules["frappe"] = previous


ENGINE = load_engine()


class ThemeEngineTest(unittest.TestCase):
    def test_sanitize_clamps_rejects_invalid_colors_and_deduplicates_layout(self):
        config = ENGINE.sanitize_config(
            {
                "brand_color": "not-a-color",
                "sidebar_width": 999,
                "button_height": 1,
                "layout": ["chart", "chart", "metrics"],
            },
            validate_contrast=False,
        )
        self.assertEqual(config["brand_color"], ENGINE.DEFAULT_CONFIG["brand_color"])
        self.assertEqual(config["sidebar_width"], 360)
        self.assertEqual(config["button_height"], 26)
        self.assertEqual(config["layout"], ["chart", "metrics", "activity", "quick_actions"])

    def test_builtin_profiles_include_required_modes(self):
        profiles = {profile["id"]: profile for profile in ENGINE.builtin_profiles()}
        self.assertIn("builtin-light", profiles)
        self.assertIn("builtin-dark", profiles)
        self.assertIn("builtin-high-contrast", profiles)
        self.assertTrue(profiles["builtin-high-contrast"]["config"]["high_contrast"])
        for profile in profiles.values():
            self.assertEqual(
                ENGINE.wcag_failures(profile["config"]),
                [],
                f'{profile["name"]} should pass bundled WCAG checks',
            )

    def test_renderer_outputs_complete_runtime_tokens(self):
        css = ENGINE.render_css(ENGINE.DEFAULT_CONFIG)
        for token in (
            "--st-toolbar-bg", "--st-sidebar-bg", "--st-btn-primary",
            "--st-input-bg", "--st-font-family", "--st-row-height",
            "--st-chart-1", "--st-login-gradient", "--st-workspace-width",
        ):
            self.assertIn(token, css)
        self.assertIn(".btn-primary", css)
        self.assertIn(".list-row", css)
        self.assertIn("body:has(.for-login)", css)

    def test_wcag_checker_flags_low_contrast(self):
        config = dict(ENGINE.DEFAULT_CONFIG)
        config.update({"text_color": "#777777", "page_background": "#777777"})
        self.assertIn("Text / page", ENGINE.wcag_failures(config))

    def test_custom_css_cannot_escape_dynamic_style_element(self):
        config = ENGINE.sanitize_config(
            {
                "custom_css": ".safe{color:red}</STYLE><script>alert(1)</script>",
                "scoped_rules": [
                    {
                        "type": "Page",
                        "scope": "home",
                        "css": ".safe{color:blue}</style><img src=x>",
                    }
                ],
            },
            validate_contrast=False,
        )
        self.assertNotIn("</style", config["custom_css"].lower())
        self.assertNotIn("</style", config["scoped_rules"][0]["css"].lower())

    def test_assignment_maps_fail_soft_on_invalid_json_shapes(self):
        self.assertEqual(ENGINE.clean_string_map(["not", "a", "mapping"], 100), {})
        self.assertEqual(
            ENGINE.clean_string_map({"user@example.com": "builtin-dark"}, 180),
            {"user@example.com": "builtin-dark"},
        )


if __name__ == "__main__":
    unittest.main()
