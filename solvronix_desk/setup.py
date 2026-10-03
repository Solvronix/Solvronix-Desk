import frappe


# ── INSTALL / MIGRATION DEFAULTS ───────────────────────────────────────────────
# The same idempotent seed path supports both fresh installs and later upgrades.
def after_install():
    """Seed default values into Theme Settings after app install."""
    _seed_defaults(login_layout="Split Screen")


def _seed_defaults(login_layout):
    try:
        if not frappe.db.exists("DocType", "Theme Settings"):
            return
        defaults = {
            "brand_color":            "#1B3F7E",
            "accent_color":           "#F57C00",
            "enable_command_palette": 1,
            "enable_smart_home":      1,
            "default_theme_mode":     "Light",
            "base_font_size":         "Default",
            "default_density":        "Comfortable",
            "corner_radius":          8,
            "shadow_style":           "Soft",
            "sidebar_width":          240,
            "sidebar_layout":         "Icon Rail",
            "icon_rail_width":        72,
            "studio_layout":          '["metrics","chart","activity","quick_actions"]',
            "theme_enabled":          1,
            "allow_user_theme":       1,
            "theme_lock":             0,
            "preview_admin_only":     1,
        }
        for field, val in defaults.items():
            existing = frappe.db.get_single_value("Theme Settings", field)
            # Only NULL means uninitialized; preserve deliberate false/blank choices.
            if existing is None:
                frappe.db.set_single_value("Theme Settings", field, val)
        fill_brand_name()
        seed_login_page_settings(layout=login_layout)
        frappe.db.commit()
        print("\n✅ Solvronix Desk installed!")
        print("→ Configure at /desk/theme-settings\n")
    except Exception as e:
        frappe.log_error(str(e), "Solvronix Desk Install")
        print(f"\n⚠️  after_install warning: {e}\n")


def after_migrate():
    """Re-seed defaults on every bench migrate (idempotent).

    An upgraded site must never land on the Split Screen login: if the
    v2_2 patch didn't seed Login Page Settings first, seed Centered Card.
    """
    _seed_defaults(login_layout="Centered Card")


# ── BRAND NAME FROM THE ORGANISATION ───────────────────────────────────────────
def fill_brand_name(company=None):
    """Fill Theme Settings' Company Name from the site's organisation while it
    is still empty, so admins start from their own name and rename if needed.

    Runs on install and migrate (a site that already has a Company) and when a
    Company is created (a fresh site, where the setup wizard creates it after
    the app is installed). A name the admin has typed is never replaced.
    """
    from solvronix_desk.login_config import real_name

    if not frappe.db.exists("DocType", "Theme Settings"):
        return
    if (frappe.db.get_single_value("Theme Settings", "company_name") or "").strip():
        return
    name = (
        real_name(frappe.defaults.get_global_default("company"))
        or real_name(company)
        or real_name(frappe.get_website_settings("app_name"))
        or real_name(frappe.get_system_settings("app_name"))
    )
    if not name:
        return
    frappe.db.set_single_value("Theme Settings", "company_name", name)
    try:
        from frappe.model.document import clear_document_cache
    except ImportError:  # older v16 builds
        clear_document_cache = None
    if clear_document_cache:
        clear_document_cache("Theme Settings", "Theme Settings")
    else:
        frappe.clear_cache(doctype="Theme Settings")


# ── LOGIN PAGE DESIGNER DEFAULTS ───────────────────────────────────────────────
def seed_login_page_settings(layout="Split Screen"):
    """Store the Login Page Settings switches the first time only.

    No copy is stored: login_config.DEFAULT_COPY fills every empty field at
    render time, and branding comes from the default Company when the page is
    shown — at install time the setup wizard hasn't created one yet. Existing
    installs get Centered Card (patch / after_migrate) so their login page
    doesn't change until an admin switches it on purpose.
    """
    if not frappe.db.exists("DocType", "Login Page Settings"):
        return
    if frappe.db.sql("select 1 from `tabSingles` where doctype = 'Login Page Settings' limit 1"):
        return
    # Plain single values, not doc.save(): nothing here can fail validation,
    # and a skipped seed can no longer leave a half-configured page.
    for field, value in {
        "enabled": 1,
        "layout": layout,
        "auto_fetch_branding": 1,
        "show_hero_pattern": 1,
        "show_feature_panel": 1,
    }.items():
        frappe.db.set_single_value("Login Page Settings", field, value)
