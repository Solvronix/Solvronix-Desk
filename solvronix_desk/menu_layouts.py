"""Grouped finance menus.

ERPNext 16.5x shows one long Accounts menu: Banking, Taxes, Budgeting and Setup
sit in the same dropdown as the daily invoice work. This splits it the way
ERPNext's own earlier releases did, into modules of their own:

    Invoicing        Sales / Purchase sections (invoices, notes, receivables, payables)
    Banking          bank accounts, transactions, reconciliation, payments
    Taxes            tax templates, rules, categories, withholding
    Budget           budgets, cost-centre allocation, variance
    Accounts Setup   company, fiscal year, cost centres, dimensions, settings

and slims the Accounts menu down to what an accountant opens every day.

Everything is site data, created by ``apply()`` and removed by ``revert()``, so
a site that never switches it on keeps stock Frappe, and switching it off puts
the site back exactly as it was. What it creates is listed in the site default
``st_menu_layout_state``, so ``revert()`` deletes only that.

The sidebar and dock records are written the way an app install writes them
(the system-write flag); Frappe refuses a site-owned Sidebar otherwise, because
its doctype is meant for app files. Nothing under ``apps/`` is touched.

The data and the planning functions are pure (no Frappe import at module level)
so they are unit-tested without a site.
"""

import hashlib
import json

LAYOUT_STANDARD = "Standard"
LAYOUT_GROUPED = "Grouped Finance"
STATE_KEY = "st_menu_layout_state"

HOST_APP = "erpnext"
SOURCE_MODULE = "Accounts"

# Sections of the stock Accounts menu that move out, and the top-level links
# that move to Invoicing. Matched against the live sidebar, so a Frappe release
# that renames or drops one only means that row is not hidden.
MOVED_SECTIONS = ("Banking", "Taxes", "Budgeting", "Setup")
MOVED_LINKS = (("DocType", "Sales Invoice"), ("DocType", "Purchase Invoice"))


def _link(label, link_to, link_type="DocType", icon=None, filters=None):
    item = {"type": "Link", "label": label, "link_type": link_type, "link_to": link_to}
    if icon:
        item["icon"] = icon
    if filters:
        item["filters"] = json.dumps(filters)
    return item


def _section(label, icon=None):
    item = {"type": "Section Break", "label": label}
    if icon:
        item["icon"] = icon
    return item


_HOME = _link("Home", "Accounting", "Workspace", icon="house")

# name -> shell. The dock icon is a lucide name (ERPNext's own "-soft" module
# icons ship no banking/tax/budget picture), the same ones ERPNext's earlier
# desk icons used for these modules.
SHELLS = (
    {
        "name": "Invoicing",
        "icon": "wallet",
        "items": [
            _HOME,
            _section("Sales"),
            _link("Customer", "Customer"),
            _link("Sales Invoice", "Sales Invoice"),
            _link("Credit Note", "Sales Invoice", filters=[["Sales Invoice", "is_return", "=", 1]]),
            _link("Accounts Receivable", "Accounts Receivable", "Report"),
            _section("Purchase"),
            _link("Supplier", "Supplier"),
            _link("Purchase Invoice", "Purchase Invoice"),
            _link("Debit Note", "Purchase Invoice", filters=[["Purchase Invoice", "is_return", "=", 1]]),
            _link("Accounts Payable", "Accounts Payable", "Report"),
        ],
    },
    {
        "name": "Banking",
        "icon": "landmark",
        "items": [
            _HOME,
            _link("Bank Account", "Bank Account"),
            _link("Bank Transaction", "Bank Transaction"),
            _link("Bank Reconciliation Tool", "Bank Reconciliation Tool"),
            _link("Bank Clearance", "Bank Clearance"),
            _link("Bank Statement Import", "Bank Statement Import"),
            _section("Payments"),
            _link("Payment Entry", "Payment Entry"),
            _link("Payment Reconciliation", "Payment Reconciliation"),
        ],
    },
    {
        "name": "Taxes",
        "icon": "book-text",
        "items": [
            _HOME,
            _link("Sales Tax Template", "Sales Taxes and Charges Template"),
            _link("Purchase Tax Template", "Purchase Taxes and Charges Template"),
            _link("Item Tax Template", "Item Tax Template"),
            _link("Tax Rule", "Tax Rule"),
            _link("Tax Category", "Tax Category"),
            _link("Tax Withholding Category", "Tax Withholding Category"),
        ],
    },
    {
        "name": "Budget",
        "icon": "chart-pie",
        "items": [
            _HOME,
            _link("Budget", "Budget"),
            _link("Cost Center Allocation", "Cost Center Allocation"),
            _link("Monthly Distribution", "Monthly Distribution"),
            _link("Budget Variance", "Budget Variance Report", "Report"),
        ],
    },
    {
        "name": "Accounts Setup",
        "icon": "settings",
        "items": [
            _HOME,
            _link("Company", "Company"),
            _link("Fiscal Year", "Fiscal Year"),
            _link("Chart of Cost Centers", "Cost Center"),
            _link("Accounting Dimension", "Accounting Dimension"),
            _link("Account Category", "Account Category"),
            _link("Financial Report Template", "Financial Report Template"),
            _link("Mode of Payment", "Mode of Payment"),
            _link("Payment Terms Template", "Payment Terms Template"),
            _link("Currency Exchange", "Currency Exchange"),
            _link("Settings", "Accounts Settings"),
        ],
    },
)


