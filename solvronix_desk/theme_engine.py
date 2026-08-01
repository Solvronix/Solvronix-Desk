"""Solvronix Theme Studio configuration, validation, profiles, and CSS renderer."""

from __future__ import annotations

import json
import re
from copy import deepcopy
from datetime import datetime

import frappe


# ── 1. VALIDATION LIMITS / CANONICAL SCHEMA ────────────────────────────────────
# These guards bound every administrator-controlled value before CSS generation.
HEX_COLOR = re.compile(r"^#[0-9a-fA-F]{6}$")
SAFE_FONT = re.compile(r"^[a-zA-Z0-9 _,'\"-]{1,100}$")
SAFE_CLASS = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_-]{0,63}$")
SAFE_SCOPE = re.compile(r"^[a-zA-Z0-9 _./:-]{1,140}$")
STUDIO_BLOCKS = ("metrics", "chart", "activity", "quick_actions")
MAX_PROFILES = 40
MAX_VERSIONS = 25


DEFAULT_CONFIG = {
    # Profile / mode
    "preferred_mode": "Light",
    "layout": list(STUDIO_BLOCKS),
    # Main colours
    "brand_color": "#1B3F7E",
    "accent_color": "#F57C00",
    "page_background": "#F5F6F8",
    "card_background": "#FFFFFF",
    "text_color": "#19202D",
    "muted_text_color": "#697386",
    "link_color": "#1B5EA7",
    "border_color": "#E1E5EA",
    "success_color": "#238A57",
    "warning_color": "#C87818",
    "error_color": "#C33D43",
    "info_color": "#2D72B8",
    # Navigation
    "navbar_background": "#102750",
    "toolbar_text_color": "",
    "sidebar_background": "#FFFFFF",
    "sidebar_text_color": "",
    "sidebar_icon_color": "",
    "sidebar_active_color": "#F57C00",
    "sidebar_active_text_color": "",
    "sidebar_hover_color": "#F1F3F6",
    "sidebar_width": 240,
    "sidebar_mode": "Compact",
    "sidebar_auto_collapse": False,
    "logo_size": 28,
    "logo_position": "Left",
    # Buttons and form controls
    "primary_button_color": "#F57C00",
    "secondary_button_color": "#FFFFFF",
    "secondary_button_text": "#273142",
    "button_radius": 6,
    "button_height": 32,
    "button_padding": 14,
    "input_background": "#FFFFFF",
    "input_border_color": "#C9CDD4",
    "focus_color": "#F57C00",
    "checkbox_color": "#F57C00",
    "dropdown_background": "#FFFFFF",
    "readonly_background": "#F3F5F7",
    "disabled_opacity": 55,
    # Typography
    "font_family": "Aptos",
    "base_font_px": 14,
    "heading_scale": 125,
    "font_weight": 400,
    "line_height": 150,
    "label_font_size": 12,
    "table_font_size": 13,
    "custom_font_url": "",
    # Cards, lists, and tables
    "shadow_style": "Soft",
    "corner_radius": 8,
    "card_radius": 10,
    "list_row_height": 42,
    "alternate_row_color": "#FAFBFC",
    "table_header_color": "#F1F3F6",
    "selected_row_color": "#FFF1E4",
    "row_hover_color": "#F7F8FA",
    "density": "Comfortable",
    "report_grid_color": "#E4E7EB",
    # Workspace and dashboards
    "workspace_card_color": "#FFFFFF",
    "shortcut_style": "Soft",
    "number_card_color": "#FFFFFF",
    "chart_background": "#FFFFFF",
    "chart_palette": ["#1B3F7E", "#F57C00", "#238A57", "#2D72B8", "#6B4AA0"],
    "module_icon_style": "Tinted",
    "workspace_width": 1440,
    "empty_state_style": "Illustrated",
    # Login and branding
    "company_logo": "",
    "login_bg_image": "",
    "login_background": "#102750",
    "login_gradient_to": "#1B3F7E",
    "login_gradient_angle": 135,
    "login_card_opacity": 96,
    "login_heading": "Welcome back",
    "login_description": "Sign in to continue to your workspace.",
    "favicon": "",
    "app_title": "",
    "tagline": "",
    "footer_text": "",
    "hide_powered": False,
    # Optional Desk features (stored in the same published Studio payload)
    "enable_command_palette": True,
    "enable_smart_home": True,
    # Layout
    "layout_mode": "Full Width",
    "page_margin": 24,
    "form_column_gap": 20,
    "section_spacing": 24,
    "header_height": 36,
    "sticky_navbar": True,
    "sticky_form_toolbar": True,
    "compact_forms": False,
    # Accessibility
    "high_contrast": False,
    "large_text": False,
    "focus_outline_width": 2,
    "colorblind_palette": "Default",
    "enforce_wcag": False,
    # Advanced
    "custom_css": "",
    "custom_js": "",
    "enable_custom_js": False,
    "custom_variables": {},
    "scoped_rules": [],
    "class_mappings": [],
}


# Field registries make sanitization declarative and keep UI/API behavior aligned.
COLOR_FIELDS = {
    "brand_color", "accent_color", "page_background", "card_background",
    "text_color", "muted_text_color", "link_color", "border_color",
    "success_color", "warning_color", "error_color", "info_color",
    "navbar_background", "toolbar_text_color", "sidebar_background",
    "sidebar_text_color", "sidebar_icon_color", "sidebar_active_color",
    "sidebar_active_text_color",
    "sidebar_hover_color", "primary_button_color", "secondary_button_color",
    "secondary_button_text", "input_background", "input_border_color",
    "focus_color", "checkbox_color", "dropdown_background",
    "readonly_background", "alternate_row_color", "table_header_color",
    "selected_row_color", "row_hover_color", "report_grid_color",
    "workspace_card_color", "number_card_color", "chart_background",
    "login_background", "login_gradient_to",
}
OPTIONAL_COLOR_FIELDS = {
    "toolbar_text_color", "sidebar_text_color", "sidebar_icon_color",
    "sidebar_active_text_color",
}
BOOL_FIELDS = {
    "sidebar_auto_collapse", "sticky_navbar", "sticky_form_toolbar",
    "compact_forms", "hide_powered", "high_contrast", "large_text",
    "enforce_wcag", "enable_custom_js", "enable_command_palette",
    "enable_smart_home",
}
INT_RANGES = {
    "sidebar_width": (200, 360),
    "logo_size": (16, 64),
    "button_radius": (0, 24),
    "button_height": (26, 52),
    "button_padding": (6, 30),
    "disabled_opacity": (20, 80),
    "base_font_px": (11, 20),
    "heading_scale": (100, 180),
    "font_weight": (300, 700),
    "line_height": (120, 200),
    "label_font_size": (10, 16),
    "table_font_size": (10, 18),
    "corner_radius": (0, 24),
    "card_radius": (0, 30),
    "list_row_height": (28, 64),
    "workspace_width": (900, 1920),
    "login_gradient_angle": (0, 360),
    "login_card_opacity": (55, 100),
    "page_margin": (0, 64),
    "form_column_gap": (8, 48),
    "section_spacing": (8, 64),
    "header_height": (32, 64),
    "focus_outline_width": (1, 5),
}
ENUM_FIELDS = {
    "preferred_mode": {"Light", "Dark", "Auto"},
    "sidebar_mode": {"Compact", "Expanded"},
    "logo_position": {"Left", "Center"},
    "shadow_style": {"None", "Soft", "Elevated"},
    "density": {"Comfortable", "Compact"},
    "shortcut_style": {"Solid", "Outline", "Soft"},
    "module_icon_style": {"Plain", "Tinted", "Solid"},
    "empty_state_style": {"Minimal", "Illustrated"},
    "layout_mode": {"Full Width", "Boxed"},
    "colorblind_palette": {"Default", "Deuteranopia", "Protanopia", "Tritanopia"},
}
TEXT_LIMITS = {
    "font_family": 100,
    "custom_font_url": 500,
    "company_logo": 500,
    "login_bg_image": 500,
    "login_heading": 160,
    "login_description": 500,
    "favicon": 500,
    "app_title": 160,
    "tagline": 240,
    "footer_text": 300,
    "custom_css": 50000,
    "custom_js": 30000,
}


