"""3.0.0 release: the Workspace Classic announcement and release wiring."""

from pathlib import Path
import ast
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "solvronix_desk"
MODULE = APP / "announcements.py"


def _load_decide():
    # announcements.py needs a real Frappe; run only the pure rule and its constant.
    tree = ast.parse(MODULE.read_text(encoding="utf-8"))
    keep = [
        node for node in tree.body
        if (isinstance(node, ast.FunctionDef) and node.name == "decide")
        or (isinstance(node, ast.Assign) and any(getattr(t, "id", "") == "MAX_SNOOZES" for t in node.targets))
    ]
    scope = {}
    exec(compile(ast.Module(body=keep, type_ignores=[]), str(MODULE), "exec"), scope)
    return scope["decide"]


decide = _load_decide()
ITEM = {"id": "workspace-classic-3", "profile": "builtin-workspace"}


class AnnouncementAudienceTest(unittest.TestCase):
    def test_a_user_who_may_choose_sees_the_card(self):
        self.assertEqual(decide(ITEM, None, "", True, False, "sid1"), "card")

    def test_without_theme_choice_only_managers_see_it(self):
        self.assertIsNone(decide(ITEM, None, "", False, False, "sid1"))
        self.assertEqual(decide(ITEM, None, "", False, True, "sid1"), "card")

    def test_nobody_already_on_the_profile_sees_the_card(self):
        self.assertIsNone(decide(ITEM, None, "builtin-workspace", True, True, "sid1"))

    def test_dismissed_never_shows_again(self):
        self.assertIsNone(decide(ITEM, {"state": "dismissed"}, "", True, True, "sid1"))

    def test_not_now_hides_it_for_this_session_and_stops_after_three(self):
        self.assertIsNone(decide(ITEM, {"snoozes": 1, "snoozed_sid": "sid1"}, "", True, False, "sid1"))
        self.assertEqual(decide(ITEM, {"snoozes": 1, "snoozed_sid": "sid1"}, "", True, False, "sid2"), "card")
        self.assertIsNone(decide(ITEM, {"snoozes": 3, "snoozed_sid": "old"}, "", True, False, "sid2"))

    def test_after_a_try_the_keep_or_switch_back_bar_shows_once(self):
        tried = {"state": "tried", "acked": False}
        self.assertEqual(decide(ITEM, tried, "builtin-workspace", True, False, "s"), "tried")
        self.assertIsNone(decide(ITEM, dict(tried, acked=True), "builtin-workspace", True, False, "s"))
        # Switched away some other way: nothing to keep or undo.
        self.assertIsNone(decide(ITEM, tried, "", True, False, "s"))


class ReleaseWiringTest(unittest.TestCase):
    def test_version_is_3_0_0_everywhere(self):
        init = (APP / "__init__.py").read_text(encoding="utf-8")
        hooks = (APP / "hooks.py").read_text(encoding="utf-8")
        changelog = (ROOT / "CHANGELOG.md").read_text(encoding="utf-8")
        self.assertIn('__version__ = "3.0.0"', init)
        self.assertIn('app_version = "3.0.0"', hooks)
        self.assertTrue(changelog.split("\n## ", 2)[1].startswith("[3.0.0]"))

    def test_change_log_folders_hold_only_markdown(self):
        # Frappe parses every file name under change_log/v<major>/ as a version.
        base = APP / "change_log"
        files = [p for p in base.rglob("*") if p.is_file() and p.parent != base]
        self.assertTrue(any(p.name == "v3_0_0.md" for p in files))
        for path in files:
            self.assertRegex(path.name, r"^v\d+_\d+_\d+\.md$")

    def test_assets_are_registered(self):
        hooks = (APP / "hooks.py").read_text(encoding="utf-8")
        self.assertIn("/assets/solvronix_desk/js/announcements.js?v=3", hooks)
        self.assertIn("/assets/solvronix_desk/css/announcements.css?v=3", hooks)
        self.assertLess(hooks.index("theme_runtime.js"), hooks.index("announcements.js"))

    def test_boot_and_studio_are_wired(self):
        boot = (APP / "boot.py").read_text(encoding="utf-8")
        api = (APP / "theme_api.py").read_text(encoding="utf-8")
        studio = (APP / "solvronix_desk" / "page" / "theme_studio" / "theme_studio.js").read_text(encoding="utf-8")
        self.assertIn("bootinfo.st_announcements = announcements.pending_for(", boot)
        self.assertIn('"show_announcements": announcements.enabled()', api)
        self.assertIn("show_announcements: !!flags.show_announcements", studio)
        self.assertIn("_load_requested_profile()", studio)

    def test_announcement_css_uses_variables_only(self):
        css = (APP / "public" / "css" / "announcements.css").read_text(encoding="utf-8")
        self.assertIsNone(re.search(r"#[0-9a-fA-F]{3,8}\b(?![-\w])", re.sub(r"#st-[\w-]+", "", css)))


if __name__ == "__main__":
    unittest.main()
