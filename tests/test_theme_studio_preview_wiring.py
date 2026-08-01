"""Static UI contract for visual controls consumed by Theme Studio preview."""

from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "solvronix_desk" / "solvronix_desk" / "page" / "theme_studio" / "theme_studio.js"
CSS = ROOT / "solvronix_desk" / "public" / "css" / "theme_studio.css"


class ThemeStudioPreviewWiringTest(unittest.TestCase):
    def test_component_tokens_are_consumed_by_preview_css(self):
        css = CSS.read_text(encoding="utf-8")
        for token in (
            "--studio-checkbox", "--studio-dropdown-bg", "--studio-disabled-opacity",
            "--studio-font-weight", "--studio-line-height", "--studio-report-grid",
            "--studio-focus-width", "--studio-logo-size", "--studio-workspace-width",
            "--studio-page-margin",
        ):
            self.assertIn(f"var({token}", css)

    def test_visual_state_attributes_have_preview_selectors(self):
        css = CSS.read_text(encoding="utf-8")
        for selector in (
            'data-layout="boxed"', 'data-logo-position="center"',
            'data-module-icons="plain"', 'data-module-icons="solid"',
            'data-empty-state="illustrated"', 'data-compact-forms="true"',
            'data-high-contrast="true"', 'data-large-text="true"',
            'data-sticky-navbar="true"', 'data-sticky-form-toolbar="true"',
        ):
            self.assertIn(selector, css)

    def test_form_and_dashboard_expose_missing_component_examples(self):
        js = PAGE.read_text(encoding="utf-8")
        self.assertIn("sts-preview-check", js)
        self.assertIn("sts-preview-disabled", js)
        self.assertIn("sts-empty-state", js)
        self.assertIn('"mouseenter mouseleave", ".sts-preview-sidebar"', js)

    def test_branding_has_visible_preview_consumers(self):
        js = PAGE.read_text(encoding="utf-8")
        self.assertIn("data-app-title", js)
        self.assertIn("data-app-tagline", js)
        self.assertIn("data-favicon-preview", js)


if __name__ == "__main__":
    unittest.main()
