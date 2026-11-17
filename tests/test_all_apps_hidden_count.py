"""All Apps says how many workspaces a blocked module hides (#31)."""

from pathlib import Path
import ast
import unittest


API = Path(__file__).resolve().parents[1] / "solvronix_desk" / "api.py"
ALL_APPS = Path(__file__).resolve().parents[1] / "solvronix_desk" / "solvronix_desk" / "page" / "all_apps" / "all_apps.js"


def _load_helper():
    # api.py needs a real Frappe; run only the pure counting helper.
    tree = ast.parse(API.read_text(encoding="utf-8"))
    keep = [n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == "_count_hidden_by_module"]
    scope = {}
    exec(compile(ast.Module(body=keep, type_ignores=[]), str(API), "exec"), scope)
    return scope["_count_hidden_by_module"]


count = _load_helper()


class HiddenByModuleCountTest(unittest.TestCase):
    def test_counts_public_top_level_pages_of_blocked_modules(self):
        pages = [
            {"public": 1, "is_hidden": 0, "parent_page": "", "module": "CRM"},
            {"public": 1, "is_hidden": 0, "parent_page": None, "module": "Selling"},
        ]
        self.assertEqual(count(pages, ["CRM"]), 1)

    def test_hidden_child_and_private_pages_are_not_counted(self):
        pages = [
            {"public": 1, "is_hidden": 1, "parent_page": "", "module": "CRM"},
            {"public": 1, "is_hidden": 0, "parent_page": "CRM", "module": "CRM"},
            {"public": 0, "is_hidden": 0, "parent_page": "", "module": "CRM"},
        ]
        self.assertEqual(count(pages, ["CRM"]), 0)

    def test_nothing_blocked_means_zero(self):
        self.assertEqual(count([{"public": 1, "module": "CRM"}], []), 0)
        self.assertEqual(count(None, None), 0)

    def test_all_apps_page_shows_the_note(self):
        js = ALL_APPS.read_text(encoding="utf-8")
        self.assertIn("st-all-apps-hidden", js)
        self.assertIn("hiddenByModule", js)


if __name__ == "__main__":
    unittest.main()