# ── 2. PRIMITIVE NORMALIZERS ───────────────────────────────────────────────────
# Helpers fail closed and always return values matching the canonical schema.
def parse_json(value, fallback):
    if isinstance(value, type(fallback)):
        return deepcopy(value)
    try:
        parsed = json.loads(value or "")
        return parsed if isinstance(parsed, type(fallback)) else deepcopy(fallback)
    except (TypeError, ValueError):
        return deepcopy(fallback)


def color(value, fallback=""):
    value = str(value or "").strip().upper()
    return value if HEX_COLOR.fullmatch(value) else fallback


def clamp(value, low, high, fallback):
    try:
        return max(low, min(high, int(value)))
    except (TypeError, ValueError):
        return fallback


def bool_value(value):
    if isinstance(value, str):
        return value.lower() in {"1", "true", "yes", "on"}
    return bool(value)


def contrast_text(background, dark="#19202D", light="#FFFFFF"):
    background = color(background)
    if not background:
        return dark
    red, green, blue = (int(background[i:i + 2], 16) for i in (1, 3, 5))
    luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255
    return dark if luminance > 0.45 else light


def relative_luminance(hex_color):
    values = []
    for index in (1, 3, 5):
        component = int(hex_color[index:index + 2], 16) / 255
        values.append(component / 12.92 if component <= 0.04045 else ((component + 0.055) / 1.055) ** 2.4)
    return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2]


def contrast_ratio(foreground, background):
    high, low = sorted((relative_luminance(foreground), relative_luminance(background)), reverse=True)
    return (high + 0.05) / (low + 0.05)


def clean_url(value):
    value = str(value or "").strip()
    if not value:
        return ""
    if value.startswith(("/files/", "/private/files/", "/assets/")):
        return value[:500]
    if value.startswith(("https://", "http://")):
        return value[:500]
    return ""


def clean_css(value, limit):
    """Keep CSS inside its style element while retaining advanced rule syntax."""
    return re.sub(r"</style", "", str(value or "")[:limit], flags=re.IGNORECASE)


def clean_layout(value):
    items = parse_json(value, []) if isinstance(value, str) else value
    items = items if isinstance(items, list) else []
    clean = []
    for item in items:
        if item in STUDIO_BLOCKS and item not in clean:
            clean.append(item)
    return clean + [item for item in STUDIO_BLOCKS if item not in clean]


# Advanced rules are deliberately bounded; invalid entries are dropped softly.
def sanitize_scoped_rules(value):
    rules = parse_json(value, []) if isinstance(value, str) else value
    clean = []
    for rule in (rules or [])[:30]:
        if not isinstance(rule, dict):
            continue
        scope_type = rule.get("type")
        scope = str(rule.get("scope") or "").strip()
        css = clean_css(rule.get("css"), 10000)
        if scope_type in {"DocType", "Page", "Workspace"} and SAFE_SCOPE.fullmatch(scope) and css:
            clean.append({"type": scope_type, "scope": scope, "css": css})
    return clean


def sanitize_class_mappings(value):
    mappings = parse_json(value, []) if isinstance(value, str) else value
    clean = []
    for mapping in (mappings or [])[:30]:
        if not isinstance(mapping, dict):
            continue
        selector = str(mapping.get("selector") or "").strip()[:300]
        class_name = str(mapping.get("class_name") or "").strip()
        if selector and SAFE_CLASS.fullmatch(class_name):
            clean.append({"selector": selector, "class_name": class_name})
    return clean


def sanitize_custom_variables(value):
    variables = parse_json(value, {}) if isinstance(value, str) else value
    clean = {}
    for name, raw_value in list((variables or {}).items())[:100]:
        name = str(name).strip()
        css_value = str(raw_value).strip()[:500]
        if re.fullmatch(r"--[a-zA-Z][a-zA-Z0-9_-]{0,80}", name) and css_value:
            clean[name] = css_value.replace("</style", "")
    return clean


