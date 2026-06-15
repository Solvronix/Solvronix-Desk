from frappe.www.desk import get_context as _frappe_get_context


def get_context(context):
    # Delegate entirely to Frappe's original context setup.
    # This populates desk_theme, boot, csrf_token, app_include_css, etc.
    # Our boot_session hook (boot.py add_boot_data) runs inside frappe.build_bootinfo()
    # so boot.st_primary and boot.st_accent are already present on the boot object.
    _frappe_get_context(context)
