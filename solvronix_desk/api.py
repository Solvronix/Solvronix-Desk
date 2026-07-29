import json
import re

import frappe

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
    config = {
        "brand_color": _color(settings.brand_color, "#1B3F7E"),
        "accent_color": _color(settings.accent_color, "#F57C00"),
        "sidebar_background": _color(getattr(settings, "sidebar_background", "")),
        "navbar_background": _color(getattr(settings, "navbar_background", "")),
        "page_background": _color(getattr(settings, "page_background", "")),
        "card_background": _color(getattr(settings, "card_background", "")),
        "text_color": _color(getattr(settings, "text_color", "")),
        "corner_radius": _clamp(getattr(settings, "corner_radius", 8), 0, 24, 8),
        "shadow_style": (
            getattr(settings, "shadow_style", "Soft")
            if getattr(settings, "shadow_style", "Soft") in SHADOW_CSS
            else "Soft"
        ),
        "sidebar_width": _clamp(getattr(settings, "sidebar_width", 240), 200, 320, 240),
        "layout": _layout(getattr(settings, "studio_layout", "")),
    }
    config["sidebar_text"] = _contrast_text(config["sidebar_background"] or "#FFFFFF")
    config["toolbar_text"] = _contrast_text(
        config["navbar_background"] or config["brand_color"]
    )
    return config


@frappe.whitelist(allow_guest=True)
def get_theme_css():
    """Return :root CSS variable overrides from Theme Settings.
    Only the base brand colors + site-default font size are emitted — all
    derived shades (navbar darker, login darker, page tint, etc.) are
    auto-computed by color-mix() rules in the static CSS files.
    Per-user font/density overrides are applied client-side on top of this.
    """
    try:
        s = frappe.get_single("Theme Settings")
        config = _theme_config(s)
        brand = config["brand_color"]
        accent = config["accent_color"]
        font   = FONT_SIZE_CSS.get(getattr(s, "base_font_size", None) or "Default", "100%")
        overrides = []
        for field, token in (
            ("sidebar_background", "--st-sidebar-bg"),
            ("navbar_background", "--st-navbar-bg"),
            ("navbar_background", "--st-toolbar-bg"),
            ("page_background", "--st-page-bg"),
            ("card_background", "--st-card-bg"),
            ("text_color", "--st-text"),
            ("text_color", "--st-text-primary"),
        ):
            if config[field]:
                overrides.append(f"  {token}: {config[field]};")
        radius = config["corner_radius"]
        shadows = SHADOW_CSS[config["shadow_style"]]
        if config["sidebar_background"]:
            sidebar_text = _contrast_text(config["sidebar_background"])
            overrides.extend(
                (
                    f"  --st-sidebar-text: {sidebar_text};",
                    f"  --st-sidebar-text-muted: color-mix(in srgb, {sidebar_text} 62%, transparent);",
                    f"  --st-sidebar-hover: color-mix(in srgb, {sidebar_text} 9%, transparent);",
                    f"  --st-sidebar-border: color-mix(in srgb, {sidebar_text} 12%, transparent);",
                )
            )
        if config["navbar_background"]:
            toolbar_text = _contrast_text(config["navbar_background"])
            overrides.append(f"  --st-toolbar-text: {toolbar_text};")
        dark_overrides = []
        for field, token in (
            ("sidebar_background", "--st-sidebar-bg"),
            ("navbar_background", "--st-navbar-bg"),
        ):
            if config[field]:
                dark_overrides.append(f"  {token}: {config[field]};")
        css = f""":root {{
  --st-brand:   {brand};
  --st-accent:  {accent};
  --st-primary: var(--st-brand);
  --st-font-size: {font};
  --st-radius: {radius}px;
  --st-radius-sm: {max(0, radius - 2)}px;
  --st-radius-lg: {radius + 4}px;
  --st-sidebar-width: {config["sidebar_width"]}px;
  --sidebar-width: {config["sidebar_width"]}px;
  --st-shadow-sm: {shadows[0]};
  --st-shadow-md: {shadows[1]};
  --st-shadow-lg: {shadows[2]};
{chr(10).join(overrides)}
  font-size: {font};
}}
{f'''[data-theme="dark"] {{
{chr(10).join(dark_overrides)}
}}''' if dark_overrides else ''}"""
        return css
    except Exception:
        frappe.log_error("solvronix_desk.api.get_theme_css failed")
        return ""


@frappe.whitelist()
def get_theme_config():
    """Return the editable Theme Studio configuration."""
    frappe.only_for("System Manager")
    return _theme_config(frappe.get_single("Theme Settings"))


@frappe.whitelist()
def save_theme_config(config):
    """Validate and save values coming from the visual Theme Studio."""
    frappe.only_for("System Manager")
    if isinstance(config, str):
        try:
            config = json.loads(config)
        except (TypeError, ValueError):
            frappe.throw("Invalid theme configuration")
    if not isinstance(config, dict):
        frappe.throw("Invalid theme configuration")

    settings = frappe.get_single("Theme Settings")
    settings.brand_color = _color(config.get("brand_color"), "#1B3F7E")
    settings.accent_color = _color(config.get("accent_color"), "#F57C00")
    for field in (
        "sidebar_background",
        "navbar_background",
        "page_background",
        "card_background",
        "text_color",
    ):
        settings.set(field, _color(config.get(field)))
    settings.corner_radius = _clamp(config.get("corner_radius"), 0, 24, 8)
    settings.sidebar_width = _clamp(config.get("sidebar_width"), 200, 320, 240)
    settings.shadow_style = (
        config.get("shadow_style") if config.get("shadow_style") in SHADOW_CSS else "Soft"
    )
    settings.studio_layout = json.dumps(_layout(config.get("layout")))
    settings.save()
    return {"config": _theme_config(settings), "css": get_theme_css()}


@frappe.whitelist(allow_guest=True)
def get_branding():
    """Return branding config dict for JS logo/favicon/title injection."""
    try:
        s = frappe.get_single("Theme Settings")
        return {
            "company_name": s.company_name,
            "logo":         s.logo,
            "favicon":      s.favicon,
            "tagline":      s.tagline,
        }
    except Exception:
        frappe.log_error("solvronix_desk.api.get_branding failed")
        return {}


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