def sanitize_config(raw, base=None, validate_contrast=True):
    """Normalize an untrusted partial config against a complete safe baseline."""
    raw = parse_json(raw, {}) if isinstance(raw, str) else (raw or {})
    if not isinstance(raw, dict):
        frappe.throw("Invalid theme configuration")
    result = deepcopy(base or DEFAULT_CONFIG)

    for field in COLOR_FIELDS:
        fallback = "" if field in OPTIONAL_COLOR_FIELDS else result[field]
        result[field] = color(raw.get(field, result[field]), fallback)
    for field in BOOL_FIELDS:
        result[field] = bool_value(raw.get(field, result[field]))
    for field, (low, high) in INT_RANGES.items():
        result[field] = clamp(raw.get(field, result[field]), low, high, result[field])
    for field, options in ENUM_FIELDS.items():
        value = raw.get(field, result[field])
        result[field] = value if value in options else result[field]
    for field, limit in TEXT_LIMITS.items():
        value = str(raw.get(field, result[field]) or "")[:limit]
        if field in {"custom_font_url", "company_logo", "login_bg_image", "favicon"}:
            value = clean_url(value)
        elif field == "custom_css":
            value = clean_css(value, limit)
        result[field] = value

    family = result["font_family"].strip()
    result["font_family"] = family if SAFE_FONT.fullmatch(family) else DEFAULT_CONFIG["font_family"]
    result["layout"] = clean_layout(raw.get("layout", result["layout"]))

    palette = raw.get("chart_palette", result["chart_palette"])
    if isinstance(palette, str):
        palette = [item.strip() for item in palette.split(",")]
    clean_palette = [color(item) for item in (palette or [])]
    result["chart_palette"] = [item for item in clean_palette if item][:8] or deepcopy(DEFAULT_CONFIG["chart_palette"])
    result["scoped_rules"] = sanitize_scoped_rules(raw.get("scoped_rules", []))
    result["class_mappings"] = sanitize_class_mappings(raw.get("class_mappings", []))
    result["custom_variables"] = sanitize_custom_variables(raw.get("custom_variables", {}))

    if result["high_contrast"]:
        result["focus_outline_width"] = max(3, result["focus_outline_width"])
    if result["large_text"]:
        result["base_font_px"] = max(16, result["base_font_px"])
    if result["compact_forms"]:
        result["list_row_height"] = min(result["list_row_height"], 36)
    palettes = {
        "Deuteranopia": {
            "success_color": "#0072B2", "warning_color": "#E69F00",
            "error_color": "#D55E00", "info_color": "#56B4E9",
        },
        "Protanopia": {
            "success_color": "#0072B2", "warning_color": "#F0E442",
            "error_color": "#CC79A7", "info_color": "#56B4E9",
        },
        "Tritanopia": {
            "success_color": "#009E73", "warning_color": "#E69F00",
            "error_color": "#D55E00", "info_color": "#0072B2",
        },
    }
    if result["colorblind_palette"] in palettes:
        result.update(palettes[result["colorblind_palette"]])

    if result["enforce_wcag"] and validate_contrast:
        failures = wcag_failures(result)
        if failures:
            frappe.throw("WCAG AA validation failed: " + ", ".join(failures))
    return result


# ── 3. WCAG CONTRAST AUDIT ─────────────────────────────────────────────────────
def wcag_failures(config):
    pairs = [
        ("Text / page", config["text_color"], config["page_background"]),
        ("Text / card", config["text_color"], config["card_background"]),
        ("Link / page", config["link_color"], config["page_background"]),
        (
            "Sidebar text",
            config["sidebar_text_color"] or contrast_text(config["sidebar_background"]),
            config["sidebar_background"],
        ),
        (
            "Toolbar text",
            config["toolbar_text_color"] or contrast_text(config["navbar_background"]),
            config["navbar_background"],
        ),
        (
            "Active menu text",
            config["sidebar_active_text_color"] or contrast_text(config["sidebar_active_color"]),
            config["sidebar_active_color"],
        ),
    ]
    return [name for name, foreground, background in pairs if contrast_ratio(foreground, background) < 4.5]


# ── 4. BUILT-IN AND CUSTOM PROFILES ────────────────────────────────────────────
def _profile(profile_id, name, overrides, description, builtin=True):
    return {
        "id": profile_id,
        "name": name,
        "description": description,
        "builtin": builtin,
        "config": sanitize_config(overrides, validate_contrast=False),
    }


def builtin_profiles():
    return [
        _profile(
            "builtin-frappe", "Frappe Default",
            {
                "brand_color": "#2490EF", "accent_color": "#2490EF",
                "navbar_background": "#FFFFFF", "toolbar_text_color": "#1F272E",
                "sidebar_background": "#FFFFFF", "sidebar_active_color": "#DDEEFF",
                "page_background": "#F7F9FA", "card_background": "#FFFFFF",
                "primary_button_color": "#2490EF", "focus_color": "#2490EF",
                "shadow_style": "None", "corner_radius": 6, "card_radius": 8,
                "font_family": "Aptos",
            },
            "Neutral Frappe-style baseline for reset and comparison.",
        ),
        _profile(
            "builtin-light", "Light", {},
            "Bright neutral surfaces with Solvronix brand accents.",
        ),
        _profile(
            "builtin-dark", "Dark",
            {
                "preferred_mode": "Dark",
                "brand_color": "#17213A", "navbar_background": "#090D16",
                "sidebar_background": "#121826", "sidebar_text_color": "#F4F7FB",
                "sidebar_icon_color": "#B8C3D8", "page_background": "#0F1117",
                "card_background": "#1A1D27", "text_color": "#E8EDF5",
                "muted_text_color": "#9AA7BA", "link_color": "#6DB4F2",
                "border_color": "#303746",
                "input_background": "#222734", "input_border_color": "#3B4354",
                "dropdown_background": "#202531", "readonly_background": "#252A36",
                "table_header_color": "#222734", "alternate_row_color": "#181C25",
                "row_hover_color": "#242A37", "selected_row_color": "#3B2D21",
                "workspace_card_color": "#1A1D27", "number_card_color": "#1A1D27",
                "chart_background": "#1A1D27", "login_background": "#090D16",
                "login_gradient_to": "#17213A",
            },
            "Neutral dark surfaces with accessible navigation contrast.",
        ),
        _profile(
            "builtin-high-contrast", "High Contrast",
            {
                "brand_color": "#000000", "accent_color": "#FFD800",
                "navbar_background": "#000000", "toolbar_text_color": "#FFFFFF",
                "sidebar_background": "#000000", "sidebar_text_color": "#FFFFFF",
                "sidebar_icon_color": "#FFFFFF", "sidebar_active_color": "#FFD800",
                "sidebar_hover_color": "#252525", "page_background": "#FFFFFF",
                "card_background": "#FFFFFF", "text_color": "#000000",
                "muted_text_color": "#333333", "link_color": "#0036B3",
                "border_color": "#000000", "primary_button_color": "#000000",
                "focus_color": "#005FCC", "input_border_color": "#000000",
                "high_contrast": True, "focus_outline_width": 3,
                "shadow_style": "None", "enforce_wcag": True,
            },
            "WCAG-oriented black, white, and yellow interface.",
        ),
        _profile(
            "builtin-solvronix", "Solvronix",
            {"brand_color": "#1B3F7E", "accent_color": "#F57C00"},
            "Solvronix navy and orange identity.",
        ),
        _profile(
            "builtin-forest", "Forest",
            {
                "brand_color": "#173F35", "accent_color": "#D59A28",
                "navbar_background": "#102D26", "link_color": "#176B50",
                "sidebar_active_color": "#D59A28", "focus_color": "#D59A28",
            },
            "Deep forest green with warm brass accents.",
        ),
    ]


# ── 5. LEGACY MIGRATION / STORED PROFILE NORMALIZATION ─────────────────────────
# Older Theme Settings fields remain a baseline for incremental upgrades.
def json_field(settings, field, fallback):
    return parse_json(getattr(settings, field, None), fallback)


