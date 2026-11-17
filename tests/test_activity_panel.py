"""Activity side panel is wired in, on by default, and switchable."""

from pathlib import Path
import importlib.util
import unittest

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "solvronix_desk"


class ActivityPanelWiringTest(unittest.TestCase):
    def test_assets_are_registered(self):
        hooks = (APP / "hooks.py").read_text(encoding="utf-8")
        self.assertIn("/assets/solvronix_desk/js/activity_panel.js?v=1", hooks)
        self.assertIn("/assets/solvronix_desk/css/activity_panel.css?v=1", hooks)

    def test_config_key_defaults_on_and_is_a_boolean(self):
        engine = (APP / "theme_engine.py").read_text(encoding="utf-8")
        self.assertIn('"activity_panel": True,', engine)
        self.assertIn('"grid_row_slide_panel", "activity_panel",', engine)

    def test_studio_has_the_switch(self):
        studio = (APP / "solvronix_desk" / "page" / "theme_studio" / "theme_studio.js").read_text(encoding="utf-8")
        self.assertIn('["activity_panel", "Activity side panel on forms (wide screens)", "check"]', studio)

    def test_css_uses_variables_only(self):
        for name in ("activity_panel.css", "stat_buttons.css", "dashboard_filter.css", "invoice_tabs.css"):
            css = (APP / "public" / "css" / name).read_text(encoding="utf-8")
            self.assertNotRegex(css.replace("var(--", ""), r"#[0-9a-fA-F]{3,8}\b", name)

    def test_dashboard_filter_is_wired_on_by_default(self):
        hooks = (APP / "hooks.py").read_text(encoding="utf-8")
        self.assertIn("/assets/solvronix_desk/js/dashboard_filter.js?v=2", hooks)
        self.assertIn("/assets/solvronix_desk/css/dashboard_filter.css?v=2", hooks)
        engine = (APP / "theme_engine.py").read_text(encoding="utf-8")
        self.assertIn('"dashboard_filter": True,', engine)
        studio = (APP / "solvronix_desk" / "page" / "theme_studio" / "theme_studio.js").read_text(encoding="utf-8")
        self.assertIn('["dashboard_filter", "Dashboard date filter on workspaces", "check"]', studio)

    def test_save_new_and_invoice_tabs_are_wired_on_by_default(self):
        hooks = (APP / "hooks.py").read_text(encoding="utf-8")
        for asset in ("js/quick_entry_extras.js?v=1", "js/invoice_tabs.js?v=1", "css/invoice_tabs.css?v=1"):
            self.assertIn("/assets/solvronix_desk/" + asset, hooks)
        engine = (APP / "theme_engine.py").read_text(encoding="utf-8")
        self.assertIn('"quick_entry_save_new": True,', engine)
        self.assertIn('"invoice_tabs": True,', engine)
        studio = (APP / "solvronix_desk" / "page" / "theme_studio" / "theme_studio.js").read_text(encoding="utf-8")
        self.assertIn('["quick_entry_save_new", "Save & New in quick-entry pop-ups", "check"]', studio)
        self.assertIn('["invoice_tabs", "Sales | Purchase tabs on invoice lists", "check"]', studio)

    def test_stat_buttons_are_wired_on_by_default(self):
        hooks = (APP / "hooks.py").read_text(encoding="utf-8")
        self.assertIn("/assets/solvronix_desk/js/stat_buttons.js?v=2", hooks)
        self.assertIn("/assets/solvronix_desk/css/stat_buttons.css?v=1", hooks)
        engine = (APP / "theme_engine.py").read_text(encoding="utf-8")
        self.assertIn('"stat_buttons": True,', engine)
        studio = (APP / "solvronix_desk" / "page" / "theme_studio" / "theme_studio.js").read_text(encoding="utf-8")
        self.assertIn('["stat_buttons", "Stat buttons (linked-document counts) on forms", "check"]', studio)


if __name__ == "__main__":
    unittest.main()
