"""Coverage for the Login Page Designer: config fallbacks and template contract."""

from pathlib import Path
import json
import re
import sys
import types
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]


# CI runs these tests with only pytest installed (no Frappe), so the code under
# test always gets this minimal stand-in; tests patch the calls they exercise.
class _dict(dict):
    def __getattr__(self, key):
        return self.get(key)

    def __setattr__(self, key, value):
        self[key] = value


def _cint(value):
    try:
        return int(float(value or 0))
    except (TypeError, ValueError):
        return 0


def _install_frappe_stub():
    frappe = types.ModuleType("frappe")
    frappe._dict = _dict
    frappe._ = lambda text, *args, **kwargs: text
    frappe.throw = lambda message, *args, **kwargs: (_ for _ in ()).throw(ValueError(message))
    frappe.log_error = lambda *args, **kwargs: None
    frappe.get_installed_apps = lambda: []
    frappe.get_website_settings = lambda key: None
    frappe.get_system_settings = lambda key: None
    frappe.get_cached_value = lambda *args, **kwargs: None
    frappe.get_cached_doc = lambda *args, **kwargs: None
    frappe.clear_cache = lambda *args, **kwargs: None
    frappe.local = types.SimpleNamespace(site="")
    frappe.session = types.SimpleNamespace(user="Guest")
    frappe.db = mock.MagicMock()
    frappe.defaults = types.SimpleNamespace(get_global_default=lambda key: None)

    utils = types.ModuleType("frappe.utils")
    utils.cint = _cint
    frappe.utils = utils
    model = types.ModuleType("frappe.model")
    document = types.ModuleType("frappe.model.document")
    document.clear_document_cache = lambda *args, **kwargs: None
    model.document = document
    frappe.model = model

    sys.modules.update({
        "frappe": frappe,
        "frappe.utils": utils,
        "frappe.model": model,
        "frappe.model.document": document,
    })
    return frappe


frappe = _install_frappe_stub()
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
for cached in ("solvronix_desk.login_config", "solvronix_desk.theme_engine"):
    sys.modules.pop(cached, None)

from solvronix_desk import login_config  # noqa: E402

APP = ROOT / "solvronix_desk"
TEMPLATE = APP / "templates" / "login" / "split_login.html"
CSS = APP / "public" / "css" / "login_split.css"
DOCTYPE = APP / "solvronix_desk" / "doctype" / "login_page_settings" / "login_page_settings.json"
LOGIN_CONFIG = APP / "login_config.py"
SETUP = APP / "setup.py"

BRAND = {
    "company_name": "Site Name",
    "logo": "/files/site-logo.png",
    "favicon": "/files/site-favicon.png",
    "brand_color": "#1B3F7E",
    "accent_color": "#F57C00",
}
THEME = {"login_heading": "Theme heading", "login_description": "Theme subtitle", "preferred_mode": "Dark"}


def settings(**values):
    base = {field: None for field in json.loads(DOCTYPE.read_text())["field_order"]}
    base.update({"enabled": 1, "layout": "Split Screen", "auto_fetch_branding": 1, "feature_cards": []})
    base.update(values)
    return frappe._dict(base)


def resolve(doc):
    with mock.patch.object(login_config, "theme_config", return_value=THEME), \
         mock.patch.object(login_config, "branding_sources", return_value=dict(BRAND)), \
         mock.patch.object(login_config, "get_settings_doc", return_value=doc), \
         mock.patch.object(login_config.frappe, "_", side_effect=lambda text: text):
        return login_config.get_login_config()


