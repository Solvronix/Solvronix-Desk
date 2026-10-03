"""Public login page configuration: Login Page Settings merged with the site's branding."""

import frappe
from frappe.utils import cint

from solvronix_desk import theme_engine

DOCTYPE = "Login Page Settings"
BRANDING_FIELDS = ("company_name", "logo", "favicon", "brand_color", "accent_color")
LAYOUTS = {"Split Screen": "split", "Centered Card": "centered"}
MAX_FEATURE_CARDS = 4
DEFAULT_FEATURE_ICON = "es-line-tiles"


def public_url(value):
    """clean_url for the guest-facing page: a /private/ file 403s for guests."""
    value = theme_engine.clean_url(value)
    return "" if value.startswith("/private/") else value


# ── 1. BRANDING SOURCES ────────────────────────────────────────────────────────
# Resolved on every render (not copied at install, when no Company exists yet).
# Name: Theme Studio → default Company → Website Settings → System Settings →
# site host. Logo: Theme Studio → default Company → Website/Navbar app logo →
# none (the template shows an initials mark). Framework placeholder names and
# app hook logos are skipped so a fresh site shows the organisation, not the
# software.
GENERIC_NAMES = {"frappe", "frappe framework", "erpnext", "frappe erpnext"}


def theme_config():
    try:
        return theme_engine.resolve_config(frappe.get_cached_doc("Theme Settings"))
    except Exception:
        frappe.log_error("solvronix_desk.login_config: Theme Settings unavailable")
        return dict(theme_engine.DEFAULT_CONFIG)


def real_name(value):
    value = str(value or "").strip()
    return "" if value.lower() in GENERIC_NAMES else value


def default_company():
    try:
        return frappe.defaults.get_global_default("company") or ""
    except Exception:
        return ""


def company_logo(company):
    if not company:
        return ""
    try:
        if not frappe.db.has_column("Company", "company_logo"):
            return ""
        return public_url(frappe.get_cached_value("Company", company, "company_logo"))
    except Exception:
        return ""


def site_logo():
    """Admin-set Website/Navbar logo only, never an app's hook logo."""
    return public_url(frappe.get_website_settings("app_logo")) or public_url(
        frappe.db.get_single_value("Navbar Settings", "app_logo")
    )


def site_host():
    site = str(getattr(frappe.local, "site", "") or "")
    return site.split(".")[0].replace("-", " ").title() if site else ""


def branding_sources(config=None):
    """Return the site's existing branding for the auto-filled fields."""
    config = config if config is not None else theme_config()
    company = default_company()
    return {
        "company_name": (
            real_name(config.get("app_title"))
            or real_name(company)
            or real_name(frappe.get_website_settings("app_name"))
            or real_name(frappe.get_system_settings("app_name"))
            or site_host()
            or "Workspace"
        ),
        "logo": public_url(config.get("company_logo")) or company_logo(company) or site_logo() or "",
        "favicon": (
            public_url(config.get("favicon"))
            or public_url(frappe.get_website_settings("favicon"))
        ),
        "brand_color": theme_engine.color(config.get("brand_color"), theme_engine.DEFAULT_CONFIG["brand_color"]),
        "accent_color": theme_engine.color(config.get("accent_color"), theme_engine.DEFAULT_CONFIG["accent_color"]),
    }


# ── 1b. BUILT-IN COPY ──────────────────────────────────────────────────────────
# Applied at render time to every empty field, so the page is complete on a
# fresh install even if nothing was ever saved. The DB only holds what an admin
# typed; clearing a field brings its default back.
DEFAULT_COPY = {
    "badge_text": "Secure business workspace",
    "headline": "Everything your business runs on, in one place.",
    "description": "Sign in to {company} to manage your customers, operations, finances and team from one secure workspace.",
    "feature_panel_title": "Your workspace at a glance",
    "feature_status_text": "Encrypted connection",
    "card_eyebrow": "Secure sign-in",
    "card_heading": "Welcome back",
    "card_subtitle": "Sign in to your {company} account to continue.",
    "button_label": "Sign in",
    "security_note": "Your connection is encrypted. What you can see depends on your assigned role.",
    "back_link_label": "Back",
}
COPY_FIELDS = tuple(DEFAULT_COPY)

DEFAULT_FEATURES_BUSINESS = (
    ("es-line-reports", "Sales & customers", "Quotes, orders and invoices"),
    ("es-line-plans", "Operations", "Stock, purchasing and projects"),
    ("es-line-people", "Finance & people", "Accounts, reports and your team"),
)
DEFAULT_FEATURES_GENERAL = (
    ("es-line-plans", "Organised work", "Records, tasks and approvals"),
    ("es-line-people", "Team collaboration", "Share, assign and comment"),
    ("es-line-reports", "Reports & insights", "Live dashboards and reports"),
)


