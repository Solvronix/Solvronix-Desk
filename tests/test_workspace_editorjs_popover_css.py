from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
CSS = ROOT / "solvronix_desk" / "public" / "css" / "solvronix_desk.css"


class WorkspaceEditorJSPopoverCSSTest(unittest.TestCase):
    def test_editorjs_block_picker_is_above_workspace_content(self):
        css = CSS.read_text(encoding="utf-8")

        self.assertIn(".ce-popover", css)
        self.assertIn(".ce-toolbar", css)
        self.assertIn("z-index: 1100 !important", css)


if __name__ == "__main__":
    unittest.main()
