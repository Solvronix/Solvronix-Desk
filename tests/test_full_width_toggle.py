"""Regression coverage for the ERPNext-compatible full-width Desk toggle."""

from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
CSS = ROOT / "solvronix_desk" / "public" / "css" / "solvronix_desk.css"
JS = ROOT / "solvronix_desk" / "public" / "js" / "solvronix_desk.js"


class FullWidthToggleTest(unittest.TestCase):
    def test_user_menu_exposes_persistent_full_width_toggle(self):
        js = JS.read_text(encoding="utf-8")

        self.assertIn('"container_fullwidth"', js)
        self.assertIn('data-action="toggle-full-width"', js)
        self.assertIn("frappe.ui.toolbar.toggle_full_width", js)
        self.assertIn('document.body.classList.toggle("full-width"', js)
        self.assertIn("Full width enabled", js)
        self.assertIn("Full width disabled", js)

    def test_full_width_state_removes_page_content_caps(self):
        css = CSS.read_text(encoding="utf-8")

        self.assertIn("body.full-width", css)
        self.assertIn("--page-max-width: 100%", css)
        self.assertIn("body.full-width .page-head .container", css)
        self.assertIn("body.full-width .layout-main", css)
        self.assertNotIn("body.full-width .layout-main-section-wrapper", css)
        self.assertIn("max-width: none !important", css)


if __name__ == "__main__":
    unittest.main()
