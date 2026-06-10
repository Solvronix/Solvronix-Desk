import frappe


def after_install():
    """Seed default values into Theme Settings after app install."""
    s = frappe.get_single("Theme Settings")
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
        if not getattr(s, field, None):
            s.set(field, val)
    s.save(ignore_permissions=True)
    frappe.db.commit()
    print("\n✅ Solvronix Theme installed!")
    print("→ Configure at /app/theme-settings\n")


def after_migrate():
    """Re-seed defaults on every bench migrate (idempotent)."""
    after_install()