class LoginConfigTest(unittest.TestCase):
    def test_auto_fill_ignores_stored_branding(self):
        config = resolve(settings(company_name="Stale Name", brand_color="#000000"))
        self.assertEqual(config.company_name, "Site Name")
        self.assertEqual(config.brand_color, "#1B3F7E")

    def test_manual_branding_wins_and_falls_back_per_field(self):
        config = resolve(settings(auto_fetch_branding=0, company_name="Acme Ltd", logo=""))
        self.assertEqual(config.company_name, "Acme Ltd")
        self.assertEqual(config.initials, "AL")
        self.assertEqual(config.logo, "/files/site-logo.png")

    def test_copy_falls_back_to_theme_studio_and_fills_company(self):
        config = resolve(settings(headline="Welcome to {company}"))
        self.assertEqual(config.headline, "Welcome to Site Name")
        self.assertEqual(config.card_heading, "Theme heading")
        self.assertEqual(config.card_subtitle, "Theme subtitle")
        self.assertEqual(config.preferred_mode, "Dark")

    def test_feature_cards_are_capped_and_untitled_rows_skipped(self):
        rows = [frappe._dict(icon="", title=f"Card {i}", subtitle="") for i in range(6)]
        rows[0].title = ""
        config = resolve(settings(feature_cards=rows, show_feature_panel=1))
        # Untitled rows are dropped before the cap, so four real cards show.
        self.assertEqual(len(config.features), 4)
        self.assertEqual(config.features[0]["icon"], login_config.DEFAULT_FEATURE_ICON)
        self.assertEqual(config.features[0]["title"], "Card 1")

    def test_unsafe_values_are_dropped(self):
        config = resolve(settings(back_link_url="//evil.example", hero_gradient_from="red", hero_bg_image="javascript:x"))
        self.assertEqual(config.back_link_url, "")
        self.assertEqual(config.hero_from, "")
        self.assertEqual(config.hero_bg_image, "")

    def test_empty_settings_render_full_default_copy(self):
        """A fresh install with nothing saved must still show a complete page."""
        with mock.patch.object(login_config.frappe, "get_installed_apps", return_value=["frappe"]):
            config = resolve(settings(show_feature_panel=1))
        for field, text in login_config.DEFAULT_COPY.items():
            if field in ("card_heading", "card_subtitle"):
                continue  # THEME overrides these in this fixture
            self.assertEqual(config[field], text.replace("{company}", "Site Name"), field)
        self.assertIn("Site Name", config.description)
        self.assertEqual([f["title"] for f in config.features], [r[1] for r in login_config.DEFAULT_FEATURES_GENERAL])
        self.assertTrue(config.show_feature_panel)

    def test_default_cards_follow_installed_apps(self):
        with mock.patch.object(login_config.frappe, "get_installed_apps", return_value=["frappe", "erpnext"]):
            config = resolve(settings())
        self.assertEqual(config.features[0]["title"], login_config.DEFAULT_FEATURES_BUSINESS[0][1])

    def test_untouched_theme_login_text_does_not_hide_defaults(self):
        theme = dict(THEME, login_heading="Welcome back", login_description="Sign in to continue to your workspace.")
        with mock.patch.object(login_config, "theme_config", return_value=theme), \
             mock.patch.object(login_config, "branding_sources", return_value=dict(BRAND)), \
             mock.patch.object(login_config, "get_settings_doc", return_value=settings()), \
             mock.patch.object(login_config.frappe, "_", side_effect=lambda text: text):
            config = login_config.get_login_config()
        self.assertEqual(config.card_subtitle, "Sign in to your Site Name account to continue.")

    def test_admin_text_wins_over_defaults(self):
        config = resolve(settings(headline="Our own headline", button_label="Log in"))
        self.assertEqual(config.headline, "Our own headline")
        self.assertEqual(config.button_label, "Log in")

    def test_missing_doctype_disables_designer(self):
        config = resolve(None)
        self.assertFalse(config.enabled)
        self.assertEqual(config.company_name, "Site Name")