def clean_string_map(value, key_limit, value_limit=80):
    if not isinstance(value, dict):
        return {}
    return {
        str(key)[:key_limit]: str(item or "")[:value_limit]
        for key, item in value.items()
        if str(key).strip()
    }


def legacy_config(settings):
    config = deepcopy(DEFAULT_CONFIG)
    mapping = {
        "brand_color": "brand_color",
        "accent_color": "accent_color",
        "sidebar_background": "sidebar_background",
        "navbar_background": "navbar_background",
        "page_background": "page_background",
        "card_background": "card_background",
        "text_color": "text_color",
        "corner_radius": "corner_radius",
        "shadow_style": "shadow_style",
        "sidebar_width": "sidebar_width",
    }
    for target, source in mapping.items():
        value = getattr(settings, source, None)
        if value not in (None, ""):
            config[target] = value
    config["layout"] = clean_layout(getattr(settings, "studio_layout", ""))
    config["company_logo"] = clean_url(getattr(settings, "logo", ""))
    config["favicon"] = clean_url(getattr(settings, "favicon", ""))
    config["app_title"] = str(getattr(settings, "company_name", "") or "")
    config["tagline"] = str(getattr(settings, "tagline", "") or "")
    config["enable_command_palette"] = bool_value(
        getattr(settings, "enable_command_palette", 1)
    )
    config["enable_smart_home"] = bool_value(getattr(settings, "enable_smart_home", 1))
    return sanitize_config(config, validate_contrast=False)


def published_config(settings):
    stored = json_field(settings, "theme_studio_config", {})
    return sanitize_config(stored, legacy_config(settings), validate_contrast=False)


def profiles(settings):
    custom = json_field(settings, "theme_profiles", [])
    clean = []
    for item in custom[:MAX_PROFILES]:
        if not isinstance(item, dict):
            continue
        profile_id = str(item.get("id") or "")[:80]
        name = str(item.get("name") or "")[:100]
        if not profile_id or not name:
            continue
        clean.append(
            {
                "id": profile_id,
                "name": name,
                "description": str(item.get("description") or "")[:300],
                "builtin": False,
                "created": item.get("created"),
                "modified": item.get("modified"),
                "config": sanitize_config(item.get("config"), validate_contrast=False),
            }
        )
    return builtin_profiles() + clean


# ── 6. ASSIGNMENTS, SCHEDULES, AND RESOLUTION PRECEDENCE ───────────────────────
# Schedule wins first, followed by user choice, explicit user/company/role rules,
# the site default profile, and finally the published base configuration.
def profile_by_id(settings, profile_id):
    return next((item for item in profiles(settings) if item["id"] == profile_id), None)


def assignments(settings):
    raw = json_field(
        settings,
        "theme_assignments",
        {"default": "", "users": {}, "roles": {}, "companies": {}},
    )
    return {
        "default": str(raw.get("default") or "")[:80],
        "users": clean_string_map(raw.get("users"), 180),
        "roles": clean_string_map(raw.get("roles"), 140),
        "companies": clean_string_map(raw.get("companies"), 180),
    }


def schedule(settings):
    raw = json_field(settings, "theme_schedule", {})
    return {
        "enabled": bool_value(raw.get("enabled")),
        "profile_id": str(raw.get("profile_id") or "")[:80],
        "activate_at": str(raw.get("activate_at") or "")[:40],
        "deactivate_at": str(raw.get("deactivate_at") or "")[:40],
    }


def schedule_profile(settings, now=None):
    data = schedule(settings)
    if not data["enabled"] or not data["profile_id"]:
        return None
    try:
        now = now or frappe.utils.now_datetime()
        start = frappe.utils.get_datetime(data["activate_at"]) if data["activate_at"] else None
        end = frappe.utils.get_datetime(data["deactivate_at"]) if data["deactivate_at"] else None
        if (not start or now >= start) and (not end or now <= end):
            return profile_by_id(settings, data["profile_id"])
    except Exception:
        return None
    return None


def user_preference(user):
    if not user or user == "Guest" or not frappe.db.exists("DocType", "Theme Preference"):
        return ""
    return frappe.db.get_value("Theme Preference", {"user": user}, "theme_profile") or ""


def resolved_profile(settings, user=None):
    scheduled = schedule_profile(settings)
    if scheduled:
        return scheduled
    user = user or getattr(frappe.session, "user", None)
    rules = assignments(settings)
    if user and user != "Guest":
        locked = bool_value(getattr(settings, "theme_lock", 0))
        allow_choice = bool_value(getattr(settings, "allow_user_theme", 1))
        if allow_choice and not locked:
            selected = user_preference(user)
            if selected:
                found = profile_by_id(settings, selected)
                if found:
                    return found
        explicit = rules["users"].get(user)
        if explicit:
            found = profile_by_id(settings, explicit)
            if found:
                return found
        company = frappe.defaults.get_user_default("Company")
        if company and rules["companies"].get(company):
            found = profile_by_id(settings, rules["companies"][company])
            if found:
                return found
        for role in frappe.get_roles(user):
            if rules["roles"].get(role):
                found = profile_by_id(settings, rules["roles"][role])
                if found:
                    return found
    if rules["default"]:
        found = profile_by_id(settings, rules["default"])
        if found:
            return found
    return None


def resolve_config(settings, user=None):
    base = published_config(settings)
    selected = resolved_profile(settings, user)
    return sanitize_config(selected["config"], base, validate_contrast=False) if selected else base


def resolve_profile_id(settings, user=None):
    selected = resolved_profile(settings, user)
    return selected["id"] if selected else str(getattr(settings, "active_profile", "") or "")


# ── 7. CSS RENDERING HELPERS ───────────────────────────────────────────────────
def shadow_values(style):
    return {
        "None": ("none", "none", "none"),
        "Soft": (
            "0 1px 3px rgba(15,23,42,.08)",
            "0 5px 14px rgba(15,23,42,.09)",
            "0 14px 32px rgba(15,23,42,.13)",
        ),
        "Elevated": (
            "0 2px 8px rgba(15,23,42,.12)",
            "0 12px 28px rgba(15,23,42,.16)",
            "0 24px 56px rgba(15,23,42,.20)",
        ),
    }[style]


def css_attr(value):
    return str(value).replace("\\", "\\\\").replace('"', '\\"')


