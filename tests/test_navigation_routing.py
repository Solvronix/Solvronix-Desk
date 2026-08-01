"""Regression coverage for Desk SPA navigation race conditions."""

from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
MODULE_CARDS = ROOT / "solvronix_desk" / "public" / "js" / "module_cards.js"
DESK_JS = ROOT / "solvronix_desk" / "public" / "js" / "solvronix_desk.js"
PALETTE = ROOT / "solvronix_desk" / "public" / "js" / "command_palette.js"
HOOKS = ROOT / "solvronix_desk" / "hooks.py"


class NavigationRoutingTest(unittest.TestCase):
    def test_delayed_apps_grid_is_cancelled_after_route_changes(self):
        js = MODULE_CARDS.read_text(encoding="utf-8")

        self.assertIn("_routeGeneration", js)
        self.assertIn("_activePoller", js)
        self.assertIn("generation !== _routeGeneration", js)
        self.assertIn("frappe.container.page.contains(container)", js)
        self.assertIn('container.querySelector("#st-module-grid")', js)
        self.assertNotIn('cards[j].addEventListener("click"', js)

    def test_startup_does_not_override_frappe_deep_links(self):
        js = DESK_JS.read_text(encoding="utf-8")

        self.assertNotIn("isEmptyOrWorkspace", js)
        self.assertIn("bootinfo.home_page owns the initial Smart Home redirect", js)

    def test_command_palette_uses_real_workspace_slug(self):
        js = PALETTE.read_text(encoding="utf-8")

        self.assertIn("page.route ||", js)
        self.assertNotIn('frappe.set_route("workspace", encodeURIComponent(page.name))', js)

    def test_navigation_assets_are_cache_busted(self):
        hooks = HOOKS.read_text(encoding="utf-8")

        self.assertIn("/assets/solvronix_desk/js/solvronix_desk.js?v=47", hooks)
        self.assertIn("/assets/solvronix_desk/js/command_palette.js?v=9", hooks)
        self.assertIn("/assets/solvronix_desk/js/module_cards.js?v=6", hooks)


if __name__ == "__main__":
    unittest.main()
