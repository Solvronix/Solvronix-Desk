from pathlib import Path
import json
import unittest


ROOT = Path(__file__).resolve().parents[1]
API = ROOT / "solvronix_desk" / "api.py"
HOOKS = ROOT / "solvronix_desk" / "hooks.py"
SETTINGS = ROOT / "solvronix_desk" / "solvronix_desk" / "doctype" / "theme_settings" / "theme_settings.json"
PAGE = ROOT / "solvronix_desk" / "solvronix_desk" / "page" / "theme_studio" / "theme_studio.js"
PAGE_JSON = PAGE.with_name("theme_studio.json")
CSS = ROOT / "solvronix_desk" / "public" / "css" / "theme_studio.css"


class ThemeStudioTest(unittest.TestCase):
    def test_page_is_restricted_to_system_managers(self):
        page = json.loads(PAGE_JSON.read_text(encoding="utf-8"))
        self.assertEqual(page["name"], "theme-studio")
        self.assertEqual(page["roles"], [{"role": "System Manager"}])

    def test_theme_settings_contain_visual_tokens(self):
        settings = json.loads(SETTINGS.read_text(encoding="utf-8"))
        fields = {field["fieldname"] for field in settings["fields"]}
        self.assertTrue(
            {
                "sidebar_background", "navbar_background", "page_background",
                "card_background", "text_color", "corner_radius", "shadow_style",
                "sidebar_width", "studio_layout",
            }.issubset(fields)
        )

    def test_api_validates_and_persists_studio_configuration(self):
        api = API.read_text(encoding="utf-8")
        self.assertIn('frappe.only_for("System Manager")', api)
        self.assertIn("def save_theme_config(config):", api)
        self.assertIn("HEX_COLOR.fullmatch", api)
        self.assertIn("settings.studio_layout", api)

    def test_editor_has_drag_history_and_responsive_preview(self):
        js = PAGE.read_text(encoding="utf-8")
        css = CSS.read_text(encoding="utf-8")
        self.assertIn('draggable="true"', js)
        self.assertIn('addEventListener("dragover"', js)
        self.assertIn("undo()", js)
        self.assertIn("redo()", js)
        self.assertIn('[data-device="mobile"]', css)

    def test_assets_are_versioned(self):
        hooks = HOOKS.read_text(encoding="utf-8")
        self.assertIn("/assets/solvronix_desk/css/theme_studio.css?v=1", hooks)
        self.assertIn("/assets/solvronix_desk/js/command_palette.js?v=6", hooks)


if __name__ == "__main__":
    unittest.main()
