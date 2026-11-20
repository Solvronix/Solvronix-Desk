"""White label: one list of vendor addresses, applied to the Help menu in the boot payload."""

from pathlib import Path
import importlib.util
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("white_label", ROOT / "solvronix_desk" / "white_label.py")
WL = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(WL)


class OwnLinksTest(unittest.TestCase):
    def test_own_links_come_from_config_and_must_be_web_addresses(self):
        rows = WL.own_help_items({"help_url": "https://docs.acme.com", "support_url": "javascript:alert(1)"})
        self.assertEqual([r["item_label"] for r in rows], ["Documentation"])
        self.assertEqual(rows[0]["route"], "https://docs.acme.com")
        self.assertEqual(rows[0]["item_type"], "Route")
        self.assertEqual(WL.own_help_items({}), [])
        both = WL.own_help_items({"help_url": "https://a.com", "support_url": "https://b.com"})
        self.assertEqual([r["item_label"] for r in both], ["Documentation", "Support"])

    def test_on_by_default_and_off_only_when_explicitly_zero(self):
        self.assertTrue(WL.enabled({}))
        self.assertTrue(WL.enabled(None))
        self.assertTrue(WL.enabled({"hide_vendor_links": True}))
        self.assertFalse(WL.enabled({"hide_vendor_links": False}))
        self.assertFalse(WL.enabled({"hide_vendor_links": 0}))


class BootPayloadTest(unittest.TestCase):
    class Boot(dict):
        __getattr__ = dict.get

        def __setattr__(self, key, value):
            self[key] = value

    def test_payload_carries_the_one_rule_list_and_the_sites_own_links(self):
        boot = self.Boot()
        WL.apply_to_boot(boot, {"help_url": "https://docs.acme.com"})
        payload = boot["st_white_label"]
        self.assertTrue(payload["enabled"])
        self.assertIn("frappe.io", payload["hosts"])
        self.assertIn("erpnext.com", payload["hosts"])
        self.assertEqual(payload["github_prefix"], "/frappe")
        self.assertIn("license", payload["legal_hints"])
        self.assertEqual([r["item_label"] for r in payload["own_help"]], ["Documentation"])

    def test_switched_off_sends_only_the_flag(self):
        boot = self.Boot()
        WL.apply_to_boot(boot, {"hide_vendor_links": False})
        self.assertEqual(boot["st_white_label"], {"enabled": False})


class WiringTest(unittest.TestCase):
    def test_assets_config_boot_and_studio(self):
        app = ROOT / "solvronix_desk"
        hooks = (app / "hooks.py").read_text(encoding="utf-8")
        self.assertIn("/assets/solvronix_desk/js/white_label.js?v=2", hooks)
        self.assertIn("/assets/solvronix_desk/css/white_label.css?v=1", hooks)
        engine = (app / "theme_engine.py").read_text(encoding="utf-8")
        self.assertIn('"hide_vendor_links": True,', engine)
        self.assertIn('"help_url": "",', engine)
        self.assertIn("white_label.apply_to_boot(bootinfo, config)", (app / "boot.py").read_text(encoding="utf-8"))
        studio = (app / "solvronix_desk" / "page" / "theme_studio" / "theme_studio.js").read_text(encoding="utf-8")
        self.assertIn('["hide_vendor_links", "Hide Frappe links, promotions and help", "check"]', studio)
        self.assertIn('["help_url", "Your documentation URL (https://)", "text"]', studio)

    def test_script_defers_to_the_same_rule_list_the_server_sends(self):
        js = (ROOT / "solvronix_desk" / "public" / "js" / "white_label.js").read_text(encoding="utf-8")
        self.assertIn("frappe.boot.st_white_label", js)
        self.assertNotIn("frappe.io", js.split("*/", 1)[1])  # no second copy of the host list in code
        css = (ROOT / "solvronix_desk" / "public" / "css" / "white_label.css").read_text(encoding="utf-8")
        self.assertNotRegex(css.replace("var(--", ""), r"#[0-9a-fA-F]{3,8}\b")


if __name__ == "__main__":
    unittest.main()
