import frappe
from solvronix_desk.api import get_theme_css


def theme_settings_after_save(doc, method):
    """Broadcast theme change to all connected desk users instantly.
    No room/user specified → frappe uses get_site_room() → all desk users.
    after_commit=True → fires only after the DB transaction commits.
    """
    try:
        css = get_theme_css()
        frappe.publish_realtime(
            "st_theme_changed",
            {
                "css": css,
                "branding": {
                    "company_name": doc.company_name or "",
                    "logo":         doc.logo         or "",
                    "favicon":      doc.favicon       or "",
                    "tagline":      doc.tagline       or "",
                },
            },
            user=frappe.session.user,
            after_commit=True,
        )
    except Exception:
        frappe.log_error("solvronix_desk: st_theme_changed realtime broadcast failed")
        # Never break Theme Settings save on realtime failure
        pass