def shell_names():
    return [shell["name"] for shell in SHELLS]


# ── Pure planning ──────────────────────────────────────────────────────────────
def unlinked_key(item):
    """Frappe's identity for a row that links nowhere (a Section Break)."""
    identity = "{}|{}".format(item.get("type") or "", item.get("label") or "")
    return hashlib.sha1(identity.encode()).hexdigest()[:10]


def hide_rows(base_items):
    """Custom Sidebar rows that hide the moved sections and links from Accounts.

    A row names a base item by its own columns (type, link_type, link_to, url,
    filters); a Section Break is named by a hash of type and label.
    """
    rows = []
    hiding = False
    for item in base_items or ():
        item = dict(item)
        if item.get("type") == "Section Break":
            hiding = item.get("label") in MOVED_SECTIONS
        moved_link = (
            item.get("type") == "Link" and (item.get("link_type"), item.get("link_to")) in MOVED_LINKS
        )
        if not (hiding or moved_link):
            continue
        row = {
            "type": item.get("type"),
            "label": item.get("label"),
            "link_type": item.get("link_type"),
            "link_to": item.get("link_to"),
            "url": item.get("url"),
            "filters": item.get("filters"),
            "hidden": 1,
            "added": 0,
        }
        if item.get("type") == "Section Break":
            row["key"] = unlinked_key(item)
        rows.append(row)
    return rows


def dock_rows(base_rows):
    """The site's dock layer for the host app: every base row kept in order as a
    reference, and the new modules added right after Accounts."""
    rows = []
    placed = False

    def new_rows():
        return [
            {"link_type": "Sidebar", "link_to": shell["name"], "title": shell["name"], "icon": shell["icon"], "added": 1}
            for shell in SHELLS
        ]

    for row in base_rows or ():
        rows.append({"link_type": row.get("link_type"), "link_to": row.get("link_to"), "added": 0})
        if row.get("link_type") == "Sidebar" and row.get("link_to") == SOURCE_MODULE and not placed:
            rows.extend(new_rows())
            placed = True
    if not placed:
        rows.extend(new_rows())
    return rows


def moved_item_coverage(base_items):
    """For tests: every item the stock Accounts menu has is either kept there or
    reachable from at least one new module. Returns the labels that would be lost."""
    hidden = {(r["type"], r["link_type"], r["link_to"], r["url"], r["label"] if r["type"] == "Section Break" else None)
              for r in hide_rows(base_items)}
    new_targets = {
        (item.get("link_type"), item.get("link_to"))
        for shell in SHELLS
        for item in shell["items"]
        if item["type"] == "Link"
    }
    lost = []
    for item in base_items or ():
        if item.get("type") != "Link":
            continue
        ident = (item.get("type"), item.get("link_type"), item.get("link_to"), item.get("url"), None)
        if ident in hidden and (item.get("link_type"), item.get("link_to")) not in new_targets:
            # the stock "Banking" URL row is the pointer to the old banking page; the new module replaces it
            if item.get("link_type") == "URL":
                continue
            lost.append(item.get("label"))
    return lost


# ── Site data ──────────────────────────────────────────────────────────────────
def _frappe():
    import frappe

    return frappe


def get_state():
    frappe = _frappe()
    raw = frappe.defaults.get_global_default(STATE_KEY)
    if not raw:
        return None
    try:
        return json.loads(raw)
    except (TypeError, ValueError):
        return None


def current_layout():
    return LAYOUT_GROUPED if get_state() else LAYOUT_STANDARD


def preflight():
    """What already exists on this site that applying would collide with."""
    frappe = _frappe()
    from frappe.desk.doctype.dock.dock import SITE_LAYER as DOCK_SITE
    from frappe.desk.doctype.custom_sidebar.custom_sidebar import SITE_LAYER as CUSTOM_SITE

    problems = []
    for name in shell_names():
        if frappe.db.exists("Module Def", name):
            problems.append("a module named {0} already exists".format(name))
        if frappe.db.exists("Sidebar", name):
            problems.append("a sidebar named {0} already exists".format(name))
    if frappe.db.exists("Custom Sidebar", {"module": SOURCE_MODULE, "user": CUSTOM_SITE}):
        problems.append("this site already customises the {0} menu".format(SOURCE_MODULE))
    if frappe.db.exists("Dock", {"app": HOST_APP, "standard": 0, "user": DOCK_SITE}):
        problems.append("this site already customises the {0} dock".format(HOST_APP))
    return problems


def _clear_boot_cache():
    frappe = _frappe()
    frappe.cache.delete_key("bootinfo")
    frappe.clear_cache()


