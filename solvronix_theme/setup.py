import frappe


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
        }
        for field, val in defaults.items():
            existing = frappe.db.get_single_value("Theme Settings", field)
            if not existing:
                frappe.db.set_single_value("Theme Settings", field, val)
        frappe.db.commit()
        print("\n✅ Solvronix Desk installed!")
        print("→ Configure at /app/theme-settings\n")
    except Exception as e:
        frappe.log_error(str(e), "Solvronix Desk Install")
        print(f"\n⚠️  after_install warning: {e}\n")


def after_migrate():
    """Re-seed defaults on every bench migrate (idempotent)."""
    after_install()
