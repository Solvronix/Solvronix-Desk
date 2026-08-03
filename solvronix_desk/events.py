import frappe


# ── THEME SETTINGS REALTIME PROPAGATION ────────────────────────────────────────
def theme_settings_on_update(doc, method):
    """Broadcast theme change to all connected desk users instantly.
    No room/user specified → frappe uses get_site_room() → all desk users.
    after_commit=True → fires only after the DB transaction commits.
    """
    try:
        frappe.publish_realtime(
            "st_theme_changed",
            {
                "refresh": 1,
                "branding": {
                    "company_name": doc.company_name or "",
                    "logo":         doc.logo         or "",
                    "favicon":      doc.favicon       or "",
                    "tagline":      doc.tagline       or "",
                },
            },
            room=frappe.local.site,
            after_commit=True,
        )
    except Exception:
        frappe.log_error("solvronix_desk: st_theme_changed realtime broadcast failed")
        # Never break Theme Settings persistence because a websocket is unavailable.
        pass
