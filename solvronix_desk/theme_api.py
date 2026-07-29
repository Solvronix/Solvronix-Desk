"""Whitelisted API surface for the complete Theme Studio."""

import frappe

from solvronix_desk import theme_engine


def manager_only():
    frappe.only_for("System Manager")


def studio_state(settings=None):
    settings = settings or frappe.get_single("Theme Settings")
    published = theme_engine.published_config(settings)
    stored_draft = theme_engine.json_field(settings, "theme_studio_draft", {})
    draft = (
        theme_engine.sanitize_config(stored_draft, published, validate_contrast=False)
        if stored_draft
        else published
    )
    versions = theme_engine.json_field(settings, "theme_versions", [])[:theme_engine.MAX_VERSIONS]
    users = frappe.get_all(
        "User",
        filters={"enabled": 1},
        fields=["name", "full_name"],
        order_by="full_name asc",
        limit_page_length=250,
    )
    roles = frappe.get_all("Role", pluck="name", order_by="name asc", limit_page_length=250)
    companies = (
        frappe.get_all("Company", pluck="name", order_by="name asc", limit_page_length=250)
        if frappe.db.exists("DocType", "Company")
        else []
    )
    return {
        "config": draft,
        "published": published,
        "profiles": theme_engine.profiles(settings),
        "versions": versions,
        "assignments": theme_engine.assignments(settings),
        "schedule": theme_engine.schedule(settings),
        "flags": {
            "enabled": bool(getattr(settings, "theme_enabled", 1)),
            "allow_user_theme": bool(getattr(settings, "allow_user_theme", 1)),
            "theme_lock": bool(getattr(settings, "theme_lock", 0)),
            "preview_admin_only": bool(getattr(settings, "preview_admin_only", 1)),
            "active_profile": getattr(settings, "active_profile", "") or "",
        },
        "options": {"users": users, "roles": roles, "companies": companies},
        "wcag_failures": theme_engine.wcag_failures(draft),
    }


@frappe.whitelist()
def get_theme_studio_state():
    manager_only()
    return studio_state()


@frappe.whitelist()
def preview_theme_css(config):
    manager_only()
    clean = theme_engine.sanitize_config(config, validate_contrast=False)
    return {
        "config": clean,
        "css": theme_engine.render_css(clean),
        "wcag_failures": theme_engine.wcag_failures(clean),
    }


@frappe.whitelist()
def save_theme_draft(config):
    manager_only()
    settings = frappe.get_single("Theme Settings")
    clean = theme_engine.sanitize_config(config)
    frappe.db.set_single_value("Theme Settings", "theme_studio_draft", frappe.as_json(clean))
    return {"config": clean, "wcag_failures": theme_engine.wcag_failures(clean)}


def sync_legacy_fields(settings, config):
    for field in (
        "brand_color", "accent_color", "sidebar_background", "navbar_background",
        "page_background", "card_background", "text_color", "corner_radius",
        "shadow_style", "sidebar_width",
    ):
        settings.set(field, config[field])
    settings.studio_layout = frappe.as_json(config["layout"])
    settings.default_theme_mode = config["preferred_mode"]
    settings.default_density = config["density"]
    settings.base_font_size = (
        "Small" if config["base_font_px"] <= 13
        else "Large" if config["base_font_px"] >= 16
        else "Default"
    )
    if config["company_logo"]:
        settings.logo = config["company_logo"]
    if config["favicon"]:
        settings.favicon = config["favicon"]
    if config["app_title"]:
        settings.company_name = config["app_title"]


@frappe.whitelist()
def publish_theme_config(config, label=None, profile_id=None):
    manager_only()
    settings = frappe.get_single("Theme Settings")
    clean = theme_engine.sanitize_config(config)
    versions = theme_engine.json_field(settings, "theme_versions", [])
    versions.insert(
        0,
        theme_engine.version_entry(
            theme_engine.published_config(settings),
            label or "Before publish",
        ),
    )
    settings.theme_versions = frappe.as_json(versions[:theme_engine.MAX_VERSIONS])
    settings.theme_studio_config = frappe.as_json(clean)
    settings.theme_studio_draft = ""
    settings.active_profile = str(profile_id or "")[:80]
    sync_legacy_fields(settings, clean)
    settings.save()
    return {
        "config": clean,
        "css": theme_engine.render_css(clean),
        "state": studio_state(settings),
    }


