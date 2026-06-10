import frappe


def after_install():
    """Seed default values into Theme Settings after app install."""
    try:
        if not frappe.db.exists("DocType", "Theme Settings"):
            return
        defaults = {
            "primary_color": "#E8610A",
            "sidebar_bg": "#0D1B3E",
            "navbar_bg": "#0D1B3E",
            "sidebar_text_color": "#FFFFFF",
            "button_text_color": "#FFFFFF",
            "login_bg_color": "#0D1B3E",
            "login_card_bg": "#FFFFFF",
            "show_powered_by": 1,
            "hide_frappe_brand": 0,
        }
        for field, val in defaults.items():
            existing = frappe.db.get_single_value("Theme Settings", field)
            if not existing:
                frappe.db.set_single_value("Theme Settings", field, val)
        frappe.db.commit()
        print("\n✅ Solvronix Theme installed!")
        print("→ Configure at /app/theme-settings\n")
    except Exception as e:
        frappe.log_error(str(e), "Solvronix Theme Install")
        print(f"\n⚠️  after_install warning: {e}\n")


def after_migrate():
    """Re-seed defaults on every bench migrate (idempotent)."""
    after_install()
