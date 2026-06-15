import frappe
from frappe.model.document import Document


class ThemeSettings(Document):
    def validate(self):
        for field in ("brand_color", "accent_color"):
            value = getattr(self, field, None)
            if value and not value.startswith("#"):
                self.set(field, "#" + value)

    def on_update(self):
        frappe.clear_cache()


@frappe.whitelist(allow_guest=True)
def get_theme_settings():
    """Returns theme settings for JS branding/CSS variable injection."""
    try:
        s = frappe.get_single("Theme Settings")
        return {
            "company_name":           s.company_name,
            "logo":                   s.logo,
            "favicon":                s.favicon,
            "tagline":                s.tagline,
            "brand_color":            s.brand_color  or "#1B3F7E",
            "accent_color":           s.accent_color or "#F57C00",
            "custom_css":             s.custom_css,
            "enable_command_palette": s.enable_command_palette,
            "enable_smart_home":      s.enable_smart_home,
            "dark_mode_default":      s.dark_mode_default,
        }
    except Exception:
        return {
            "brand_color":  "#1B3F7E",
            "accent_color": "#F57C00",
        }