@frappe.whitelist()
def manage_theme_profile(action, profile_id=None, name=None, config=None, description=None):
    manager_only()
    settings = frappe.get_single("Theme Settings")
    custom = theme_engine.json_field(settings, "theme_profiles", [])
    action = str(action or "").lower()
    source = theme_engine.profile_by_id(settings, profile_id) if profile_id else None

    if action in {"create", "duplicate"}:
        if len(custom) >= theme_engine.MAX_PROFILES:
            frappe.throw("Maximum number of custom theme profiles reached")
        source_config = config if action == "create" else (source or {}).get("config")
        if not source_config:
            frappe.throw("Theme profile source not found")
        now = theme_engine.now_string()
        custom.append(
            {
                "id": theme_engine.new_id("theme"),
                "name": str(name or ((source or {}).get("name", "Custom") + " Copy"))[:100],
                "description": str(description or (source or {}).get("description", ""))[:300],
                "created": now,
                "modified": now,
                "config": theme_engine.sanitize_config(source_config),
            }
        )
    elif action == "update":
        target = next((item for item in custom if item.get("id") == profile_id), None)
        if not target:
            frappe.throw("Only custom profiles can be updated")
        target["name"] = str(name or target.get("name") or "Custom")[:100]
        target["description"] = str(
            description if description is not None else target.get("description", "")
        )[:300]
        target["config"] = theme_engine.sanitize_config(config or target.get("config"))
        target["modified"] = theme_engine.now_string()
    elif action == "rename":
        target = next((item for item in custom if item.get("id") == profile_id), None)
        if not target:
            frappe.throw("Only custom profiles can be renamed")
        target["name"] = str(name or "")[:100]
        if not target["name"]:
            frappe.throw("Profile name is required")
        target["modified"] = theme_engine.now_string()
    elif action == "delete":
        original_length = len(custom)
        custom = [item for item in custom if item.get("id") != profile_id]
        if len(custom) == original_length:
            frappe.throw("Only custom profiles can be deleted")
        assigned = theme_engine.assignments(settings)
        if assigned["default"] == profile_id:
            assigned["default"] = ""
        for scope in ("users", "roles", "companies"):
            assigned[scope] = {
                key: value
                for key, value in assigned[scope].items()
                if value != profile_id
            }
        settings.theme_assignments = frappe.as_json(assigned)
        scheduled = theme_engine.schedule(settings)
        if scheduled["profile_id"] == profile_id:
            scheduled.update({"enabled": False, "profile_id": ""})
            settings.theme_schedule = frappe.as_json(scheduled)
        if getattr(settings, "active_profile", "") == profile_id:
            settings.active_profile = ""
        if frappe.db.exists("DocType", "Theme Preference"):
            frappe.db.delete("Theme Preference", {"theme_profile": profile_id})
    else:
        frappe.throw("Unsupported profile action")

    settings.theme_profiles = frappe.as_json(custom)
    settings.save()
    return studio_state(settings)


@frappe.whitelist()
def restore_theme_version(version_id):
    manager_only()
    settings = frappe.get_single("Theme Settings")
    versions = theme_engine.json_field(settings, "theme_versions", [])
    version = next((item for item in versions if item.get("id") == version_id), None)
    if not version:
        frappe.throw("Theme version not found")
    clean = theme_engine.sanitize_config(version.get("config"))
    frappe.db.set_single_value("Theme Settings", "theme_studio_draft", frappe.as_json(clean))
    return {"config": clean, "wcag_failures": theme_engine.wcag_failures(clean)}


@frappe.whitelist()
def import_theme_profile(payload, name=None):
    manager_only()
    data = theme_engine.parse_json(payload, {})
    config = data.get("config", data)
    return manage_theme_profile(
        "create",
        name=name or data.get("name") or "Imported Theme",
        config=config,
        description=data.get("description") or "Imported Theme Studio profile",
    )


