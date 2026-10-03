import frappe
from frappe import _
from frappe.model.document import Document
from frappe.website.utils import clear_cache

from solvronix_desk import theme_engine
from solvronix_desk.login_config import (
    BRANDING_FIELDS,
    DEFAULT_COPY,
    MAX_FEATURE_CARDS,
    branding_sources,
    default_features,
    safe_link,
)

COLOR_FIELDS = ("brand_color", "accent_color", "hero_gradient_from", "hero_gradient_to")
IMAGE_FIELDS = ("logo", "hero_logo", "favicon", "hero_bg_image")


class LoginPageSettings(Document):
    def onload(self):
        # Show the live values on the form while auto-fill is on.
        if self.auto_fetch_branding:
            self.apply_branding()
        # Empty text fields show the built-in copy as a placeholder.
        self.set_onload("default_copy", {field: _(text) for field, text in DEFAULT_COPY.items()})
        self.set_onload("default_features", [_(row.title) for row in default_features()])

    def validate(self):
        if len(self.feature_cards or []) > MAX_FEATURE_CARDS:
            frappe.throw(_("Add at most {0} feature cards.").format(MAX_FEATURE_CARDS))
        for field in COLOR_FIELDS:
            if self.get(field) and not theme_engine.color(self.get(field)):
                frappe.throw(_("{0} must be a hex color like #1B3F7E.").format(self.meta.get_label(field)))
        if self.back_link_url and not safe_link(self.back_link_url):
            frappe.throw(_("Back Link URL must start with / or http(s)://"))
        if self.auto_fetch_branding:
            self.apply_branding()
        self.warn_private_images()

    def on_update(self):
        clear_cache("login")

    def warn_private_images(self):
        # The login page is public; visitors get a 403 on private files.
        private = [self.meta.get_label(f) for f in IMAGE_FIELDS if (self.get(f) or "").startswith("/private/")]
        if private:
            frappe.msgprint(
                _("{0} is a private file, so visitors on the login page can't see it. Re-upload it as a public file.").format(", ".join(private)),
                indicator="orange",
                alert=True,
            )

    def apply_branding(self):
        sources = branding_sources()
        for field in BRANDING_FIELDS:
            self.set(field, sources.get(field) or "")


@frappe.whitelist()
def fetch_branding():
    """Current site branding, for the form's Fetch Branding button."""
    frappe.only_for("System Manager")
    return branding_sources()
