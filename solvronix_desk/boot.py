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
        from solvronix_desk import theme_engine
        config = theme_engine.resolve_config(s, frappe.session.user)
        bootinfo.st_brand  = config["brand_color"]
        bootinfo.st_accent = config["accent_color"]
        bootinfo.st_dark_mode_default = int(s.dark_mode_default or 0)

        # Personalization defaults (v1.2.0) — per-user localStorage overrides win in JS
        theme_mode = config.get("preferred_mode") or getattr(s, "default_theme_mode", None) or ""
        if not theme_mode:
            # legacy fallback: old "Start in Dark Mode" checkbox
            theme_mode = "Dark" if s.dark_mode_default else "Light"
        bootinfo.st_theme_mode_default = theme_mode.lower()          # light | dark | auto
        bootinfo.st_density_default    = (config.get("density") or getattr(s, "default_density", None) or "Comfortable").lower()
        from solvronix_desk.api import FONT_SIZE_CSS
        bootinfo.st_font_size_default  = f'{config.get("base_font_px", 14)}px'
        bootinfo.st_branding = {
            "company_name": config.get("app_title") or s.company_name or "",
            "logo":         config.get("company_logo") or s.logo or "",
            "favicon":      config.get("favicon") or s.favicon or "",
            "tagline":      s.tagline      or "",
        }
        bootinfo.st_theme_config = config
        bootinfo.st_theme_profiles = [
            {"id": p["id"], "name": p["name"], "builtin": p["builtin"]}
            for p in theme_engine.profiles(s)
        ]
        bootinfo.st_theme_flags = {
            "enabled": int(getattr(s, "theme_enabled", 1)),
            "allow_user_theme": int(getattr(s, "allow_user_theme", 1)),
            "locked": int(getattr(s, "theme_lock", 0)),
        }
        bootinfo.st_theme_schedule = theme_engine.schedule(s)
        active_profile = theme_engine.resolved_profile(s, frappe.session.user)
        bootinfo.st_active_theme_profile = active_profile["id"] if active_profile else ""
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
        bootinfo.st_theme_mode_default = "light"
        bootinfo.st_density_default = "comfortable"
        bootinfo.st_font_size_default = "100%"
        bootinfo.st_branding = {}
        bootinfo.st_install_key = "v1"
        bootinfo.st_theme_config = {}
        bootinfo.st_theme_profiles = []
        bootinfo.st_theme_flags = {"enabled": 1, "allow_user_theme": 0, "locked": 1}
        bootinfo.st_theme_schedule = {"enabled": False}
        bootinfo.st_active_theme_profile = ""