def render_css(config, enabled=True):
    """Render one sanitized configuration into the complete Desk token sheet."""
    if not enabled:
        return "/* Solvronix custom theme disabled */"
    config = sanitize_config(config, validate_contrast=False)
    # The selected colour mode is not proof that the stored palette itself is
    # dark. A light custom theme may select Dark and should receive our derived
    # dark surfaces instead of reusing white cards inside data-theme="dark".
    has_dark_surfaces = (
        relative_luminance(config["page_background"]) < 0.18
        and relative_luminance(config["card_background"]) < 0.22
    )
    dark_surface = (
        config
        if has_dark_surfaces
        else {
            **config,
            "navbar_background": f'color-mix(in srgb, {config["brand_color"]} 38%, #090D16)',
            "sidebar_background": f'color-mix(in srgb, {config["brand_color"]} 32%, #121826)',
            "sidebar_hover_color": "#242A37",
            "page_background": "#0F1117",
            "card_background": "#1A1D27",
            "text_color": "#E8EDF5",
            "muted_text_color": "#9AA7BA",
            "link_color": "#6DB4F2",
            "border_color": "#303746",
            "secondary_button_color": "#242A37",
            "secondary_button_text": "#E8EDF5",
            "input_background": "#222734",
            "input_border_color": "#3B4354",
            "dropdown_background": "#202531",
            "readonly_background": "#252A36",
            "alternate_row_color": "#181C25",
            "table_header_color": "#222734",
            "selected_row_color": "#3B2D21",
            "row_hover_color": "#242A37",
            "report_grid_color": "#303746",
            "workspace_card_color": "#1A1D27",
            "number_card_color": "#1A1D27",
            "chart_background": "#1A1D27",
        }
    )
    light_surface = (
        {
            **config,
            "navbar_background": DEFAULT_CONFIG["navbar_background"],
            "sidebar_background": "#FFFFFF",
            "sidebar_hover_color": "#F1F3F6",
            "page_background": "#F5F6F8",
            "card_background": "#FFFFFF",
            "text_color": "#19202D",
            "muted_text_color": "#697386",
            "link_color": "#1B5EA7",
            "border_color": "#E1E5EA",
            "secondary_button_color": "#FFFFFF",
            "secondary_button_text": "#273142",
            "input_background": "#FFFFFF",
            "input_border_color": "#C9CDD4",
            "dropdown_background": "#FFFFFF",
            "readonly_background": "#F3F5F7",
            "alternate_row_color": "#FAFBFC",
            "table_header_color": "#F1F3F6",
            "selected_row_color": "#FFF1E4",
            "row_hover_color": "#F7F8FA",
            "report_grid_color": "#E4E7EB",
            "workspace_card_color": "#FFFFFF",
            "number_card_color": "#FFFFFF",
            "chart_background": "#FFFFFF",
        }
        if has_dark_surfaces
        else config
    )
    sidebar_text = config["sidebar_text_color"] or contrast_text(config["sidebar_background"])
    sidebar_icon = config["sidebar_icon_color"] or sidebar_text
    sidebar_active_text = config["sidebar_active_text_color"] or contrast_text(config["sidebar_active_color"])
    toolbar_text = config["toolbar_text_color"] or contrast_text(config["navbar_background"])
    shadows = shadow_values(config["shadow_style"])
    palette = config["chart_palette"]
    font_family = config["font_family"].replace('"', "").replace("'", "")
    custom_font_import = ""
    if config["custom_font_url"]:
        custom_font_import = f'@import url("{config["custom_font_url"]}");\n'

    variables = {
        "--st-brand": config["brand_color"],
        "--st-primary": config["brand_color"],
        "--st-accent": config["accent_color"],
        "--st-page-bg": config["page_background"],
        "--st-card-bg": config["card_background"],
        "--st-text": config["text_color"],
        "--st-text-primary": config["text_color"],
        "--st-text-muted": config["muted_text_color"],
        "--st-link": config["link_color"],
        "--st-border": config["border_color"],
        "--st-card-border": config["border_color"],
        "--st-success": config["success_color"],
        "--st-warning": config["warning_color"],
        "--st-error": config["error_color"],
        "--st-info": config["info_color"],
        "--st-navbar-bg": config["navbar_background"],
        "--st-toolbar-bg": config["navbar_background"],
        "--st-toolbar-text": toolbar_text,
        "--st-sidebar-bg": config["sidebar_background"],
        "--st-sidebar-text": sidebar_text,
        "--st-sidebar-icon": sidebar_icon,
        "--st-sidebar-text-muted": f"color-mix(in srgb, {sidebar_icon} 66%, transparent)",
        "--st-sidebar-active": config["sidebar_active_color"],
        "--st-sidebar-active-text": sidebar_active_text,
        "--st-sidebar-hover": config["sidebar_hover_color"],
        "--st-sidebar-hover-text": contrast_text(config["sidebar_hover_color"]),
        "--st-sidebar-border": f"color-mix(in srgb, {sidebar_text} 13%, transparent)",
        "--st-sidebar-width": f'{config["sidebar_width"]}px',
        "--sidebar-width": f'{config["sidebar_width"]}px',
        "--st-logo-size": f'{config["logo_size"]}px',
        "--st-btn-primary": config["primary_button_color"],
        "--st-btn-primary-text": contrast_text(config["primary_button_color"]),
        "--st-btn-secondary": config["secondary_button_color"],
        "--st-btn-secondary-text": config["secondary_button_text"],
        "--st-button-radius": f'{config["button_radius"]}px',
        "--st-button-height": f'{config["button_height"]}px',
        "--st-button-padding": f'0 {config["button_padding"]}px',
        "--st-input-bg": config["input_background"],
        "--st-input-border": config["input_border_color"],
        "--st-focus": config["focus_color"],
        "--st-checkbox": config["checkbox_color"],
        "--st-dropdown-bg": config["dropdown_background"],
        "--st-readonly-bg": config["readonly_background"],
        "--st-disabled-opacity": str(config["disabled_opacity"] / 100),
        "--st-font-family": f'"{font_family}", "Segoe UI", sans-serif',
        "--st-base-font": f'{config["base_font_px"]}px',
        "--st-heading-scale": str(config["heading_scale"] / 100),
        "--st-font-weight": str(config["font_weight"]),
        "--st-line-height": str(config["line_height"] / 100),
        "--st-label-font": f'{config["label_font_size"]}px',
        "--st-table-font": f'{config["table_font_size"]}px',
        "--st-radius": f'{config["corner_radius"]}px',
        "--st-radius-sm": f'{max(0, config["corner_radius"] - 2)}px',
        "--st-radius-lg": f'{config["corner_radius"] + 4}px',
        "--st-card-radius": f'{config["card_radius"]}px',
        "--st-shadow-sm": shadows[0],
        "--st-shadow-md": shadows[1],
        "--st-shadow-lg": shadows[2],
        "--st-row-height": f'{config["list_row_height"]}px',
        "--st-row-alt": config["alternate_row_color"],
        "--st-table-header": config["table_header_color"],
        "--st-row-selected": config["selected_row_color"],
        "--st-row-hover": config["row_hover_color"],
        "--st-report-grid": config["report_grid_color"],
        "--st-workspace-card": config["workspace_card_color"],
        "--st-number-card": config["number_card_color"],
        "--st-chart-bg": config["chart_background"],
        "--st-chart-1": palette[0],
        "--st-chart-2": palette[1 % len(palette)],
        "--st-chart-3": palette[2 % len(palette)],
        "--st-chart-4": palette[3 % len(palette)],
        "--st-chart-5": palette[4 % len(palette)],
        "--st-workspace-width": f'{config["workspace_width"]}px',
        "--st-login-bg": config["login_background"],
        "--st-login-gradient": f'linear-gradient({config["login_gradient_angle"]}deg, {config["login_background"]}, {config["login_gradient_to"]})',
        "--st-login-card-opacity": f'{config["login_card_opacity"]}%',
        "--st-page-margin": f'{config["page_margin"]}px',
        "--st-form-gap": f'{config["form_column_gap"]}px',
        "--st-section-space": f'{config["section_spacing"]}px',
        "--st-header-height": f'{config["header_height"]}px',
        "--st-focus-width": f'{config["focus_outline_width"]}px',
    }
    variables.update(config["custom_variables"])
    declarations = "\n".join(f"  {name}: {value};" for name, value in variables.items())
    bg_image = (
        f'background-image: linear-gradient(rgba(0,0,0,.12),rgba(0,0,0,.12)), url("{config["login_bg_image"]}") !important;'
        if config["login_bg_image"]
        else "background-image: var(--st-login-gradient) !important;"
    )
    boxed = (
        f".page-container .layout-main-section,.desk-page .layout-main-section{{max-width:{config['workspace_width']}px!important;margin-inline:auto!important;}}"
        if config["layout_mode"] == "Boxed"
        else ""
    )
    # Frappe's body is a horizontal flex container. The toolbar must stay out of
    # normal flow; `position: sticky` makes it a flex item and splits the Desk.
    sticky_nav = (
        "position:fixed!important;top:0;left:0;right:0;width:auto;z-index:1060;"
        if config["sticky_navbar"]
        else "position:absolute!important;top:0;left:0;right:0;width:auto;z-index:1060;"
    )
    sticky_form = "position:sticky!important;top:var(--st-header-height);z-index:1010;" if config["sticky_form_toolbar"] else "position:relative!important;"
    logo_align = "center" if config["logo_position"] == "Center" else "flex-start"
    sidebar_initial = "240px" if config["sidebar_mode"] == "Expanded" else "64px"
    high_contrast = (
        "html{filter:none!important}*{text-shadow:none!important}.btn,.form-control,.frappe-card{border-width:2px!important}"
        if config["high_contrast"] else ""
    )
    large_text = "html{font-size:max(var(--st-base-font),16px)!important}" if config["large_text"] else ""
    hide_powered = (
        ".for-login .powered-by,.page-card .powered-by{display:none!important}"
        ".for-login .page-card-actions::after,.for-forgot .page-card-actions::after"
        "{content:none!important;display:none!important}"
        if config["hide_powered"] else ""
    )
    light_mode_override = ""
    if has_dark_surfaces:
        light_mode_override = f"""
html:not([data-theme="dark"]) {{
  --st-navbar-bg: {light_surface["navbar_background"]};
  --st-toolbar-bg: {light_surface["navbar_background"]};
  --st-toolbar-text: {contrast_text(light_surface["navbar_background"])};
  --st-sidebar-bg: {light_surface["sidebar_background"]};
  --st-sidebar-text: #19202D;
  --st-sidebar-icon: #697386;
  --st-sidebar-text-muted: #697386;
  --st-sidebar-hover: {light_surface["sidebar_hover_color"]};
  --st-sidebar-hover-text: {contrast_text(light_surface["sidebar_hover_color"])};
  --st-page-bg: {light_surface["page_background"]};
  --st-card-bg: {light_surface["card_background"]};
  --st-text: {light_surface["text_color"]};
  --st-text-primary: {light_surface["text_color"]};
  --st-text-muted: {light_surface["muted_text_color"]};
  --st-link: {light_surface["link_color"]};
  --st-border: {light_surface["border_color"]};
  --st-card-border: {light_surface["border_color"]};
  --st-btn-secondary: {light_surface["secondary_button_color"]};
  --st-btn-secondary-text: {light_surface["secondary_button_text"]};
  --st-input-bg: {light_surface["input_background"]};
  --st-input-border: {light_surface["input_border_color"]};
  --st-dropdown-bg: {light_surface["dropdown_background"]};
  --st-readonly-bg: {light_surface["readonly_background"]};
  --st-row-alt: {light_surface["alternate_row_color"]};
  --st-table-header: {light_surface["table_header_color"]};
  --st-row-selected: {light_surface["selected_row_color"]};
  --st-row-hover: {light_surface["row_hover_color"]};
  --st-report-grid: {light_surface["report_grid_color"]};
  --st-workspace-card: {light_surface["workspace_card_color"]};
  --st-number-card: {light_surface["number_card_color"]};
  --st-chart-bg: {light_surface["chart_background"]};
  --bg-color: {light_surface["page_background"]};
  --fg-color: {light_surface["card_background"]};
  --card-bg: {light_surface["card_background"]};
  --control-bg: {light_surface["input_background"]};
  --input-bg: {light_surface["input_background"]};
  --text-color: {light_surface["text_color"]};
  --text-muted: {light_surface["muted_text_color"]};
  --border-color: {light_surface["border_color"]};
}}
"""

    scoped = []
    for rule in config["scoped_rules"]:
        attribute = {"DocType": "data-st-doctype", "Page": "data-st-page", "Workspace": "data-st-workspace"}[rule["type"]]
        selector = f'html[{attribute}="{css_attr(rule["scope"])}"]'
        css = rule["css"]
        scoped.append(f"{selector} {css}" if "{" in css else f"{selector} {{{css}}}")

    return f"""{custom_font_import}:root {{
{declarations}
  font-size: var(--st-base-font);
}}
{light_mode_override}
html[data-theme="dark"] {{
  --st-sidebar-bg: {dark_surface["sidebar_background"]};
  --st-sidebar-text: #FFFFFF;
  --st-sidebar-icon: rgba(255,255,255,.72);
  --st-sidebar-text-muted: rgba(255,255,255,.62);
  --st-sidebar-hover: {dark_surface["sidebar_hover_color"]};
  --st-sidebar-hover-text: {contrast_text(dark_surface["sidebar_hover_color"])};
  --st-navbar-bg: {dark_surface["navbar_background"]};
  --st-toolbar-bg: {dark_surface["navbar_background"]};
  --st-toolbar-text: #FFFFFF;
  --st-page-bg: {dark_surface["page_background"]};
  --st-card-bg: {dark_surface["card_background"]};
  --st-text: {dark_surface["text_color"]};
  --st-text-primary: {dark_surface["text_color"]};
  --st-text-muted: {dark_surface["muted_text_color"]};
  --st-link: {dark_surface["link_color"]};
  --st-border: {dark_surface["border_color"]};
  --st-card-border: {dark_surface["border_color"]};
  --st-btn-secondary: {dark_surface["secondary_button_color"]};
  --st-btn-secondary-text: {dark_surface["secondary_button_text"]};
  --st-input-bg: {dark_surface["input_background"]};
  --st-input-border: {dark_surface["input_border_color"]};
  --st-dropdown-bg: {dark_surface["dropdown_background"]};
  --st-readonly-bg: {dark_surface["readonly_background"]};
  --st-row-alt: {dark_surface["alternate_row_color"]};
  --st-table-header: {dark_surface["table_header_color"]};
  --st-row-selected: {dark_surface["selected_row_color"]};
  --st-row-hover: {dark_surface["row_hover_color"]};
  --st-report-grid: {dark_surface["report_grid_color"]};
  --st-workspace-card: {dark_surface["workspace_card_color"]};
  --st-number-card: {dark_surface["number_card_color"]};
  --st-chart-bg: {dark_surface["chart_background"]};
  --bg-color: {dark_surface["page_background"]};
  --fg-color: {dark_surface["card_background"]};
  --card-bg: {dark_surface["card_background"]};
  --control-bg: {dark_surface["input_background"]};
  --input-bg: {dark_surface["input_background"]};
  --text-color: {dark_surface["text_color"]};
  --text-muted: {dark_surface["muted_text_color"]};
  --border-color: {dark_surface["border_color"]};
}}
html, body, button, input, select, textarea, .form-control {{
  font-family: var(--st-font-family) !important;
  line-height: var(--st-line-height);
}}
body {{ color: var(--st-text) !important; font-weight: var(--st-font-weight); }}
a:not(.btn) {{ color: var(--st-link); }}
h1 {{ font-size: calc(2rem * var(--st-heading-scale)); }}
h2 {{ font-size: calc(1.55rem * var(--st-heading-scale)); }}
h3 {{ font-size: calc(1.25rem * var(--st-heading-scale)); }}
.control-label,.form-group label,.label-area {{ font-size: var(--st-label-font) !important; }}
.btn-primary,button.btn-primary,a.btn-primary {{
  background: var(--st-btn-primary) !important; border-color: var(--st-btn-primary) !important;
  color: var(--st-btn-primary-text) !important;
  border-radius: var(--st-button-radius) !important; min-height: var(--st-button-height) !important;
  padding: var(--st-button-padding) !important;
}}
.btn-primary:hover,button.btn-primary:hover,a.btn-primary:hover {{
  background: color-mix(in srgb,var(--st-btn-primary) 88%,black) !important;
  color: var(--st-btn-primary-text) !important;
}}
.btn-primary > *,button.btn-primary > *,a.btn-primary > *,
.btn-primary svg,button.btn-primary svg,a.btn-primary svg {{
  color: var(--st-btn-primary-text) !important;
  stroke: currentColor !important;
}}
.btn-default,.btn-secondary,button.btn-default {{
  background: var(--st-btn-secondary) !important; color: var(--st-btn-secondary-text) !important;
  border-color: var(--st-input-border) !important; border-radius: var(--st-button-radius) !important;
  min-height: var(--st-button-height) !important;
}}
.btn-default:not(.icon-btn),.btn-secondary:not(.icon-btn),button.btn-default:not(.icon-btn) {{
  padding: var(--st-button-padding) !important;
}}
.btn.icon-btn {{
  width: var(--st-button-height) !important; min-width: var(--st-button-height) !important;
  padding: 6px !important; flex: 0 0 var(--st-button-height);
}}
.btn.icon-btn .icon,.btn.icon-btn .es-icon,
.page-head .breadcrumb a .icon,.page-head .breadcrumb a .es-icon,
.page-head .breadcrumb-area a .icon,.page-head .breadcrumb-area a .es-icon {{
  width: 16px !important; min-width: 16px !important; height: 16px !important;
  color: inherit !important; stroke: currentColor !important;
}}
.btn.icon-btn .icon use,.btn.icon-btn .es-icon use,
.page-head .breadcrumb a svg use,.page-head .breadcrumb-area a svg use {{
  color: inherit !important; stroke: currentColor !important;
}}
.form-control,input:not([type="checkbox"]):not([type="radio"]),textarea,select,.control-input {{
  background-color: var(--st-input-bg) !important; border-color: var(--st-input-border) !important;
  border-radius: var(--st-button-radius) !important;
}}
.form-control:focus,input:focus,textarea:focus,select:focus,.btn:focus-visible,a:focus-visible {{
  border-color: var(--st-focus) !important;
  outline: var(--st-focus-width) solid color-mix(in srgb,var(--st-focus) 42%,transparent) !important;
  outline-offset: 1px;
}}
input[type="checkbox"],input[type="radio"],.switch input {{ accent-color: var(--st-checkbox) !important; }}
.dropdown-menu,.frappe-menu,.awesomplete > ul {{ background: var(--st-dropdown-bg) !important; }}
.form-control[readonly],.control-value.like-disabled-input {{ background: var(--st-readonly-bg) !important; }}
.form-control:disabled,.btn:disabled,[aria-disabled="true"] {{ opacity: var(--st-disabled-opacity) !important; }}
.frappe-card,.form-page,.widget,.desk-card,.number-card {{
  background-color: var(--st-card-bg) !important; border-color: var(--st-card-border) !important;
  border-radius: var(--st-card-radius) !important; box-shadow: var(--st-shadow-md) !important;
}}
.list-row,.dt-row,.grid-row {{ min-height: var(--st-row-height) !important; font-size: var(--st-table-font) !important; }}
.list-row:nth-child(even),.dt-row:nth-child(even) {{ background-color: var(--st-row-alt); }}
.list-row:hover,.dt-row:hover,.grid-row:hover {{ background-color: var(--st-row-hover) !important; }}
.list-row.list-row--selected,.dt-row--highlight,.grid-row.selected {{ background-color: var(--st-row-selected) !important; }}
.list-row-head,.dt-header .dt-row,.grid-heading-row,.report-summary .summary-item {{
  background-color: var(--st-table-header) !important; border-color: var(--st-report-grid) !important;
}}
.dt-cell,.grid-row .data-row .row,.report-view .datatable {{ border-color: var(--st-report-grid) !important; }}
.workspace .widget,.shortcut-widget-box,.links-widget-box {{ background: var(--st-workspace-card) !important; }}
.editor-js-container .ce-header,
.editor-js-container .ce-header .h4,
.editor-js-container .ce-header b {{
  color: var(--st-text) !important;
}}
.number-card,.widget.number-widget-box {{ background: var(--st-number-card) !important; }}
.chart-container,.frappe-chart,.graph-svg-tip {{ background-color: var(--st-chart-bg) !important; }}
.chart-container .dataset-0 {{ color: var(--st-chart-1) !important; }}
.chart-container .dataset-1 {{ color: var(--st-chart-2) !important; }}
.chart-container .dataset-2 {{ color: var(--st-chart-3) !important; }}
.workspace .layout-main-section,.desk-page[data-page-route="Workspaces"] .layout-main-section {{ max-width: var(--st-workspace-width); }}
.page-container {{ padding-inline: var(--st-page-margin) !important; }}
.form-column {{ gap: var(--st-form-gap); }}
.form-section {{ margin-bottom: var(--st-section-space) !important; }}
#st-top-toolbar {{ height: var(--st-header-height) !important; {sticky_nav} }}
body.st-has-toolbar .body-sidebar {{
  margin-top: var(--st-header-height) !important;
  height: calc(100vh - var(--st-header-height)) !important;
}}
body.st-has-toolbar .page-container {{ padding-top: var(--st-header-height) !important; }}
.page-head {{ {sticky_form} }}
#st-company-header {{ justify-content: {logo_align}; }}
#st-company-header img {{ height: var(--st-logo-size) !important; max-height: var(--st-logo-size) !important; }}
.body-sidebar {{ width: {sidebar_initial} !important; }}
.body-sidebar-container.expanded .body-sidebar {{ width: var(--st-sidebar-width) !important; }}
.body-sidebar .standard-sidebar-item.active-sidebar .item-anchor {{
  background: var(--st-sidebar-active) !important; color: var(--st-sidebar-active-text) !important;
}}
.body-sidebar .standard-sidebar-item.active-sidebar .item-anchor *,
.body-sidebar .standard-sidebar-item.active-sidebar .sidebar-item-icon,
.body-sidebar .standard-sidebar-item.active-sidebar .sidebar-item-icon svg,
.body-sidebar .standard-sidebar-item.active-sidebar .sidebar-item-icon svg use {{
  color: var(--st-sidebar-active-text) !important;
  stroke: var(--st-sidebar-active-text) !important;
  fill: var(--st-sidebar-active-text) !important;
}}
.body-sidebar .standard-sidebar-item:not(.active-sidebar) .item-anchor:hover {{
  background: var(--st-sidebar-hover) !important;
  color: var(--st-sidebar-hover-text) !important;
}}
.body-sidebar .standard-sidebar-item:not(.active-sidebar) .item-anchor:hover *,
.body-sidebar .standard-sidebar-item:not(.active-sidebar):hover .sidebar-item-icon,
.body-sidebar .standard-sidebar-item:not(.active-sidebar):hover .sidebar-item-icon svg {{
  color: var(--st-sidebar-hover-text) !important;
  stroke: currentColor !important;
}}
.indicator.green,.alert-success {{ --indicator-color: var(--st-success); }}
.indicator.orange,.alert-warning {{ --indicator-color: var(--st-warning); }}
.indicator.red,.alert-danger {{ --indicator-color: var(--st-error); }}
.indicator.blue,.alert-info {{ --indicator-color: var(--st-info); }}
body:has(.for-login),body:has(.for-forgot),body:has(.for-email-login) {{
  background-color: var(--st-login-bg) !important; {bg_image}
  background-position:center!important;background-size:cover!important;
}}
.for-login .page-card,.for-forgot .page-card,.for-email-login .page-card {{
  background: color-mix(in srgb,var(--st-card-bg) var(--st-login-card-opacity),transparent) !important;
  backdrop-filter: blur(18px);
}}
/* Public login has no Desk runtime, so its explicit data-theme state receives
   the same derived dark surfaces used by Theme Studio's Dark/Auto preview. */
html[data-theme="dark"] .for-login .page-card-head,
html[data-theme="dark"] .for-login .page-card,
html[data-theme="dark"] .for-forgot .page-card-head,
html[data-theme="dark"] .for-forgot .page-card {{
  background: color-mix(in srgb,#1A1D27 var(--st-login-card-opacity),transparent) !important;
  color: #E8EDF5 !important;
}}
html[data-theme="dark"] .for-login .page-card-head h4,
html[data-theme="dark"] .for-login .page-card-head p,
html[data-theme="dark"] .for-forgot .page-card-head h4 {{ color:#E8EDF5!important; }}
html[data-theme="dark"] .for-login .form-control,
html[data-theme="dark"] .for-forgot .form-control {{
  background:#222734!important;border-color:#3B4354!important;color:#E8EDF5!important;
}}
html[data-theme="dark"] .for-login label,
html[data-theme="dark"] .for-forgot label {{ color:#9AA7BA!important; }}
html[data-theme="dark"] .for-login .page-card > .page-card-head,
html[data-theme="dark"] .for-forgot .page-card > .page-card-head {{
  background:transparent!important;
}}
html[data-st-shortcuts="solid"] .shortcut-widget-box {{
  background: var(--st-brand) !important; color: {contrast_text(config["brand_color"])} !important;
}}
html[data-st-shortcuts="outline"] .shortcut-widget-box {{
  background: transparent !important; border: 1px solid var(--st-brand) !important;
}}
html[data-st-shortcuts="soft"] .shortcut-widget-box {{
  background: color-mix(in srgb,var(--st-brand) 8%,var(--st-card-bg)) !important;
}}
html[data-st-icons="tinted"] .sidebar-item-icon,html[data-st-icons="tinted"] .widget .icon {{
  background: color-mix(in srgb,var(--st-accent) 12%,transparent); border-radius: 6px;
}}
html[data-st-icons="solid"] .sidebar-item-icon,html[data-st-icons="solid"] .widget .icon {{
  background: var(--st-accent); color: white !important; border-radius: 6px;
}}
html[data-st-empty-state="minimal"] .empty-state .empty-state-icon,
html[data-st-empty-state="minimal"] .no-result .msgprint-icon {{ display:none!important; }}
html[data-st-density="compact"] .list-row,html[data-st-density="compact"] .grid-row {{
  min-height:min(var(--st-row-height),34px)!important;
}}
{boxed}
{high_contrast}
{large_text}
{hide_powered}
{''.join(scoped)}
{config["custom_css"]}
"""


def now_string():
    return str(frappe.utils.now_datetime())


def new_id(prefix):
    return f"{prefix}-{frappe.generate_hash(length=10)}"


def version_entry(config, label="Published theme"):
    return {
        "id": new_id("version"),
        "label": str(label or "Published theme")[:120],
        "created": now_string(),
        "user": getattr(frappe.session, "user", "Administrator"),
        "config": sanitize_config(config, validate_contrast=False),
    }
