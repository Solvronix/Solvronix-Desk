import frappe


def add_boot_data(bootinfo):
    """Populate boot data for desk.html Jinja template and JS."""
    try:
        if frappe.db.get_single_value("Theme Settings", "enable_smart_home"):
            bootinfo.home_page = "smart-home"
    except Exception:
        pass

    # Color vars + branding in boot — zero API calls needed in JS
    try:
        s = frappe.get_single("Theme Settings")
        bootinfo.st_brand  = s.brand_color  or "#1B3F7E"
        bootinfo.st_accent = s.accent_color or "#F57C00"
        bootinfo.st_dark_mode_default = int(s.dark_mode_default or 0)
        bootinfo.st_branding = {
            "company_name": s.company_name or "",
            "logo":         s.logo         or "",
            "favicon":      s.favicon      or "",
            "tagline":      s.tagline      or "",
        }
    except Exception:
        bootinfo.st_brand  = "#1B1D26"
        bootinfo.st_accent = "#6B3E66"
        bootinfo.st_dark_mode_default = 0
        bootinfo.st_branding = {}