class SplitTemplateContractTest(unittest.TestCase):
    """Frappe's login.js drives the page by these hooks; losing one breaks a flow."""

    def test_template_keeps_frappe_login_hooks(self):
        source = TEMPLATE.read_text()
        for hook in (
            'class="for-login"', "for-signup", 'class="for-forgot"', 'class="for-login-with-email-link"',
            "form-login", "form-forgot", "form-login-with-email-link", "signup_form_template",
            'id="login_email"', 'id="login_password"', 'id="forgot_email"', 'id="login_with_email_link_email"',
            "login-content page-card", "login-error-banner", "login-success-banner", "btn-resend-link",
            'toggle="#login_password"', 'href="#forgot"', 'href="#signup"', "btn-ldap-login", "social-logins",
            'include "templates/includes/login/login.js"',
        ):
            self.assertIn(hook, source, hook)

    def test_user_copy_is_escaped(self):
        source = TEMPLATE.read_text()
        # Colors are hex-validated in login_config before reaching the <style> block.
        validated = {"sl.brand_color", "sl.accent_color", "sl.hero_from", "sl.hero_to", "sl.on_hero"}
        unescaped = set(re.findall(r"{{\s*(sl\.[a-z_]+|card\.[a-z]+)\s*}}", source)) - validated
        self.assertEqual(unescaped, set())
        # Filtered output (e.g. `| abs_url`) must still end in `| e`.
        for expr in re.findall(r"{{([^}]*\bsl\.[a-z_]+[^}]*)}}", source):
            if "|" in expr and "tojson" not in expr and "length" not in expr and "lower" not in expr:
                self.assertRegex(expr.strip(), r"\|\s*e$", expr)

    def test_css_has_no_hardcoded_colors_outside_tokens(self):
        css = CSS.read_text()
        body = re.sub(r"body\.sl-split \{.*?\n\}", "", css, flags=re.S)
        self.assertEqual(re.findall(r"#[0-9A-Fa-f]{3,8}\b", body), [])


    def test_guest_page_never_uses_private_files(self):
        source = LOGIN_CONFIG.read_text()
        self.assertIn('return "" if value.startswith("/private/") else value', source)
        self.assertNotIn("logo=theme_engine.clean_url(", source)

    def test_after_migrate_never_seeds_split_screen(self):
        source = SETUP.read_text()
        migrate = source[source.index("def after_migrate"):source.index("# ── LOGIN PAGE DESIGNER")]
        self.assertIn('_seed_defaults(login_layout="Centered Card")', migrate)

    def test_preview_stubs_login_calls(self):
        source = TEMPLATE.read_text()
        self.assertIn("{% if sl_preview %}", source)
        self.assertIn("login.call = function ()", source)


class FrappeVersionResilienceTest(unittest.TestCase):
    """The split login sets its own box model so Frappe's login.bundle, which
    changed in the v16.26 login redesign, can't reshape it. Pre-v16.26 builds
    cap forms at 320px, add an actions top margin, leave error rows visible
    and pin the password eye icon to the top."""

    def rule(self, css, selector):
        body = css[css.index(selector + " {"):]
        return body[:body.index("}")]

    def test_form_fills_the_card_on_every_frappe_build(self):
        css = CSS.read_text()
        form = self.rule(css, "html body.sl-split .sl-card form")
        self.assertIn("max-width: none !important", form)
        self.assertIn("margin: 0 !important", form)
        self.assertIn("width: 100%", form)
        self.assertIn("html body.sl-split .sl-card .page-card-actions { margin: 0 !important; }", css)

    def test_idle_message_rows_are_hidden_until_login_js_shows_them(self):
        css = CSS.read_text()
        self.assertIn("html body.sl-split .sl-card .login-success-banner { display: none;", css)
        self.assertIn("html body.sl-split .sl-card .field-error { display: none;", css)
        self.assertIn("html body.sl-split .sl-card .form-group.invalid .field-error { display: block; }", css)

    def test_field_icons_are_centred_explicitly(self):
        css = CSS.read_text()
        self.assertIn("top: 50% !important;", css)
        self.assertIn("transform: translateY(-50%) !important;", css)

    def test_stylesheet_is_cache_busted(self):
        self.assertIn("login_split.css?v=7", TEMPLATE.read_text())

