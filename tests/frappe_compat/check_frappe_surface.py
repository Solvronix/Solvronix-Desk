"""List upstream Frappe changes to the files Solvronix Desk styles or hooks into.

Run before every release and after every Frappe update:

    python tests/frappe_compat/check_frappe_surface.py ../frappe v16.36.1 v16.50.0

The first argument is a Frappe git checkout (e.g. apps/frappe on a bench).
Every listed commit is a place where our CSS/JS may need an explicit reset
or a fallback. This is how the v16.26 login redesign (form max-width, error
rows, icon position) would have been caught before a release.
"""

import subprocess
import sys

SURFACE = {
    "login page": [
        "frappe/www/login.html",
        "frappe/www/login.py",
        "frappe/public/scss/login.bundle.scss",
        "frappe/templates/includes/login",
        "frappe/templates/signup.html",
    ],
    "desk sidebar / workspaces / app icons": [
        "frappe/public/js/frappe/ui/sidebar",
        "frappe/desk/desktop.py",
        "frappe/desk/doctype/desktop_icon",
        "frappe/boot.py",
    ],
    "theme variables": [
        "frappe/public/scss/common/css_variables.scss",
        "frappe/public/scss/desk/css_variables.scss",
        "frappe/public/css/espresso/colors.css",
        "frappe/public/scss/desk/dock.scss",
    ],
}

# What public/js/frappe_compat.js relies on when Frappe ships the Dock
# (v16.50+). Checked in the checkout's current tree: a missing name means the
# adapter's fallback is in effect and the rail loses its module list.
DOCK_API = {
    "frappe/public/js/frappe/ui/sidebar/dock.js": ["frappe.ui.Dock = class"],
    "frappe/public/js/frappe/ui/sidebar/sidebar.js": [
        "dock_enabled()",
        "refresh_dock()",
        "get_sidebar_app()",
        "collect_dock_entries(app)",
        "is_active_entry(entry)",
        "open_dock_entry(entry)",
        "dock_entry_key(entry)",
        "app_landing_route(app)",
    ],
    # dark_mode.css pins these semantic tokens; css/solvronix_desk.css styles the solid es-button.
    "frappe/public/css/espresso/colors.css": ["--ink-gray-9:", "--surface-gray-1:", "--outline-gray-1:"],
}


def check_dock_api(repo):
    """Report adapter dependencies missing from the checkout. Legacy Frappe (no dock.js) passes."""
    import os

    if not os.path.exists(os.path.join(repo, "frappe/public/js/frappe/ui/sidebar/dock.js")):
        print("\n## dock API\nNo dock.js: legacy navigation, adapter stays in legacy mode.")
        return True
    missing = []
    for rel, needles in DOCK_API.items():
        path = os.path.join(repo, rel)
        text = open(path, encoding="utf-8").read() if os.path.exists(path) else ""
        missing += [f"{rel}: {needle}" for needle in needles if needle not in text]
    if missing:
        print("\n## dock API — MISSING (update public/js/frappe_compat.js)")
        print("\n".join(missing))
        return False
    print("\n## dock API\nEvery Frappe API the compatibility layer uses is present.")
    return True


def main(repo, old, new):
    for ref in (old, new):
        ok = subprocess.run(["git", "-C", repo, "rev-parse", "--verify", "--quiet", ref + "^{commit}"],
                            capture_output=True).returncode == 0
        if not ok:
            print(f"Unknown ref {ref!r} in {repo}. Fetch it first, e.g. "
                  f"`git -C {repo} fetch upstream --tags`, or pass a branch like upstream/version-16.")
            return 2
    found = False
    for area, paths in SURFACE.items():
        log = subprocess.run(
            ["git", "-C", repo, "log", "--oneline", "--no-merges", f"{old}..{new}", "--", *paths],
            capture_output=True, text=True, check=True,
        ).stdout.strip()
        if log:
            found = True
            print(f"\n## {area}\n{log}")
    if not found:
        print(f"No upstream changes to the Solvronix Desk surface between {old} and {new}.")
    return 0 if check_dock_api(repo) else 1


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    sys.exit(main(*sys.argv[1:]))
