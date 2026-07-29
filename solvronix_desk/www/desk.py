from frappe.www.desk import get_context as _frappe_get_context
import frappe

from solvronix_desk import theme_engine


def get_context(context):
    # Delegate entirely to Frappe's original context setup.
    # This populates desk_theme, boot, csrf_token, app_include_css, etc.
    # Our boot_session hook (boot.py add_boot_data) runs inside frappe.build_bootinfo()
    # so boot.st_primary and boot.st_accent are already present on the boot object.
    _frappe_get_context(context)
    settings = frappe.get_single("Theme Settings")
    config = theme_engine.resolve_config(settings, frappe.session.user)
    context.st_theme_css = theme_engine.render_css(
        config,
        bool(getattr(settings, "theme_enabled", 1)),
    )
