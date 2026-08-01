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


if __name__ == "__main__":
    unittest.main()
