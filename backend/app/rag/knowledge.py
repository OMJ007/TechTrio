"""Seed corpus for the finance knowledge base.

Each entry is one self-contained fact tagged with the topic it belongs to.
The topic travels with the chunk as vector-store metadata, so a retrieved
passage can be attributed in the advisor's answer.

Seeding is idempotent: document IDs are content hashes, so re-running it
after editing this file updates changed entries and adds new ones without
duplicating anything.
"""

from __future__ import annotations

SOURCE_LABELS: dict[str, str] = {
    "indian_tax": "Indian Tax & Investments",
    "budgeting": "Budgeting & Personal Finance",
    "value_investing": "Value Investing (Warren Buffett)",
    "conscious_spending": "Conscious Spending (Ramit Sethi)",
}

# topic key -> list of knowledge chunks
KNOWLEDGE_BY_TOPIC: dict[str, list[str]] = {
    "indian_tax": [
        "Section 80C of the Income Tax Act allows deductions up to ₹1.5 lakh per year for investments in ELSS mutual funds, PPF, EPF, NSC, tax-saving FDs, and life insurance premiums.",
        "ELSS (Equity Linked Savings Scheme) funds have the shortest lock-in period of 3 years among 80C instruments and offer potential for equity-linked returns with tax benefits.",
        "PPF (Public Provident Fund) currently offers ~7.1% interest rate compounded annually, with a 15-year maturity and partial withdrawal allowed from year 7.",
        "NPS (National Pension System) allows an additional tax deduction of up to ₹50,000 under Section 80CCD(1B), over and above the ₹1.5 lakh 80C limit.",
        "SIP (Systematic Investment Plan) lets you invest a fixed amount in mutual funds monthly, averaging out market volatility through rupee-cost averaging.",
        "Section 80D provides tax deductions of up to ₹25,000 for health insurance premiums paid for self and family, and up to ₹50,000 for senior citizen parents.",
        "A newly added Section 80CCC allows deduction for contributions to a pension fund. The total deduction under sections 80C, 80CCC, and 80CCD(1) combined is capped at ₹1.5 lakh.",
    ],
    "budgeting": [
        "The 50/30/20 budgeting rule divides after-tax income into: 50% for needs (rent, groceries, utilities), 30% for wants (dining, entertainment), and 20% for savings and investments.",
        "An emergency fund should cover 3 to 6 months of essential living expenses and be held in a liquid, easily accessible instrument like a savings account or liquid fund.",
        "A good credit score (750+) can significantly lower your loan interest rates. Pay credit card bills on time and keep utilisation below 30% of your limit.",
        "The debt-to-income ratio should ideally stay below 40%. Lenders use this ratio to assess your ability to manage monthly payments and repay debts.",
    ],
    "value_investing": [
        "An economic moat refers to a company's sustainable competitive advantage — brand power, cost advantage, network effects, or regulatory protection — that keeps competitors at bay.",
        "Compound interest is the eighth wonder of the world. Small, consistent investments grow exponentially over time. Starting early matters more than timing the market.",
        "Circle of competence: invest only in businesses you truly understand. The size of the circle doesn't matter as much as knowing its boundaries.",
        "Buy when others are greedy and be fearful when others are fearful. Market volatility creates opportunities for disciplined long-term investors.",
        "A margin of safety means buying a stock at a price significantly below your estimate of its intrinsic value, providing a buffer against errors or bad luck.",
        "Focus on the business's long-term fundamentals — earnings power, return on equity, and management quality — rather than short-term price movements.",
    ],
    "conscious_spending": [
        "Conscious spending means cutting costs ruthlessly on things you don't care about so you can spend extravagantly on what you truly love. It's not about depriving yourself.",
        "Your 'Rich Life' is unique to you. Stop comparing your financial journey to others. Define what a rich life means and align your spending with that vision.",
        "Automate your finances: set up auto-transfers for savings and investments on payday, auto-pay for bills, and let the system run itself. Willpower is overrated.",
        "A 'money dial' is the one thing you're willing to spend disproportionately on because it brings you genuine joy. Find yours and crank it up without guilt.",
        "Earn more is often easier than cut more. Instead of obsessing over a ₹200 monthly subscription, invest energy in negotiating a raise or building a side income.",
    ],
}


def iter_chunks() -> list[tuple[str, str]]:
    """Return every ``(topic_key, text)`` pair in the seed corpus."""
    return [
        (topic, text)
        for topic, texts in KNOWLEDGE_BY_TOPIC.items()
        for text in texts
    ]


KNOWLEDGE_CHUNKS: list[str] = [text for _, text in iter_chunks()]