def apply():
    """Switch the grouped finance menus on for this site. Safe to call twice."""
    frappe = _frappe()
    frappe.only_for("System Manager")
    if get_state():
        return {"layout": LAYOUT_GROUPED, "changed": False}

    problems = preflight()
    if problems:
        frappe.throw(
            "Grouped finance menus were not switched on, because " + "; ".join(problems) + ".",
            title="Not switched on",
        )

    from frappe.desk.doctype.dock.dock import SITE_LAYER as DOCK_SITE, get_dock
    from frappe.desk.doctype.custom_sidebar.custom_sidebar import SITE_LAYER as CUSTOM_SITE

    base = frappe.get_doc("Sidebar", SOURCE_MODULE)
    base_items = [item.as_dict() for item in base.items]
    base_dock = get_dock(HOST_APP, standard=1)
    base_dock_rows = [row.as_dict() for row in base_dock.items] if base_dock else []

    state = {"module_defs": [], "sidebars": [], "dock": None, "custom_sidebar": None}
    previous = frappe.flags.in_patch
    frappe.flags.in_patch = True  # the way an app install writes sidebar and dock records
    try:
        for shell in SHELLS:
            frappe.get_doc(
                {"doctype": "Module Def", "module_name": shell["name"], "custom": 1, "app_name": HOST_APP}
            ).insert(ignore_permissions=True)
            state["module_defs"].append(shell["name"])
            sidebar = frappe.get_doc(
                {
                    "doctype": "Sidebar",
                    "module": shell["name"],
                    "title": shell["name"],
                    "header_icon": shell["icon"],
                    "app": HOST_APP,
                    "standard": 0,
                    "items": [dict(item) for item in shell["items"]],
                }
            ).insert(ignore_permissions=True)
            state["sidebars"].append(sidebar.name)

        rows = hide_rows(base_items)
        if rows:
            custom = frappe.get_doc(
                {"doctype": "Custom Sidebar", "module": SOURCE_MODULE, "user": CUSTOM_SITE, "sidebar_items": rows}
            ).insert(ignore_permissions=True)
            state["custom_sidebar"] = custom.name

        dock = frappe.get_doc(
            {"doctype": "Dock", "app": HOST_APP, "standard": 0, "user": DOCK_SITE, "items": dock_rows(base_dock_rows)}
        ).insert(ignore_permissions=True)
        state["dock"] = dock.name

        frappe.defaults.set_global_default(STATE_KEY, json.dumps(state))
    except Exception:
        frappe.db.rollback()
        raise
    finally:
        frappe.flags.in_patch = previous
    _clear_boot_cache()
    return {"layout": LAYOUT_GROUPED, "changed": True}


def revert():
    """Put the site back to stock menus by deleting exactly what apply() created."""
    frappe = _frappe()
    frappe.only_for("System Manager")
    state = get_state()
    if not state:
        return {"layout": LAYOUT_STANDARD, "changed": False}

    previous = frappe.flags.in_patch
    frappe.flags.in_patch = True
    try:
        if state.get("dock") and frappe.db.exists("Dock", state["dock"]):
            frappe.delete_doc("Dock", state["dock"], ignore_permissions=True, force=True)
        if state.get("custom_sidebar") and frappe.db.exists("Custom Sidebar", state["custom_sidebar"]):
            frappe.delete_doc("Custom Sidebar", state["custom_sidebar"], ignore_permissions=True, force=True)
        for name in state.get("sidebars") or ():
            if frappe.db.exists("Sidebar", name):
                frappe.delete_doc("Sidebar", name, ignore_permissions=True, force=True)
        for name in state.get("module_defs") or ():
            if frappe.db.exists("Module Def", name):
                frappe.delete_doc("Module Def", name, ignore_permissions=True, force=True)
        frappe.defaults.clear_default(STATE_KEY)
        frappe.db.delete("DefaultValue", {"defkey": STATE_KEY})
    except Exception:
        frappe.db.rollback()
        raise
    finally:
        frappe.flags.in_patch = previous
    _clear_boot_cache()
    return {"layout": LAYOUT_STANDARD, "changed": True}


def apply_if_possible():
    """Switch the grouped menus on for a fresh install, quietly.

    Used by ``after_install``: a site without ERPNext's Accounts menu, or one that
    already customises it, simply keeps its menus. Never raises.
    """
    frappe = _frappe()
    try:
        if get_state() or not frappe.db.exists("Sidebar", SOURCE_MODULE):
            return False
        if preflight():
            return False
        frappe.set_user("Administrator")
        apply()
        return True
    except Exception:
        frappe.log_error("solvronix_desk.menu_layouts: grouped menus not switched on at install")
        return False


def set_layout(layout):
    layout = layout or LAYOUT_STANDARD
    if layout == LAYOUT_GROUPED:
        return apply()
    if layout == LAYOUT_STANDARD:
        return revert()
    _frappe().throw("Unknown menu layout: {0}".format(layout))