class BrandingSourcesTest(unittest.TestCase):
    def sources(self, theme=None, company="Acme Trading", company_logo="/files/acme.png",
                website=None, system=None, navbar_logo=None):
        website = website or {}
        db = mock.MagicMock()
        db.has_column.return_value = True
        db.get_single_value.return_value = navbar_logo
        with mock.patch.object(login_config, "default_company", return_value=company), \
             mock.patch.object(login_config.frappe, "db", db), \
             mock.patch.object(login_config.frappe, "get_cached_value", return_value=company_logo), \
             mock.patch.object(login_config.frappe, "get_website_settings", side_effect=lambda key: website.get(key)), \
             mock.patch.object(login_config.frappe, "get_system_settings", return_value=system):
            return login_config.branding_sources(theme or {})

    def test_company_name_and_logo_come_from_default_company(self):
        brand = self.sources(website={"app_name": "Frappe"}, system="ERPNext")
        self.assertEqual(brand["company_name"], "Acme Trading")
        self.assertEqual(brand["logo"], "/files/acme.png")

    def test_theme_studio_name_and_logo_win(self):
        brand = self.sources(theme={"app_title": "Acme Group", "company_logo": "/files/group.png"})
        self.assertEqual(brand["company_name"], "Acme Group")
        self.assertEqual(brand["logo"], "/files/group.png")

    def test_generic_framework_names_are_skipped(self):
        brand = self.sources(theme={"app_title": "Frappe"}, company="", website={"app_name": "ERPNext"}, system="Bright Foods")
        self.assertEqual(brand["company_name"], "Bright Foods")

    def test_private_company_logo_and_hook_logo_are_never_used(self):
        brand = self.sources(company_logo="/private/files/acme.png")
        self.assertEqual(brand["logo"], "")
        source = LOGIN_CONFIG.read_text()
        self.assertNotIn("get_app_logo", source)

    def test_admin_site_logo_is_used_when_company_has_none(self):
        brand = self.sources(company_logo="", navbar_logo="/files/navbar.png")
        self.assertEqual(brand["logo"], "/files/navbar.png")


class FreshInstallSeedTest(unittest.TestCase):
    def test_seed_stores_switches_only_no_copy_or_vendor_name(self):
        source = SETUP.read_text()
        seed = source[source.index("def seed_login_page_settings"):]
        self.assertNotIn("headline", seed)
        self.assertNotIn("frappe.get_single(", seed)
        self.assertNotIn('"company_name":           "Solvronix"', source)

    def test_brand_name_patch_is_guarded(self):
        patch = (APP / "patches" / "v2_4" / "clear_default_brand_name.py").read_text()
        self.assertIn('frappe.db.exists("Company", SEEDED_NAME)', patch)
        self.assertIn("!= SEEDED_NAME", patch)
        self.assertIn("solvronix_desk.patches.v2_4.clear_default_brand_name", (APP / "patches.txt").read_text())


class BrandNameAutofillTest(unittest.TestCase):
    def run_fill(self, stored, default_company=None, company=None, website=None, system=None):
        import importlib.util
        spec = importlib.util.spec_from_file_location("sd_setup", SETUP)
        setup = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(setup)
        db = mock.MagicMock()
        db.exists.return_value = True
        db.get_single_value.return_value = stored
        with mock.patch.object(setup.frappe, "db", db), \
             mock.patch.object(setup.frappe.defaults, "get_global_default", return_value=default_company), \
             mock.patch.object(setup.frappe, "get_website_settings", return_value=website), \
             mock.patch.object(setup.frappe, "get_system_settings", return_value=system), \
             mock.patch("frappe.model.document.clear_document_cache"):
            setup.fill_brand_name(company=company)
        return db.set_single_value.call_args

    def test_empty_name_is_filled_from_default_company(self):
        call = self.run_fill(None, default_company="Acme Trading")
        self.assertEqual(call.args, ("Theme Settings", "company_name", "Acme Trading"))

    def test_first_company_fills_name_before_defaults_exist(self):
        call = self.run_fill("", company="Bright Foods", website="Frappe")
        self.assertEqual(call.args[2], "Bright Foods")

    def test_admin_name_is_never_replaced(self):
        self.assertIsNone(self.run_fill("My Brand", default_company="Acme Trading"))

    def test_generic_names_are_not_used(self):
        self.assertIsNone(self.run_fill(None, website="Frappe", system="ERPNext"))

    def test_company_hook_is_registered(self):
        hooks = (APP / "hooks.py").read_text()
        self.assertIn('"after_insert": "solvronix_desk.events.company_after_insert"', hooks)


if __name__ == "__main__":
    unittest.main()
