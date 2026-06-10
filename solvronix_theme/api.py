import frappe


def darken(hex_color, amount=15):
    hex_color = hex_color.lstrip("#")
    r, g, b = tuple(int(hex_color[i:i + 2], 16) for i in (0, 2, 4))
    return f"#{max(0, r - amount):02x}{max(0, g - amount):02x}{max(0, b - amount):02x}"


@frappe.whitelist()
def get_theme_css():
    """Return :root CSS variable overrides built from Theme Settings."""
    try:
        s = frappe.get_single("Theme Settings")
        primary = s.primary_color or "#E8610A"
        sidebar = s.sidebar_bg or "#0D1B3E"
        css = f""":root {{
  --st-primary:       {primary};
  --st-primary-hover: {darken(primary)};
  --st-dark:          {sidebar};
  --st-dark-deep:     {darken(sidebar)};
  --st-navbar-bg:     {s.navbar_bg or sidebar};
  --st-sidebar-text:  {s.sidebar_text_color or "#FFFFFF"};
  --st-button-text:   {s.button_text_color or "#FFFFFF"};
  --st-login-bg:      {s.login_bg_color or sidebar};
  --st-login-card:    {s.login_card_bg or "#FFFFFF"};
}}"""
        if s.custom_css:
            css += "\n" + s.custom_css
        return css
    except Exception:
        return ""


@frappe.whitelist()
def get_branding():
    """Return branding config dict for JS logo/favicon/title injection."""
    try:
        s = frappe.get_single("Theme Settings")
        return {
            "company_name": s.company_name,
            "logo": s.logo,
            "favicon": s.favicon,
            "tagline": s.tagline,
            "show_powered_by": s.show_powered_by,
        }
    except Exception:
        return {}
