"""Notification read state: fresh reads on every Frappe v16 minor."""

from pathlib import Path
import ast
import functools
import unittest


ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "solvronix_desk"
MODULE = APP / "notifications.py"
CENTER_JS = APP / "public" / "js" / "notification_center.js"
HOOKS = APP / "hooks.py"
METHOD = "frappe.desk.doctype.notification_log.notification_log.get_notification_logs"


def load_unwrap():
    """_without_http_cache on its own, without importing frappe."""
    tree = ast.parse(MODULE.read_text(encoding="utf-8"))
    fn = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == "_without_http_cache")
    scope = {}
    exec(compile(ast.Module(body=[fn], type_ignores=[]), str(MODULE), "exec"), scope)
    return scope["_without_http_cache"]


def http_cache(func):
    # Same shape as frappe.utils.caching.http_cache: a wrapper closing over cache_headers.
    cache_headers = "max-age=60"

    @functools.wraps(func)
    def inner(*args, **kwargs):
        return (cache_headers, func(*args, **kwargs))

    return inner


def whitelist(func):
    # Same shape as Frappe v16's whitelist argument check.
    apply_condition = True

    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs) if apply_condition else None

    return wrapper


class NotificationsTest(unittest.TestCase):
    def test_override_is_registered(self):
        hooks = HOOKS.read_text(encoding="utf-8")
        self.assertIn(f'"{METHOD}": "solvronix_desk.notifications.get_notification_logs"', hooks)
        self.assertIn("/assets/solvronix_desk/js/notification_center.js?v=5", hooks)

    def test_unwrap_skips_only_the_http_cache_layer(self):
        unwrap = load_unwrap()

        def logs(limit=20):
            return ["row"] * limit

        cached = whitelist(http_cache(logs))
        self.assertIs(unwrap(cached), logs)
        self.assertEqual(unwrap(cached)(limit=2), ["row", "row"])
        plain = whitelist(logs)
        self.assertIs(unwrap(plain), plain)
        self.assertIs(unwrap(logs), logs)

    def test_bells_read_fresh_data(self):
        js = CENTER_JS.read_text(encoding="utf-8")
        self.assertNotIn('type: "GET"', js)
        self.assertIn('method: "solvronix_desk.notifications.get_unread_count"', js)
        self.assertIn("native.update_count_badge(count)", js)
        self.assertIn("frappe.boot.notification_unread_count = count", js)

    def test_opening_a_notification_marks_it_read(self):
        js = CENTER_JS.read_text(encoding="utf-8")
        self.assertIn("if (!n.read) markOneRead(n.name, $item);", js)
        self.assertIn('".notification-item.unread[data-name]"', js)
