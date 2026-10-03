import frappe


# ── BRAND NAME FROM THE FIRST COMPANY ──────────────────────────────────────────
def company_after_insert(doc, method):
    """On a fresh site the setup wizard creates the Company after this app is
    installed; pick its name up for Theme Settings if none is set yet."""
    try:
        from solvronix_desk.setup import fill_brand_name

        fill_brand_name(company=doc.name)
    except Exception:
        # Never block creating a Company over a cosmetic default.
        frappe.log_error("solvronix_desk: brand name from Company failed")


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
