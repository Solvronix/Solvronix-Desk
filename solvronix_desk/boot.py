import frappe


def add_boot_data(bootinfo):
    """Populate boot data for desk.html Jinja template and JS."""
    try:
        if frappe.db.get_single_value("Theme Settings", "enable_smart_home"):
            bootinfo.home_page = "smart-home"
    except Exception:
        frappe.log_error("solvronix_desk: boot home_page check failed")
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
        # Install key: first 10 chars of creation timestamp.
        # Changes on every fresh install, so the localStorage dismiss key
        # becomes invalid after reinstall and the setup guide shows again.
        creation = frappe.db.get_single_value("Theme Settings", "creation") or ""
        bootinfo.st_install_key = str(creation)[:10].replace("-", "")
        bootinfo.enable_command_palette = int(s.enable_command_palette or 1)
    except Exception:
        frappe.log_error("solvronix_desk: boot data failed")
        bootinfo.st_brand  = "#1B3F7E"
        bootinfo.st_accent = "#F57C00"
        bootinfo.st_dark_mode_default = 0
        bootinfo.st_branding = {}
        bootinfo.st_install_key = "v1"
