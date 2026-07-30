"""Stable Desk-facing API facade for theme, branding, and user utilities."""

import json
import re

import frappe
from solvronix_desk import theme_engine

# ── 1. LEGACY COMPATIBILITY CONSTANTS / NORMALIZERS ───────────────────────────
# Site-default font size name → root font-size. Rem-based sizing scales with it.
FONT_SIZE_CSS = {
    "Small":   "87.5%",
    "Default": "100%",
    "Large":   "112.5%",
}

HEX_COLOR = re.compile(r"^#[0-9a-fA-F]{6}$")
STUDIO_BLOCKS = ("metrics", "chart", "activity", "quick_actions")
SHADOW_CSS = {
    "None": ("none", "none", "none"),
    "Soft": (
        "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
        "0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)",
        "0 10px 25px rgba(0,0,0,0.12), 0 4px 10px rgba(0,0,0,0.08)",
    ),
    "Elevated": (
        "0 2px 8px rgba(15,23,42,0.10)",
        "0 10px 24px rgba(15,23,42,0.14)",
        "0 20px 48px rgba(15,23,42,0.18)",
    ),
}


def _color(value, fallback=""):
    value = str(value or "").strip()
    return value if HEX_COLOR.fullmatch(value) else fallback


def _clamp(value, low, high, fallback):
    try:
        return max(low, min(high, int(value)))
    except (TypeError, ValueError):
        return fallback


def _contrast_text(color, dark="#19202D", light="#FFFFFF"):
    """Choose readable foreground text for a validated six-digit hex color."""
    color = _color(color)
    if not color:
        return dark
    red, green, blue = (int(color[index:index + 2], 16) for index in (1, 3, 5))
    luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255
    return dark if luminance > 0.62 else light


def _layout(value):
    try:
        items = json.loads(value or "[]") if isinstance(value, str) else value
    except (TypeError, ValueError):
        items = []
    clean = []
    for item in items:
        if item in STUDIO_BLOCKS and item not in clean:
            clean.append(item)
    return clean + [item for item in STUDIO_BLOCKS if item not in clean]


def _theme_config(settings):
    return theme_engine.resolve_config(settings)


# ── 2. THEME CSS / CONFIG COMPATIBILITY ENDPOINTS ──────────────────────────────
# Theme Studio owns publishing; these routes remain stable for older clients.
@frappe.whitelist(allow_guest=True)
def get_theme_css():
    """Return :root CSS variable overrides from Theme Settings.
    Only the base brand colors + site-default font size are emitted — all
    derived shades (navbar darker, login darker, page tint, etc.) are
    auto-computed by color-mix() rules in the static CSS files.
    Per-user font/density overrides are applied client-side on top of this.
    """
    try:
        settings = frappe.get_single("Theme Settings")
        enabled = bool(getattr(settings, "theme_enabled", 1))
        return theme_engine.render_css(
            theme_engine.resolve_config(settings, getattr(frappe.session, "user", None)),
            enabled,
        )
    except Exception:
        frappe.log_error("solvronix_desk.api.get_theme_css failed")
        return ""


@frappe.whitelist()
def get_theme_config():
    """Return the editable Theme Studio configuration."""
    frappe.only_for("System Manager")
    return theme_engine.published_config(frappe.get_single("Theme Settings"))


@frappe.whitelist()
def save_theme_config(config):
    """Compatibility alias for the complete Theme Studio publish endpoint."""
    from solvronix_desk.theme_api import publish_theme_config
    return publish_theme_config(config)


