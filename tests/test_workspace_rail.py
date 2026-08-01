"""Structural coverage for the Today / New / Workspaces sidebar rail."""

from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "solvronix_desk" / "public" / "js" / "solvronix_desk.js"
CSS = ROOT / "solvronix_desk" / "public" / "css" / "sidebar.css"
HOOKS = ROOT / "solvronix_desk" / "hooks.py"


class WorkspaceRailTest(unittest.TestCase):
    def test_sidebar_has_today_new_and_permission_safe_workspaces(self):
        js = JS.read_text(encoding="utf-8")

        self.assertIn("injectWorkspaceRail", js)
        self.assertIn('id="st-workspace-rail"', js)
        self.assertIn('__("Today")', js)
        self.assertIn('__("New")', js)
        self.assertIn("solvronix_desk.api.get_workspaces", js)
        self.assertIn("frappe.boot.user.can_create", js)

    def test_sidebar_rail_supports_expanded_and_collapsed_states(self):
        css = CSS.read_text(encoding="utf-8")

        self.assertIn("#st-workspace-rail", css)
        self.assertIn(".st-rail-workspaces", css)
        self.assertIn(".body-sidebar-container:not(.expanded)", css)

    def test_sidebar_assets_are_cache_busted(self):
        hooks = HOOKS.read_text(encoding="utf-8")

        self.assertIn("/assets/solvronix_desk/css/sidebar.css?v=21", hooks)
        self.assertIn("/assets/solvronix_desk/js/solvronix_desk.js?v=49", hooks)


if __name__ == "__main__":
    unittest.main()
