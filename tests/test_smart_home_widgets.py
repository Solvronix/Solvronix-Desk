from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "solvronix_desk" / "solvronix_desk" / "page" / "smart_home" / "smart_home.js"
CSS = ROOT / "solvronix_desk" / "public" / "css" / "smart_home.css"
HOOKS = ROOT / "solvronix_desk" / "hooks.py"


class SmartHomeWidgetsTest(unittest.TestCase):
    def test_dashboard_is_built_from_reorderable_widgets(self):
        js = JS.read_text(encoding="utf-8")

        self.assertIn("st-sh-widget-grid", js)
        self.assertIn('data-widget-id="', js)
        self.assertIn('draggable="false"', js)
        self.assertIn("dragstart.st_sh_layout", js)
        self.assertIn("dragover.st_sh_layout", js)
        self.assertIn("drop.st_sh_layout", js)
        self.assertIn("st_smart_home_layout_v2::", js)

    def test_layout_has_customize_reset_and_accessible_move_controls(self):
        js = JS.read_text(encoding="utf-8")

        self.assertIn("Customize layout", js)
        self.assertIn("Reset your Smart Home widget order?", js)
        self.assertIn("Move backward", js)
        self.assertIn("Move forward", js)
        self.assertIn('aria-live="polite"', js)

    def test_widget_grid_is_responsive_and_theme_aware(self):
        css = CSS.read_text(encoding="utf-8")

        self.assertIn("grid-template-columns: repeat(12", css)
        self.assertIn('[data-widget-size="quarter"]', css)
        self.assertIn('[data-widget-size="wide"]', css)
        self.assertIn("html[data-theme=\"dark\"]", css)
        self.assertIn("@media (max-width: 560px)", css)
        self.assertIn("@media (prefers-reduced-motion: reduce)", css)

    def test_smart_home_asset_cache_is_bumped(self):
        hooks = HOOKS.read_text(encoding="utf-8")
        self.assertIn("/assets/solvronix_desk/css/smart_home.css?v=3", hooks)


if __name__ == "__main__":
    unittest.main()
