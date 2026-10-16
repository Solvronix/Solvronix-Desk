"""Regression coverage for the phone and tablet layout rules (2.6.0)."""

from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]
CSS_DIR = ROOT / "solvronix_desk" / "public" / "css"
JS_DIR = ROOT / "solvronix_desk" / "public" / "js"
STUDIO_JS = ROOT / "solvronix_desk" / "solvronix_desk" / "page" / "theme_studio" / "theme_studio.js"
ENGINE = ROOT / "solvronix_desk" / "theme_engine.py"


def css(name):
    return (CSS_DIR / name).read_text(encoding="utf-8")


class MobileLayoutTest(unittest.TestCase):
    def test_breakpoints_match_frappe_sm(self):
        # 768px is an iPad in portrait: Frappe treats it as tablet, so must we.
        for path in CSS_DIR.glob("*.css"):
            text = path.read_text(encoding="utf-8")
            self.assertNotIn("max-width: 768px", text, path.name)
            self.assertNotIn("min-width: 769px", text, path.name)

    def test_single_phone_block_sits_after_toolbar_base_rules(self):
        text = css("solvronix_desk.css")
        self.assertEqual(text.count("@media (max-width: 767.98px)"), 1)
        self.assertGreater(text.index("@media (max-width: 767.98px)"), text.index("#st-top-toolbar {"))

    def test_phone_inputs_do_not_trigger_zoom(self):
        text = css("solvronix_desk.css")
        phone = text[text.index("@media (max-width: 767.98px)"):]
        self.assertIn("body textarea:not([readonly])", phone)
        self.assertIn("font-size: 16px", phone)
        self.assertIn("font-size: 16px !important", css("login.css"))
        self.assertIn(".st-cp-input { font-size: 16px !important; }", css("command_palette.css"))

    def test_page_head_sticks_below_the_toolbar(self):
        self.assertIn("body.st-has-toolbar .page-head {\n  top: var(--st-header-height, 36px);", css("solvronix_desk.css"))

    def test_full_height_panels_use_dynamic_viewport(self):
        self.assertIn("height: 100dvh;", css("solvronix_desk.css"))
        self.assertIn("calc(100dvh - var(--st-header-height)) !important", ENGINE.read_text(encoding="utf-8"))
        self.assertIn("calc(100dvh - var(--st-header-height)) !important", css("sidebar.css"))
        self.assertNotIn("height: calc(100vh", css("notification_center.css"))

    def test_compact_density_is_mouse_only(self):
        text = css("density.css")
        self.assertIn("@media (pointer: fine) {", text)
        first_rule = re.search(r"^html\[data-density", text, re.M)
        self.assertIsNone(first_rule, "compact rules must be inside the pointer: fine block")

    def test_dropdown_menus_keep_frappe_scrolling(self):
        text = css("solvronix_desk.css")
        block = text[text.index(".dropdown-menu,\n.frappe-menu {"):]
        block = block[:block.index("}")]
        self.assertIn("overflow: auto;", block)

    def test_toolbar_dropdowns_are_clamped_to_viewport(self):
        js = (JS_DIR / "solvronix_desk.js").read_text(encoding="utf-8")
        self.assertIn("window.stClampToViewport = function", js)
        self.assertEqual(js.count("window.stClampToViewport($"), 3)

    def test_theme_studio_has_phone_panes_and_fit(self):
        js = STUDIO_JS.read_text(encoding="utf-8")
        self.assertIn('class="sts-pane-switch"', js)
        self.assertIn("_fit_preview()", js)
        self.assertIn('"touchmove", ".sts-workspace-shield"', js)
        text = css("theme_studio.css")
        self.assertIn('.st-theme-studio[data-sts-pane="controls"] .sts-workbench', text)
        self.assertIn('.sts-context-inspector[data-side="sheet"]', text)


if __name__ == "__main__":
    unittest.main()