def default_features():
    try:
        business = "erpnext" in frappe.get_installed_apps()
    except Exception:
        business = False
    rows = DEFAULT_FEATURES_BUSINESS if business else DEFAULT_FEATURES_GENERAL
    return [frappe._dict(icon=icon, title=title, subtitle=subtitle) for icon, title, subtitle in rows]


# ── 2. MERGED PAGE CONFIG ──────────────────────────────────────────────────────
def safe_link(value):
    """Allow same-site paths and absolute http(s) URLs only."""
    value = str(value or "").strip()
    if value.startswith("/") and not value.startswith("//"):
        return value[:500]
    return value[:500] if value.startswith(("https://", "http://")) else ""


def initials(name):
    words = str(name or "").split()
    return "".join(word[0] for word in words[:2]).upper() or "C"


def text_of(value, company):
    """Translate stored copy, then fill the {company} placeholder so copy stays
    correct when the name changes."""
    value = str(value or "").strip()
    return frappe._(value).replace("{company}", company).strip() if value else ""


def theme_copy(config, key):
    """Theme Studio login text, but only once an admin has changed it."""
    value = str(config.get(key) or "").strip()
    return "" if value == theme_engine.DEFAULT_CONFIG.get(key) else value


def get_settings_doc():
    try:
        return frappe.get_cached_doc(DOCTYPE)
    except Exception:
        # Doctype not migrated yet: behave as if the designer is switched off.
        return None


def get_login_config():
    """Everything the login template needs, with branding fallbacks resolved."""
    config = theme_config()
    brand = branding_sources(config)
    doc = get_settings_doc()
    if not doc:
        return frappe._dict(enabled=False, layout="centered", **brand, preferred_mode=config.get("preferred_mode"))

    auto = cint(doc.auto_fetch_branding)

    def pick(field):
        return brand[field] if auto else (doc.get(field) or brand[field])

    company = pick("company_name")

    def text(field, fallback=""):
        return text_of(doc.get(field) or fallback or DEFAULT_COPY.get(field, ""), company)

    rows = [row for row in (doc.feature_cards or []) if row.title] or default_features()

    features = [
        {
            "icon": row.icon or DEFAULT_FEATURE_ICON,
            "title": text_of(row.title, company),
            "subtitle": text_of(row.subtitle, company),
        }
        for row in rows[:MAX_FEATURE_CARDS]
    ]

    return frappe._dict(
        enabled=bool(cint(doc.enabled)),
        layout=LAYOUTS.get(doc.layout, "split"),
        # Branding
        company_name=company,
        initials=initials(company),
        logo=public_url(pick("logo")) or brand["logo"],
        hero_logo=public_url(doc.hero_logo) or public_url(pick("logo")) or brand["logo"],
        favicon=public_url(pick("favicon")) or brand["favicon"],
        brand_color=theme_engine.color(pick("brand_color"), brand["brand_color"]),
        accent_color=theme_engine.color(pick("accent_color"), brand["accent_color"]),
        # Readable text on the hero/button gradient, which starts at this color.
        on_hero=theme_engine.contrast_text(
            theme_engine.color(doc.hero_gradient_from) or theme_engine.color(pick("brand_color"), brand["brand_color"])
        ),
        # Hero panel
        badge_text=text("badge_text"),
        headline=text("headline"),
        description=text("description"),
        hero_bg_image=public_url(doc.hero_bg_image),
        hero_from=theme_engine.color(doc.hero_gradient_from),
        hero_to=theme_engine.color(doc.hero_gradient_to),
        show_pattern=bool(cint(doc.show_hero_pattern)),
        show_feature_panel=bool(cint(doc.show_feature_panel)) and bool(features),
        feature_panel_title=text("feature_panel_title"),
        feature_status_text=text("feature_status_text"),
        features=features,
        # Sign-in card
        card_eyebrow=text("card_eyebrow"),
        card_heading=text("card_heading", theme_copy(config, "login_heading")),
        card_subtitle=text("card_subtitle", theme_copy(config, "login_description")),
        button_label=text("button_label"),
        security_note=text("security_note"),
        back_link_label=text("back_link_label"),
        back_link_url=safe_link(doc.back_link_url),
        # Carried over from Theme Studio
        preferred_mode=config.get("preferred_mode") or "Light",
        footer_text=config.get("footer_text") or "",
        hide_powered=bool(config.get("hide_powered")),
    )
