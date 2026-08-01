"""Regression coverage for Workspace EditorJS stacking and asset versions."""

from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
CSS = ROOT / "solvronix_desk" / "public" / "css" / "solvronix_desk.css"
JS = ROOT / "solvronix_desk" / "public" / "js" / "solvronix_desk.js"
HOOKS = ROOT / "solvronix_desk" / "hooks.py"


class WorkspaceEditorJSPopoverCSSTest(unittest.TestCase):
    def test_editorjs_block_picker_is_above_workspace_content(self):
        css = CSS.read_text(encoding="utf-8")

        self.assertIn(".ce-popover", css)
        self.assertIn(".ce-toolbar", css)
        self.assertIn("z-index: 1201 !important", css)

    def test_workspace_card_hover_does_not_compete_with_open_editorjs_menu(self):
        css = CSS.read_text(encoding="utf-8")

        self.assertIn('[data-page-route="Workspaces"] #editorjs .widget:hover', css)
        self.assertIn('[data-page-route="Workspaces"] #editorjs .desk-card:hover', css)
        self.assertIn("transform: none !important", css)

    def test_block_with_open_editorjs_popover_is_promoted_before_focus(self):
        css = CSS.read_text(encoding="utf-8")
        js = JS.read_text(encoding="utf-8")

        self.assertNotIn(":has(.ce-popover", css)
        self.assertIn(".st-editorjs-popover-host", css)
        self.assertIn("installWorkspaceBlockPickerLayerFix", js)
        self.assertIn("st-editorjs-popover-host", js)
        self.assertIn("ce-toolbar__plus", js)
        self.assertIn("z-index: 1195 !important", css)

    def test_workspace_css_cache_is_bumped(self):
        hooks = HOOKS.read_text(encoding="utf-8")

        self.assertIn("/assets/solvronix_desk/css/solvronix_desk.css?v=50", hooks)
        self.assertIn("/assets/solvronix_desk/js/solvronix_desk.js?v=47", hooks)


if __name__ == "__main__":
    unittest.main()
