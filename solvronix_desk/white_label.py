"""One place that decides which links count as "the vendor's" and keeps them out of the Desk.

Frappe's Desk sends people to its own websites in many places: the Help menu
(Documentation, Forum, School, Report an Issue, Support), sidebar promotions,
contextual help links, the About dialog and a few buttons. A product built on
Solvronix Desk wants its own documentation and support there, or nothing.

The list of vendor hosts lives here and only here. ``apply_to_boot`` sends it to the
browser (``frappe.boot.st_white_label``) together with the site's own documentation and
support links, and ``public/js/white_label.js`` applies it: Help menu rows, contextual help
links, promotions, buttons and the About dialog.

The matching is done in the browser on purpose: Frappe assigns the Help menu data
(``bootinfo["navbar_settings"]``) after every app's boot hook has run, so a server-side clean-up
of it is overwritten.

Nothing is edited in Frappe or ERPNext. Legal text stays: a link whose address
points at a license, copyright, notice or attribution page is never treated as
a vendor link, the About dialog keeps its version list, and the source-code link
in it is kept (see ``KEEP_IN_ABOUT`` in the script).
"""

# Matched against the host and any of its subdomains (docs.erpnext.com, support.frappe.io, ...).
VENDOR_HOSTS = (
    "frappe.io",
    "frappeframework.com",
    "frappe.school",
    "frappecloud.com",
    "erpnext.com",
    "frappehr.com",
)
# github.com/frappe/..., github.com/frappe (issues, source). Other GitHub owners are not vendor links.
GITHUB_OWNER_PREFIX = "/frappe"
# A link whose path says it is legal text stays, whatever host it is on.
LEGAL_HINTS = ("license", "licence", "copyright", "attribution", "notice")


def own_help_items(config):
    """Help rows for the site's own documentation and support, from Theme Studio."""
    rows = []
    for key, label, name in (
        ("help_url", "Documentation", "st-help-documentation"),
        ("support_url", "Support", "st-help-support"),
    ):
        url = str((config or {}).get(key) or "").strip()
        if url.startswith(("https://", "http://")):
            rows.append(
                {
                    "name": name,
                    "item_label": label,
                    "item_type": "Route",
                    "route": url,
                    "action": "",
                    "hidden": 0,
                    "is_standard": 0,
                    "condition": "",
                }
            )
    return rows


def enabled(config):
    """On unless an administrator switched it off (an explicit 0/False, never a missing key)."""
    value = (config or {}).get("hide_vendor_links", True)
    return value not in (False, 0, "0", "false", "False")


def apply_to_boot(bootinfo, config):
    """Tell the browser what counts as a vendor link and which links of the site's own to add."""
    if not enabled(config):
        bootinfo.st_white_label = {"enabled": False}
        return
    bootinfo.st_white_label = {
        "enabled": True,
        "hosts": list(VENDOR_HOSTS),
        "github_prefix": GITHUB_OWNER_PREFIX,
        "legal_hints": list(LEGAL_HINTS),
        "own_help": own_help_items(config),
    }
