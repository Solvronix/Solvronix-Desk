import frappe
from frappe.www.login import get_context as _frappe_get_context

from solvronix_desk.login_config import get_login_config

no_cache = True

SPLIT_TEMPLATE = "solvronix_desk/templates/login/split_login.html"
STOCK_TEMPLATE = "frappe/www/login.html"


def get_context(context):
    """Frappe's login context, plus the Login Page Settings design."""
    preview = is_preview()
    if preview:
        # Frappe redirects signed-in users away from /login; build the page as a guest would see it.
        with as_guest():
            _frappe_get_context(context)
    else:
        _frappe_get_context(context)

    sl = get_login_config()
    if preview:
        # Admins can try a layout before switching it on for everyone.
        sl.enabled = True
        if frappe.form_dict.get("layout") in ("split", "centered"):
            sl.layout = frappe.form_dict.layout
    split = sl.enabled and sl.layout == "split"
    context.sl = sl
    context.sl_preview = preview
    context.sl_base_template = SPLIT_TEMPLATE if split else STOCK_TEMPLATE
    if split:
        context.full_width = True
        context.body_class = f"{context.body_class or ''} sl-split".strip()
        context.title = sl.company_name
    return context


def is_preview():
    return bool(
        frappe.form_dict.get("preview")
        and frappe.session.user != "Guest"
        and "System Manager" in frappe.get_roles()
    )


class as_guest:
    def __enter__(self):
        self.user = frappe.session.user
        frappe.session.user = "Guest"

    def __exit__(self, *exc):
        frappe.session.user = self.user
