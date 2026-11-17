import frappe
from frappe.desk.doctype.notification_log import notification_log


# ── FRESH NOTIFICATION READS ON EVERY V16 MINOR ────────────────────────────────
# Frappe 16.0 – 16.55 serves get_notification_logs with an HTTP cache
# (max-age 60 s, stale for up to 1 h), so after "mark as read" and a reload the
# browser shows the old list with the items unread again. Frappe 16.56 dropped
# that cache (commit fa70c15cb0); this override does the same on older minors
# and is a plain pass-through on newer ones.
@frappe.whitelist()
def get_notification_logs(limit: int = 20):
    return _without_http_cache(notification_log.get_notification_logs)(limit=limit)


@frappe.whitelist()
def get_unread_count() -> int:
    """The bell's number, read live. Frappe 16.0 – 16.55 puts it in the cached
    boot data, where it goes stale as soon as a notification is read."""
    return frappe.db.count("Notification Log", {"read": 0, "for_user": frappe.session.user})


def _without_http_cache(fn):
    """The function below frappe.utils.caching.http_cache, whose wrapper sets the
    Cache-Control header. The layers above it (frappe.whitelist's argument check)
    are already applied to this module's own whitelisted entry point."""
    layer = fn
    while layer is not None:
        if "cache_headers" in getattr(getattr(layer, "__code__", None), "co_freevars", ()):
            return layer.__wrapped__
        layer = getattr(layer, "__wrapped__", None)
    return fn
