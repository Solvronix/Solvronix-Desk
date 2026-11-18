"""Grouped finance menus: the split loses nothing and the records are well formed."""

from pathlib import Path
import importlib.util
import json
import unittest


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("menu_layouts", ROOT / "solvronix_desk" / "menu_layouts.py")
ML = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(ML)

STOCK = ROOT.parents[1] / "apps" / "erpnext" / "erpnext" / "accounts" / "sidebar" / "accounts" / "accounts.json"


def stock_items():
    return json.loads(STOCK.read_text(encoding="utf-8"))["items"]


class ShellDataTest(unittest.TestCase):
    def test_five_shells_with_unique_routable_names(self):
        names = ML.shell_names()
        self.assertEqual(names, ["Invoicing", "Banking", "Taxes", "Budget", "Accounts Setup"])
        self.assertEqual(len(set(names)), len(names))
        for name in names:
            self.assertFalse(set(name) & set("/?#%\\"), name)

    def test_every_shell_has_an_icon_and_no_duplicate_links(self):
        for shell in ML.SHELLS:
            self.assertTrue(shell["icon"], shell["name"])
            seen = set()
            for item in shell["items"]:
                if item["type"] != "Link":
                    continue
                ident = (item["link_type"], item["link_to"], item.get("filters"))
                self.assertNotIn(ident, seen, (shell["name"], item["label"]))
                seen.add(ident)

    def test_invoicing_has_sales_and_purchase_sections_with_credit_and_debit_notes(self):
        items = {s["name"]: s["items"] for s in ML.SHELLS}["Invoicing"]
        sections = [i["label"] for i in items if i["type"] == "Section Break"]
        self.assertEqual(sections, ["Sales", "Purchase"])
        notes = {i["label"]: i for i in items if i["label"] in ("Credit Note", "Debit Note")}
        self.assertEqual(json.loads(notes["Credit Note"]["filters"]), [["Sales Invoice", "is_return", "=", 1]])
        self.assertEqual(notes["Debit Note"]["link_to"], "Purchase Invoice")


@unittest.skipUnless(STOCK.exists(), "ERPNext source not on this bench")
class AgainstStockAccountsMenuTest(unittest.TestCase):
    def test_nothing_in_the_stock_menu_is_lost(self):
        self.assertEqual(ML.moved_item_coverage(stock_items()), [])

    def test_hidden_rows_are_only_the_moved_sections_and_invoice_links(self):
        rows = ML.hide_rows(stock_items())
        self.assertTrue(rows)
        labels = {r["label"] for r in rows}
        for kept in ("Home", "Dashboard", "Chart of Accounts", "Journal Entry", "General Ledger", "Payment Entry"):
            self.assertNotIn(kept, labels)
        for moved in ("Sales Invoice", "Purchase Invoice", "Bank Account", "Budget", "Company", "Currency Exchange"):
            self.assertIn(moved, labels)
        for row in rows:
            self.assertEqual(row["hidden"], 1)
            self.assertEqual(row["added"], 0)
            if row["type"] == "Section Break":
                self.assertEqual(len(row["key"]), 10)

    def test_every_new_link_target_still_exists_in_a_stock_menu_or_is_named_here(self):
        # links not in the stock Accounts menu are checked against ERPNext's own doctype/report folders
        erpnext = ROOT.parents[1] / "apps" / "erpnext" / "erpnext"
        stock = {(i.get("link_type"), i.get("link_to")) for i in stock_items() if i["type"] == "Link"}
        slug = lambda n: n.lower().replace(" ", "_")
        for shell in ML.SHELLS:
            for item in shell["items"]:
                if item["type"] != "Link" or (item["link_type"], item["link_to"]) in stock:
                    continue
                if item["link_type"] == "Workspace":
                    continue
                kind = "doctype" if item["link_type"] == "DocType" else "report"
                found = list(erpnext.glob("**/%s/%s/%s.json" % (kind, slug(item["link_to"]), slug(item["link_to"]))))
                self.assertTrue(found, (shell["name"], item["label"], item["link_to"]))


class DockLayerTest(unittest.TestCase):
    BASE = [
        {"link_type": "Sidebar", "link_to": "Setup"},
        {"link_type": "Sidebar", "link_to": "Accounts"},
        {"link_type": "Sidebar", "link_to": "Selling"},
    ]

    def test_new_modules_follow_accounts_and_base_order_is_kept(self):
        rows = ML.dock_rows(self.BASE)
        order = [r["link_to"] for r in rows]
        self.assertEqual(order, ["Setup", "Accounts", "Invoicing", "Banking", "Taxes", "Budget", "Accounts Setup", "Selling"])

    def test_added_rows_have_icon_and_title_and_references_are_not_added(self):
        for row in ML.dock_rows(self.BASE):
            if row["link_to"] in ML.shell_names():
                self.assertEqual(row["added"], 1)
                self.assertTrue(row["icon"] and row["title"])
            else:
                self.assertEqual(row["added"], 0)

    def test_without_an_accounts_row_the_modules_go_at_the_end(self):
        rows = ML.dock_rows([{"link_type": "Sidebar", "link_to": "Setup"}])
        self.assertEqual([r["link_to"] for r in rows][-5:], ML.shell_names())


class WiringTest(unittest.TestCase):
    def test_studio_flag_is_saved_and_reported(self):
        api = (ROOT / "solvronix_desk" / "theme_api.py").read_text(encoding="utf-8")
        self.assertIn("menu_layouts.set_layout(", api)
        self.assertIn('"grouped_finance_menus": menu_layouts.current_layout()', api)
        studio = (ROOT / "solvronix_desk" / "solvronix_desk" / "page" / "theme_studio" / "theme_studio.js").read_text(encoding="utf-8")
        self.assertIn('fieldname: "grouped_finance_menus"', studio)
        setup = (ROOT / "solvronix_desk" / "setup.py").read_text(encoding="utf-8")
        self.assertIn("menu_layouts.apply_if_possible()", setup)
        self.assertIn("grouped_finance_menus: !!flags.grouped_finance_menus", studio)


if __name__ == "__main__":
    unittest.main()
