import frappe


# ── INSTALL / MIGRATION DEFAULTS ───────────────────────────────────────────────
# The same idempotent seed path supports both fresh installs and later upgrades.
def after_install():
    """Seed default values into Theme Settings after app install."""
    try:
        if not frappe.db.exists("DocType", "Theme Settings"):
            return
        defaults = {
            "company_name":           "Solvronix",
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
        frappe.db.commit()
        print("\n✅ Solvronix Desk installed!")
        print("→ Configure at /desk/theme-settings\n")
    except Exception as e:
        frappe.log_error(str(e), "Solvronix Desk Install")
        print(f"\n⚠️  after_install warning: {e}\n")


def after_migrate():
    """Re-seed defaults on every bench migrate (idempotent)."""
    after_install()
