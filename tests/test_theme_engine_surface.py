"""Behavior coverage for mode-aware Theme Studio surface resolution."""

import importlib.util
from pathlib import Path
import sys
import types
import unittest


ROOT = Path(__file__).resolve().parents[1]
ENGINE_PATH = ROOT / "solvronix_desk" / "theme_engine.py"


def load_engine():
    fake_frappe = types.SimpleNamespace(throw=lambda message: (_ for _ in ()).throw(ValueError(message)))
    previous = sys.modules.get("frappe")
    sys.modules["frappe"] = fake_frappe
    try:
        spec = importlib.util.spec_from_file_location("theme_engine_under_test", ENGINE_PATH)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
    finally:
        if previous is None:
            sys.modules.pop("frappe", None)
        else:
            sys.modules["frappe"] = previous


class ThemeSurfaceResolutionTest(unittest.TestCase):
    def test_light_surface_repairs_mixed_dark_tokens_individually(self):
        engine = load_engine()
        config = dict(engine.DEFAULT_CONFIG)
        config.update(
            preferred_mode="Light",
            page_background="#1A1D27",
            card_background="#FFFFFF",
            muted_text_color="#FFFFFF",
        )

        resolved = engine.resolve_mode_surface(config, dark=False)

        self.assertEqual(resolved["page_background"], engine.DEFAULT_CONFIG["page_background"])
        self.assertEqual(resolved["card_background"], "#FFFFFF")
        self.assertEqual(resolved["muted_text_color"], engine.DEFAULT_CONFIG["muted_text_color"])

    def test_dark_surface_derives_defaults_but_preserves_custom_colors(self):
        engine = load_engine()
        config = dict(engine.DEFAULT_CONFIG)
        config.update(
            preferred_mode="Dark",
            navbar_background="#5A214F",
            page_background="#203040",
            text_color="#FCEEDD",
        )

        resolved = engine.resolve_mode_surface(config, dark=True)

        self.assertEqual(resolved["navbar_background"], "#5A214F")
        self.assertEqual(resolved["page_background"], "#203040")
        self.assertEqual(resolved["text_color"], "#FCEEDD")
        self.assertEqual(resolved["card_background"], "#1A1D27")

    def test_published_dark_rule_preserves_explicit_navigation_foregrounds(self):
        engine = load_engine()
        config = dict(engine.DEFAULT_CONFIG)
        config.update(
            preferred_mode="Dark",
            toolbar_text_color="#FFD700",
            sidebar_text_color="#00FF00",
            sidebar_icon_color="#00AAFF",
        )

        css = engine.render_css(config)
        dark_rule = css.split('html[data-theme="dark"] {', 1)[1].split("}", 1)[0]

        self.assertIn("--st-toolbar-text: #FFD700", dark_rule)
        self.assertIn("--st-sidebar-text: #00FF00", dark_rule)
        self.assertIn("--st-sidebar-icon: #00AAFF", dark_rule)

    def test_every_builtin_profile_is_readable_in_dark_mode(self):
        engine = load_engine()
        for profile in engine.builtin_profiles():
            with self.subTest(profile=profile["id"]):
                dark = engine.resolve_mode_surface(profile["config"], dark=True)
                for key in ("page_background", "card_background", "table_header_color",
                            "alternate_row_color", "row_hover_color", "secondary_button_color"):
                    self.assertLess(engine.relative_luminance(dark[key]), 0.2, key)
                for background in ("page_background", "card_background"):
                    self.assertGreaterEqual(
                        engine.contrast_ratio(dark["text_color"], dark[background]), 4.5, background)
                for key in ("muted_text_color", "link_color"):
                    self.assertGreaterEqual(
                        engine.contrast_ratio(dark[key], dark["card_background"]), 3, key)

    def test_light_custom_profile_gets_dark_surfaces_and_keeps_link_hue(self):
        engine = load_engine()
        profile = next(p for p in engine.builtin_profiles() if p["id"] == "builtin-workspace")
        dark = engine.resolve_mode_surface(profile["config"], dark=True)

        self.assertNotEqual(dark["page_background"], "#F8F9FA")
        self.assertNotEqual(dark["text_color"], "#212529")
        self.assertNotEqual(dark["table_header_color"], "#FFFFFF")
        self.assertEqual(dark["navbar_background"], "#5E4B8B")
        # The teal link is lightened, not swapped for the default blue.
        self.assertNotEqual(dark["link_color"], "#6DB4F2")
        self.assertGreaterEqual(engine.contrast_ratio(dark["link_color"], dark["card_background"]), 4.5)

    def test_replaced_light_navbar_drops_its_dark_toolbar_text(self):
        engine = load_engine()
        config = dict(engine.DEFAULT_CONFIG)
        config.update(navbar_background="#F2F2F2", toolbar_text_color="#222222")

        dark = engine.resolve_mode_surface(config, dark=True)

        self.assertTrue(dark["navbar_background"].startswith("color-mix("))
        self.assertEqual(dark["toolbar_text_color"], "")


if __name__ == "__main__":
    unittest.main()
