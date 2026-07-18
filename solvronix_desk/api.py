import frappe

# Site-default font size name → root font-size. Rem-based sizing scales with it.
FONT_SIZE_CSS = {
    "Small":   "87.5%",
    "Default": "100%",
    "Large":   "112.5%",
}


@frappe.whitelist(allow_guest=True)
def get_theme_css():
    """Return :root CSS variable overrides from Theme Settings.
    Only the base brand colors + site-default font size are emitted — all
    derived shades (navbar darker, login darker, page tint, etc.) are
    auto-computed by color-mix() rules in the static CSS files.
    Per-user font/density overrides are applied client-side on top of this.
    """
    try:
        s = frappe.get_single("Theme Settings")
        brand  = s.brand_color  or "#1B3F7E"
        accent = s.accent_color or "#F57C00"
        font   = FONT_SIZE_CSS.get(getattr(s, "base_font_size", None) or "Default", "100%")
        css = f""":root {{
  --st-brand:   {brand};
  --st-accent:  {accent};
  --st-primary: var(--st-brand);
  --st-font-size: {font};
  font-size: {font};
}}"""
        return css
    except Exception:
        frappe.log_error("solvronix_desk.api.get_theme_css failed")
        return ""


@frappe.whitelist(allow_guest=True)
def get_branding():
    """Return branding config dict for JS logo/favicon/title injection."""
    try:
        s = frappe.get_single("Theme Settings")
        return {
            "company_name": s.company_name,
            "logo":         s.logo,
            "favicon":      s.favicon,
            "tagline":      s.tagline,
        }
    except Exception:
        frappe.log_error("solvronix_desk.api.get_branding failed")
        return {}


@frappe.whitelist()
def get_workspaces():
    """Version-proof workspace list for the module switcher, All Options
    panel, and app launcher grid.

    Frappe renamed desk.desktop.get_workspace_sidebar_items to
    get_workspaces between v16.20 and v16.22 (same body, pure rename).
    Try the new name first, fall back to the old one, and fail soft with
    empty data if neither exists so the desk never crashes.
    """
    try:
        from frappe.desk import desktop

        fn = getattr(desktop, "get_workspaces", None) or getattr(
            desktop, "get_workspace_sidebar_items", None
        )
        if fn is None:
            frappe.log_error("solvronix_desk: no workspace list method found in frappe.desk.desktop")
            return {"pages": [], "private_pages": []}
        return fn()
    except Exception:
        frappe.log_error("solvronix_desk.api.get_workspaces failed")
        return {"pages": [], "private_pages": []}


@frappe.whitelist()
def get_available_languages():
    """Return enabled languages for the language switcher in the top toolbar."""
    try:
        langs = frappe.db.get_all(
            "Language",
            filters={"enabled": 1},
            fields=["name as code", "language_name as label", "flag"],
            order_by="language_name asc",
        )
        return langs
    except Exception:
        frappe.log_error("solvronix_desk.api.get_available_languages failed")
        return []


@frappe.whitelist()
def set_user_language(lang_code):
    """Persist the chosen language on the logged-in User record."""
    if not frappe.session.user or frappe.session.user == "Guest":
        frappe.throw("Not permitted")
    if not frappe.db.exists("Language", lang_code):
        frappe.throw(f"Invalid language code: {lang_code}")
    frappe.db.set_value("User", frappe.session.user, "language", lang_code)
    frappe.cache.hdel("bootinfo", frappe.session.user)
    return {"ok": True}


@frappe.whitelist()
def reset_workspace_for_user():
    """Delete all user-specific Workspace customizations for the current user.

    In Frappe v16, user edits to workspaces are stored as separate Workspace
    docs with for_user = user_email. Deleting them restores the public defaults.
    Replaces the old frappe.desk.desktop.reset_desktop_row_for_user (v14/v15).
    """
    user = frappe.session.user
    if not user or user == "Guest":
        frappe.throw("Not permitted")

    user_workspaces = frappe.db.get_all(
        "Workspace",
        filters={"for_user": user},
        pluck="name",
    )
    for name in user_workspaces:
        frappe.delete_doc("Workspace", name, ignore_permissions=True, force=True)

    frappe.cache.hdel("bootinfo", user)
    return {"reset": len(user_workspaces)}


@frappe.whitelist()
def set_user_theme(theme):
    """Persist dark/light mode preference on the User record.

    Uses frappe.db.set_value (direct SQL) instead of frappe.client.set_value
    (which calls doc.save() → triggers on_update hooks → publishes realtime
    doc_update event → causes 'document modified after you opened it' errors).
    """
    if not frappe.session.user or frappe.session.user == "Guest":
        return
    if theme not in ("Dark", "Light", "Automatic"):
        return
    frappe.db.set_value("User", frappe.session.user, "desk_theme", theme)
    return {"ok": True}
