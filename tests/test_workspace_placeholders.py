"""Placeholder workspaces (text only, nothing to open) stay out of the app grid."""

from pathlib import Path
import ast
import json
import unittest


API = Path(__file__).resolve().parents[1] / "solvronix_desk" / "api.py"


def _load_helper():
    # api.py needs a real Frappe; run only the pure helper and its constant.
    tree = ast.parse(API.read_text(encoding="utf-8"))
    keep = [
        node for node in tree.body
        if (isinstance(node, ast.FunctionDef) and node.name == "_is_placeholder")
        or (isinstance(node, ast.Assign) and any(getattr(t, "id", "") == "_TEXT_BLOCKS" for t in node.targets))
    ]
    scope = {"json": json}
    exec(compile(ast.Module(body=keep, type_ignores=[]), str(API), "exec"), scope)
    return scope["_is_placeholder"]


is_placeholder = _load_helper()


class WorkspacePlaceholderTest(unittest.TestCase):
    def test_text_only_page_with_nothing_behind_it_is_a_placeholder(self):
        content = json.dumps([
            {"type": "header", "data": {"text": "Hi,"}},
            {"type": "paragraph", "data": {"text": "You don't have access to any workspace yet."}},
        ])
        self.assertTrue(is_placeholder(content, False, False))

    def test_sidebar_driven_page_with_empty_content_is_kept(self):
        self.assertFalse(is_placeholder("[]", False, True))

    def test_page_with_shortcuts_links_or_cards_is_kept(self):
        self.assertFalse(is_placeholder('[{"type": "header"}]', True, False))

    def test_page_with_a_widget_block_is_kept(self):
        content = json.dumps([{"type": "header"}, {"type": "shortcut", "data": {"shortcut_name": "Item"}}])
        self.assertFalse(is_placeholder(content, False, False))

    def test_unreadable_content_is_kept(self):
        self.assertFalse(is_placeholder("{not json", False, False))

    def test_get_workspaces_filters_through_the_helper(self):
        src = API.read_text(encoding="utf-8")
        self.assertIn("return _without_placeholders(result)", src)
        self.assertIn('frappe.db.table_exists("Workspace Sidebar")', src)


if __name__ == "__main__":
    unittest.main()
