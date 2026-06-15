import frappe


@frappe.whitelist(allow_guest=True)
def get_theme_css():
    """Return :root CSS variable overrides from Theme Settings.
    Only the two base brand colors are emitted — all derived shades
    (navbar darker, login darker, page tint, etc.) are auto-computed
    by color-mix() rules in the static CSS files.
    """
    try:
        s = frappe.get_single("Theme Settings")
        brand  = s.brand_color  or "#1B3F7E"
        accent = s.accent_color or "#F57C00"
        css = f""":root {{
  --st-brand:   {brand};
  --st-accent:  {accent};
  --st-primary: var(--st-brand);
}}"""
        return css
    except Exception:
        frappe.log_error("solvronix_theme.api.get_theme_css failed")
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
        frappe.log_error("solvronix_theme.api.get_branding failed")
        return {}


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
        frappe.log_error("solvronix_theme.api.get_available_languages failed")
        return []


@frappe.whitelist()
def set_user_language(lang_code):
    """Persist the chosen language on the logged-in User record."""
    if not frappe.session.user or frappe.session.user == "Guest":
        frappe.throw("Not permitted")
    frappe.db.set_value("User", frappe.session.user, "language", lang_code)
    frappe.db.commit()
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
    frappe.db.commit()
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
    frappe.db.commit()
    return {"ok": True}
