import frappe
from frappe.model.document import Document


class ThemePreference(Document):
    """Validate per-user profile choices against current site theme policy."""

    def validate(self):
        # Managers may administer another user's preference; users may edit only theirs.
        is_manager = "System Manager" in frappe.get_roles()
        if self.user and self.user != frappe.session.user and not is_manager:
            frappe.throw("You can only change your own theme preference")
        settings = frappe.get_single("Theme Settings")
        if not is_manager and (
            getattr(settings, "theme_lock", 0)
            or not getattr(settings, "allow_user_theme", 1)
        ):
            frappe.throw("Theme selection is locked by an administrator")

        # Stored IDs must always resolve to a current built-in or custom profile.
        from solvronix_desk import theme_engine
        if self.theme_profile and not theme_engine.profile_by_id(settings, self.theme_profile):
            frappe.throw("Theme profile not found")
