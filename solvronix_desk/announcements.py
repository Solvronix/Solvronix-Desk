"""In-Desk feature announcements ("New in 3.0: Workspace Classic").

One small card per release feature, shown once to the people who can use it,
with a one-click personal try and an easy way back. State lives in a per-user
default (``st_announcements``), so it follows the user across devices and needs
no DocType. Admins switch the whole thing off with the site-wide default
``st_announcements_enabled`` (Theme Studio → assignments & permissions).
"""

import json

import frappe

from solvronix_desk import theme_engine

ANNOUNCEMENTS = (
    {"id": "workspace-classic-3", "profile": "builtin-workspace", "since": "3.0.0"},
)
STATE_KEY = "st_announcements"
ENABLED_KEY = "st_announcements_enabled"
MAX_SNOOZES = 3


def _by_id(announcement_id):
    for item in ANNOUNCEMENTS:
        if item["id"] == announcement_id:
            return item
    frappe.throw("Unknown announcement")


def enabled():
    return str(frappe.defaults.get_global_default(ENABLED_KEY) or "1") != "0"


def load_state(user):
    raw = frappe.defaults.get_user_default(STATE_KEY, user=user)
    try:
        data = json.loads(raw) if raw else {}
    except (TypeError, ValueError):
        data = {}
    return data if isinstance(data, dict) else {}


def save_state(user, data):
    frappe.defaults.set_user_default(STATE_KEY, json.dumps(data), user=user)


def decide(item, entry, current_profile, can_choose, manager, sid):
    """What this user sees for one announcement: None, "card" or "tried".
    Pure, so the audience rules are testable without Frappe."""
    entry = entry if isinstance(entry, dict) else {}
    state = entry.get("state")
    if state == "tried":
        if entry.get("acked") or current_profile != item["profile"]:
            return None
        return "tried"
    if state == "dismissed":
        return None
    if int(entry.get("snoozes") or 0) >= MAX_SNOOZES:
        return None
    if entry.get("snoozed_sid") and entry.get("snoozed_sid") == sid:
        return None
    if current_profile == item["profile"]:
        return None
    if not can_choose and not manager:
        return None
    return "card"


def pending_for(user, settings):
    """Boot payload: the announcements this user should see right now."""
    if not user or user == "Guest" or not enabled():
        return []
    roles = set(frappe.get_roles(user))
    manager = "System Manager" in roles
    can_choose = bool(theme_engine.bool_value(getattr(settings, "allow_user_theme", 1))) and not bool(
        theme_engine.bool_value(getattr(settings, "theme_lock", 0))
    )
    resolved = theme_engine.resolved_profile(settings, user)
    current = resolved["id"] if resolved else ""
    state = load_state(user)
    sid = getattr(frappe.session, "sid", "") or ""
    titles = frappe.get_hooks("app_title", app_name="solvronix_desk") or []
    app_title = titles[0] if titles else "Solvronix Desk"
    out = []
    for item in ANNOUNCEMENTS:
        profile = theme_engine.profile_by_id(settings, item["profile"])
        if not profile:
            continue
        mode = decide(item, state.get(item["id"]), current, can_choose, manager, sid)
        if not mode:
            continue
        out.append({
            "id": item["id"],
            "mode": mode,
            "profile": item["profile"],
            "profile_name": profile.get("name") or item["profile"],
            "can_try": can_choose,
            # Frappe's "Updated to a new version" dialog lists apps by title;
            # the client finds this app's section by it to add the same choices.
            "app_title": app_title,
            "manager": manager,
        })
    return out


@frappe.whitelist()
def act(announcement_id, action):
    """dismiss | snooze | try | keep | switch_back. ``try`` and ``switch_back``
    return the theme runtime, so the Desk reloads into the new layout."""
    user = frappe.session.user
    if not user or user == "Guest":
        frappe.throw("Not permitted")
    item = _by_id(announcement_id)
    state = load_state(user)
    entry = state.get(item["id"]) if isinstance(state.get(item["id"]), dict) else {}
    runtime = None

    if action == "dismiss":
        entry["state"] = "dismissed"
    elif action == "snooze":
        entry["snoozes"] = int(entry.get("snoozes") or 0) + 1
        entry["snoozed_sid"] = getattr(frappe.session, "sid", "") or ""
    elif action == "try":
        from solvronix_desk import theme_api
        entry["previous"] = theme_engine.user_preference(user)
        entry["state"] = "tried"
        entry["acked"] = False
        runtime = theme_api.set_user_theme_profile(item["profile"])
    elif action == "keep":
        entry["acked"] = True
    elif action == "switch_back":
        from solvronix_desk import theme_api
        entry["acked"] = True
        runtime = theme_api.set_user_theme_profile(entry.get("previous") or "")
    else:
        frappe.throw("Unknown action")

    state[item["id"]] = entry
    save_state(user, state)
    return {"ok": True, "runtime": runtime}