# ── 3. PUBLIC BRANDING ─────────────────────────────────────────────────────────
# Login needs this before authentication, so output is intentionally display-only.
@frappe.whitelist(allow_guest=True)
def get_branding():
    """Return branding config dict for JS logo/favicon/title injection."""
    try:
        s = frappe.get_single("Theme Settings")
        config = theme_engine.resolve_config(s, getattr(frappe.session, "user", None))
        return {
            "company_name": config.get("app_title") or s.company_name,
            "logo":         config.get("company_logo") or s.logo,
            "favicon":      config.get("favicon") or s.favicon,
            "tagline":      s.tagline,
            "login_heading": config.get("login_heading"),
            "login_description": config.get("login_description"),
            "footer_text": config.get("footer_text"),
            "hide_powered": config.get("hide_powered"),
        }
    except Exception:
        frappe.log_error("solvronix_desk.api.get_branding failed")
        return {}


# ── 4. DESK NAVIGATION DATA ────────────────────────────────────────────────────
@frappe.whitelist()
def get_workspaces():
    """Version-proof workspace list for the module switcher, All Options
    panel, and app launcher grid.

    Frappe renamed desk.desktop.get_workspace_sidebar_items to
    get_workspaces between v16.20 and v16.22 (same body, pure rename).
    Try the new name first, fall back to the old one, and fail soft with
    empty data if neither exists so the desk never crashes.
    """
    try:
        from frappe.desk import desktop

        fn = getattr(desktop, "get_workspaces", None) or getattr(
            desktop, "get_workspace_sidebar_items", None
        )
        if fn is None:
            frappe.log_error("solvronix_desk: no workspace list method found in frappe.desk.desktop")
            return {"pages": [], "private_pages": []}
        return fn()
    except Exception:
        frappe.log_error("solvronix_desk.api.get_workspaces failed")
        return {"pages": [], "private_pages": []}


# ── 5. LANGUAGE PREFERENCE ─────────────────────────────────────────────────────
@frappe.whitelist()
def get_available_languages():
    """Return enabled languages for the language switcher in the top toolbar."""
    try:
        langs = frappe.db.get_all(
            "Language",
            filters={"enabled": 1},
            fields=["name as code", "language_name as label", "flag"],
            order_by="language_name asc",
        )
        return langs
    except Exception:
        frappe.log_error("solvronix_desk.api.get_available_languages failed")
        return []


@frappe.whitelist()
def set_user_language(lang_code):
    """Persist the chosen language on the logged-in User record."""
    if not frappe.session.user or frappe.session.user == "Guest":
        frappe.throw("Not permitted")
    if not frappe.db.exists("Language", lang_code):
        frappe.throw(f"Invalid language code: {lang_code}")
    frappe.db.set_value("User", frappe.session.user, "language", lang_code)
    frappe.cache.hdel("bootinfo", frappe.session.user)
    return {"ok": True}


# ── 6. USER WORKSPACE / APPEARANCE UTILITIES ───────────────────────────────────
@frappe.whitelist()
def reset_workspace_for_user():
    """Delete all user-specific Workspace customizations for the current user.

    In Frappe v16, user edits to workspaces are stored as separate Workspace
    docs with for_user = user_email. Deleting them restores the public defaults.
    Replaces the old frappe.desk.desktop.reset_desktop_row_for_user (v14/v15).
    """
    user = frappe.session.user
    if not user or user == "Guest":
        frappe.throw("Not permitted")

    user_workspaces = frappe.db.get_all(
        "Workspace",
        filters={"for_user": user},
        pluck="name",
    )
    for name in user_workspaces:
        frappe.delete_doc("Workspace", name, ignore_permissions=True, force=True)

    frappe.cache.hdel("bootinfo", user)
    return {"reset": len(user_workspaces)}


@frappe.whitelist()
def set_user_theme(theme):
    """Persist dark/light mode preference on the User record.

    Uses frappe.db.set_value (direct SQL) instead of frappe.client.set_value
    (which calls doc.save() → triggers on_update hooks → publishes realtime
    doc_update event → causes 'document modified after you opened it' errors).
    """
    if not frappe.session.user or frappe.session.user == "Guest":
        return
    if theme not in ("Dark", "Light", "Automatic"):
        return
    frappe.db.set_value("User", frappe.session.user, "desk_theme", theme)
    return {"ok": True}