@frappe.whitelist()
def save_theme_assignments(data, flags=None):
    manager_only()
    settings = frappe.get_single("Theme Settings")
    raw = theme_engine.parse_json(data, {})
    clean = {
        "default": str(raw.get("default") or "")[:80],
        "users": theme_engine.clean_string_map(raw.get("users"), 180),
        "roles": theme_engine.clean_string_map(raw.get("roles"), 140),
        "companies": theme_engine.clean_string_map(raw.get("companies"), 180),
    }
    valid_profiles = {profile["id"] for profile in theme_engine.profiles(settings)}
    referenced_profiles = {clean["default"]} | set(clean["users"].values()) | set(clean["roles"].values()) | set(clean["companies"].values())
    missing_profiles = sorted(profile for profile in referenced_profiles if profile and profile not in valid_profiles)
    if missing_profiles:
        frappe.throw("Unknown theme profile: " + ", ".join(missing_profiles))
    settings.theme_assignments = frappe.as_json(clean)
    flag_data = theme_engine.parse_json(flags, {}) if flags else {}
    for field in ("theme_enabled", "allow_user_theme", "theme_lock", "preview_admin_only"):
        if field in flag_data:
            settings.set(field, int(theme_engine.bool_value(flag_data[field])))
    settings.save()
    return studio_state(settings)


@frappe.whitelist()
def save_theme_schedule(data):
    manager_only()
    settings = frappe.get_single("Theme Settings")
    raw = theme_engine.parse_json(data, {})
    clean = {
        "enabled": theme_engine.bool_value(raw.get("enabled")),
        "profile_id": str(raw.get("profile_id") or "")[:80],
        "activate_at": str(raw.get("activate_at") or "")[:40],
        "deactivate_at": str(raw.get("deactivate_at") or "")[:40],
    }
    if clean["profile_id"] and not theme_engine.profile_by_id(settings, clean["profile_id"]):
        frappe.throw("Scheduled theme profile not found")
    try:
        activate_at = frappe.utils.get_datetime(clean["activate_at"]) if clean["activate_at"] else None
        deactivate_at = frappe.utils.get_datetime(clean["deactivate_at"]) if clean["deactivate_at"] else None
    except Exception:
        frappe.throw("Invalid theme schedule date")
    if activate_at and deactivate_at and deactivate_at <= activate_at:
        frappe.throw("Theme deactivation must be later than activation")
    settings.theme_schedule = frappe.as_json(clean)
    settings.save()
    return studio_state(settings)


@frappe.whitelist()
def set_user_theme_profile(profile_id):
    user = frappe.session.user
    if not user or user == "Guest":
        frappe.throw("Not permitted")
    settings = frappe.get_single("Theme Settings")
    if getattr(settings, "theme_lock", 0) or not getattr(settings, "allow_user_theme", 1):
        frappe.throw("Theme selection is locked by an administrator")
    name = frappe.db.get_value("Theme Preference", {"user": user}, "name")
    if not profile_id:
        if name:
            frappe.delete_doc("Theme Preference", name, ignore_permissions=True)
    elif not theme_engine.profile_by_id(settings, profile_id):
        frappe.throw("Theme profile not found")
    elif name:
        frappe.db.set_value("Theme Preference", name, "theme_profile", profile_id)
    else:
        doc = frappe.get_doc(
            {"doctype": "Theme Preference", "user": user, "theme_profile": profile_id}
        )
        doc.flags.ignore_permissions = True
        doc.insert()
    frappe.clear_cache(user=user)
    from solvronix_desk.api import get_theme_css
    selected = theme_engine.resolve_config(settings, user)
    return {"ok": True, "css": get_theme_css(), "preferred_mode": selected["preferred_mode"]}


@frappe.whitelist()
def get_resolved_theme_runtime():
    """Return the currently resolved profile for live schedule/user updates."""
    settings = frappe.get_single("Theme Settings")
    user = getattr(frappe.session, "user", None)
    config = theme_engine.resolve_config(settings, user)
    return {
        "css": theme_engine.render_css(
            config, bool(getattr(settings, "theme_enabled", 1))
        ),
        "config": config,
        "preferred_mode": config["preferred_mode"],
        "active_profile": theme_engine.resolve_profile_id(settings, user),
        "schedule": theme_engine.schedule(settings),
    }


@frappe.whitelist()
def clear_theme_cache(reload_desk=0):
    manager_only()
    frappe.clear_cache()
    return {"ok": True, "reload": bool(int(reload_desk or 0))}
