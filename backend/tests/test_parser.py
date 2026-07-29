"""Unit tests for receipt text parsing and categorization."""

import unittest
from app.services.parser_service import parse_receipt_text
from app.services.categorization_service import _rule_match


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


if __name__ == "__main__":
    unittest.main()
