"""Unit tests for receipt text parsing and categorization."""

import unittest

from app.services.categorization_service import _rule_match
from app.services.parser_service import parse_receipt_text


class TestParser(unittest.TestCase):
    def test_parse_receipt_text_amount_and_merchant(self):
        raw_text = """
        Starbucks Coffee
        123 Main Street, MG Road
        Date: 15/08/2024
        Txn Ref: TXN987654321
        Total: ₹450.00
        Thank you for visiting!
        """
        parsed = parse_receipt_text(raw_text)
        self.assertEqual(parsed["amount"], 450.00)
        self.assertEqual(parsed["merchant"], "Starbucks Coffee")
        self.assertEqual(parsed["transaction_id"], "TXN987654321")
        self.assertIsNotNone(parsed["date"])
        self.assertEqual(parsed["date"].strftime("%Y-%m-%d"), "2024-08-15")

    def test_parse_receipt_text_upi(self):
        raw_text = """
        Zomato Private Limited
        UPI ID: merchant@paytm
        Paid Amount: ₹320.50
        """
        parsed = parse_receipt_text(raw_text)
        self.assertEqual(parsed["amount"], 320.50)
        self.assertEqual(parsed["upi_id"], "merchant@paytm")

    def test_currency_prefixes(self):
        """Rs / INR / $ prefixes are recognised, not just the ₹ symbol."""
        for prefix in ("Rs.", "Rs", "INR", "$"):
            with self.subTest(prefix=prefix):
                parsed = parse_receipt_text(f"Some Shop\nTotal {prefix} 1,250.75\n")
                self.assertEqual(parsed["amount"], 1250.75)

    def test_largest_amount_wins(self):
        raw_text = "Kirana Store\nItem A ₹40.00\nItem B ₹60.00\nTotal ₹100.00\n"
        self.assertEqual(parse_receipt_text(raw_text)["amount"], 100.00)

    def test_missing_fields_return_none(self):
        parsed = parse_receipt_text("")
        self.assertIsNone(parsed["amount"])
        self.assertIsNone(parsed["merchant"])
        self.assertIsNone(parsed["date"])
        self.assertIsNone(parsed["upi_id"])


class TestCategorisation(unittest.TestCase):
    def test_rule_categorization(self):
        cat, conf = _rule_match("Swiggy", "Order total ₹250.00")
        self.assertEqual(cat, "Food")
        self.assertEqual(conf, 0.85)

        cat, conf = _rule_match("Blinkit", "Milk, Bread, Vegetables ₹180.00")
        self.assertEqual(cat, "Groceries")
        self.assertEqual(conf, 0.85)

        cat, conf = _rule_match("Uber", "Cab ride from Airport")
        self.assertEqual(cat, "Transport")
        self.assertEqual(conf, 0.85)

        cat, conf = _rule_match("Random Store", "Unknown item")
        self.assertIsNone(cat)
        self.assertEqual(conf, 0.0)

    def test_keywords_match_on_word_boundaries(self):
        """Short keywords must not fire inside unrelated words."""
        # "eat" inside "Theatre"/"great", "mart" inside "Smartphone",
        # "gas" inside "Gasket" — all previously matched as substrings.
        for merchant, text in (
            ("Great Deals Ltd", "a great offer"),
            ("Smartphone Hub", "Smartphone case"),
            ("Gasket Supplies", "Gasket kit"),
        ):
            with self.subTest(merchant=merchant):
                category, _ = _rule_match(merchant, text)
                self.assertIsNone(category)

    def test_multi_word_keywords_still_match(self):
        category, _ = _rule_match("Pizza Hut", "Large pan pizza")
        self.assertEqual(category, "Food")

        category, _ = _rule_match("Big Basket", "Weekly groceries")
        self.assertEqual(category, "Groceries")

    def test_matching_is_case_insensitive(self):
        self.assertEqual(_rule_match("NETFLIX", "monthly")[0], "Entertainment")


if __name__ == "__main__":
    unittest.main()
