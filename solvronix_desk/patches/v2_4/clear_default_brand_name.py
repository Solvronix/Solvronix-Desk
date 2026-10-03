import frappe

SEEDED_NAME = "Solvronix"


def execute():
    # Before 2.4.0 every install stored the vendor name as the brand name, so
    # customer sites showed it on the login page and Desk. Clear it only where
    # it is still that untouched seed and the site has no such Company, then
    # fill in the site's default Company name instead.
    if not frappe.db.exists("DocType", "Theme Settings"):
        return
    if frappe.db.get_single_value("Theme Settings", "company_name") != SEEDED_NAME:
        return
    if frappe.db.exists("DocType", "Company") and frappe.db.exists("Company", SEEDED_NAME):
        return
    frappe.db.set_single_value("Theme Settings", "company_name", "")
    # Replace it with the site's own organisation name where one exists.
    from solvronix_desk.setup import fill_brand_name

    fill_brand_name()
