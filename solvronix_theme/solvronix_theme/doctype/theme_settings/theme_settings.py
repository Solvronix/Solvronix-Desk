import frappe
from frappe.model.document import Document


class ThemeSettings(Document):
    def validate(self):
        color_fields = [
            "primary_color",
            "sidebar_bg",
            "navbar_bg",
            "sidebar_text_color",
            "button_text_color",
            "login_bg_color",
            "login_card_bg",
        ]
        for field in color_fields:
            value = getattr(self, field, None)
            if value and not value.startswith("#"):
                self.set(field, "#" + value)

    def on_update(self):
        frappe.clear_cache()
