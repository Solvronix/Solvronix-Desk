from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
CSS = ROOT / "solvronix_desk" / "public" / "css" / "solvronix_desk.css"


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


if __name__ == "__main__":
    unittest.main()
