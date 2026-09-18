"""Indian income tax estimation — regime comparison and deduction headroom.

Everything here is an **estimate** built from the income the user declared and
the transactions they recorded. It is not a filing computation: it has no view
of Form 16, employer declarations, capital gains, other income heads, or
anything the user did not enter. The API labels it as such and the advisor is
instructed to do the same.

Figures are for **FY 2026-27 (AY 2027-28)**, the first year assessed under the
Income-tax Act, 2025. They are kept in one place, at the top of this module, so
a Finance Act change is a single edit.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Iterable

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transaction import Transaction
from app.models.user import User

# ── Statutory constants, FY 2026-27 (AY 2027-28) ─────────────────────────

TAX_YEAR = "FY 2026-27 (AY 2027-28)"

#: (upper bound of slab, rate). ``None`` upper bound means "and above".
NEW_REGIME_SLABS: tuple[tuple[float | None, float], ...] = (
    (400_000, 0.00),
    (800_000, 0.05),
    (1_200_000, 0.10),
    (1_600_000, 0.15),
    (2_000_000, 0.20),
    (2_400_000, 0.25),
    (None, 0.30),
)

OLD_REGIME_SLABS: tuple[tuple[float | None, float], ...] = (
    (250_000, 0.00),
    (500_000, 0.05),
    (1_000_000, 0.20),
    (None, 0.30),
)

NEW_STANDARD_DEDUCTION = 75_000.0
OLD_STANDARD_DEDUCTION = 50_000.0

#: Section 87A (now Section 156).
NEW_REBATE_LIMIT = 1_200_000.0
NEW_REBATE_MAX = 60_000.0
OLD_REBATE_LIMIT = 500_000.0
OLD_REBATE_MAX = 12_500.0

CESS_RATE = 0.04

#: (income above which it applies, surcharge rate), highest first.
SURCHARGE_BANDS: tuple[tuple[float, float], ...] = (
    (50_000_000, 0.25),
    (20_000_000, 0.25),
    (10_000_000, 0.15),
    (5_000_000, 0.10),
)
#: The old regime keeps the 37% top rate above ₹5 crore.
OLD_REGIME_TOP_SURCHARGE = 0.37

# ── Deduction ceilings (old regime unless noted) ─────────────────────────

LIMIT_80C = 150_000.0          # Section 123 under the 2025 Act
LIMIT_80D_SELF = 25_000.0      # Section 126
LIMIT_80D_SENIOR_PARENTS = 50_000.0
LIMIT_80CCD_1B = 50_000.0      # extra NPS, old regime only
LIMIT_24B = 200_000.0          # home loan interest, Section 20
LIMIT_80TTA = 10_000.0

#: Transaction categories treated as evidence of a deduction already used.
_CATEGORY_TO_DEDUCTION = {
    "Investments": "80C",
    "Healthcare": "80D",
}


# ── Data shapes ──────────────────────────────────────────────────────────


@dataclass
class RegimeResult:
    """Tax computed under one regime."""

    regime: str
    gross_income: float
    deductions_applied: float
    taxable_income: float
    tax_before_rebate: float
    rebate: float
    surcharge: float
    cess: float
    total_tax: float

    def as_dict(self) -> dict[str, float | str]:
        return {
            "regime": self.regime,
            "gross_income": round(self.gross_income, 2),
            "deductions_applied": round(self.deductions_applied, 2),
            "taxable_income": round(self.taxable_income, 2),
            "tax_before_rebate": round(self.tax_before_rebate, 2),
            "rebate": round(self.rebate, 2),
            "surcharge": round(self.surcharge, 2),
            "cess": round(self.cess, 2),
            "total_tax": round(self.total_tax, 2),
        }


@dataclass
class DeductionOpportunity:
    """One deduction, what is estimated used, and what remains."""

    section: str
    new_section: str
    label: str
    limit: float
    estimated_used: float
    available_in_new_regime: bool
    note: str = ""

    @property
    def headroom(self) -> float:
        return max(0.0, self.limit - self.estimated_used)

    def as_dict(self) -> dict[str, object]:
        return {
            "section": self.section,
            "new_section": self.new_section,
            "label": self.label,
            "limit": round(self.limit, 2),
            "estimated_used": round(self.estimated_used, 2),
            "headroom": round(self.headroom, 2),
            "available_in_new_regime": self.available_in_new_regime,
            "note": self.note,
        }


@dataclass
class TaxPlan:
    """The full estimate handed to the API and to the advisor prompt."""

    tax_year: str
    annual_income: float
    new_regime: RegimeResult
    old_regime: RegimeResult
    recommended_regime: str
    potential_saving: float
    opportunities: list[DeductionOpportunity] = field(default_factory=list)
    assumptions: list[str] = field(default_factory=list)

    def as_dict(self) -> dict[str, object]:
        return {
            "tax_year": self.tax_year,
            "annual_income": round(self.annual_income, 2),
            "new_regime": self.new_regime.as_dict(),
            "old_regime": self.old_regime.as_dict(),
            "recommended_regime": self.recommended_regime,
            "potential_saving": round(self.potential_saving, 2),
            "opportunities": [o.as_dict() for o in self.opportunities],
            "assumptions": self.assumptions,
        }


# ── Core arithmetic ──────────────────────────────────────────────────────


def slab_tax(taxable_income: float, slabs: Iterable[tuple[float | None, float]]) -> float:
    """Apply a progressive slab table to *taxable_income*."""
    if taxable_income <= 0:
        return 0.0

    tax = 0.0
    lower = 0.0
    for upper, rate in slabs:
        if upper is None:
            tax += max(0.0, taxable_income - lower) * rate
            break
        if taxable_income > upper:
            tax += (upper - lower) * rate
            lower = upper
        else:
            tax += max(0.0, taxable_income - lower) * rate
            break
    return tax


def _surcharge_rate(total_income: float, regime: str) -> float:
    """Return the surcharge rate for *total_income* under *regime*."""
    if total_income > 50_000_000 and regime == "old":
        return OLD_REGIME_TOP_SURCHARGE
    for threshold, rate in SURCHARGE_BANDS:
        if total_income > threshold:
            return rate
    return 0.0


def compute_new_regime(gross_income: float, employer_nps: float = 0.0) -> RegimeResult:
    """Tax under the new regime.

    Only the standard deduction and employer NPS under 80CCD(2) reduce income
    here; the rest of Chapter VI-A does not apply.
    """
    deductions = NEW_STANDARD_DEDUCTION + max(0.0, employer_nps)
    taxable = max(0.0, gross_income - deductions)

    tax = slab_tax(taxable, NEW_REGIME_SLABS)
    rebate = min(tax, NEW_REBATE_MAX) if taxable <= NEW_REBATE_LIMIT else 0.0
    after_rebate = max(0.0, tax - rebate)

    surcharge = after_rebate * _surcharge_rate(taxable, "new")
    cess = (after_rebate + surcharge) * CESS_RATE

    return RegimeResult(
        regime="new",
        gross_income=gross_income,
        deductions_applied=deductions,
        taxable_income=taxable,
        tax_before_rebate=tax,
        rebate=rebate,
        surcharge=surcharge,
        cess=cess,
        total_tax=after_rebate + surcharge + cess,
    )


def compute_old_regime(gross_income: float, deductions: float = 0.0) -> RegimeResult:
    """Tax under the old regime, with *deductions* on top of the standard one."""
    total_deductions = OLD_STANDARD_DEDUCTION + max(0.0, deductions)
    taxable = max(0.0, gross_income - total_deductions)

    tax = slab_tax(taxable, OLD_REGIME_SLABS)
    rebate = min(tax, OLD_REBATE_MAX) if taxable <= OLD_REBATE_LIMIT else 0.0
    after_rebate = max(0.0, tax - rebate)

    surcharge = after_rebate * _surcharge_rate(taxable, "old")
    cess = (after_rebate + surcharge) * CESS_RATE

    return RegimeResult(
        regime="old",
        gross_income=gross_income,
        deductions_applied=total_deductions,
        taxable_income=taxable,
        tax_before_rebate=tax,
        rebate=rebate,
        surcharge=surcharge,
        cess=cess,
        total_tax=after_rebate + surcharge + cess,
    )


def break_even_deductions(gross_income: float, *, precision: float = 1000.0) -> float:
    """Deductions at which the old regime first matches the new one.

    Returns ``0.0`` when the old regime already wins with none, and ``inf``
    when no achievable level of deduction closes the gap.
    """
    new_tax = compute_new_regime(gross_income).total_tax
    if compute_old_regime(gross_income, 0.0).total_tax <= new_tax:
        return 0.0

    ceiling = max(gross_income, precision)
    step = precision
    deductions = step
    while deductions <= ceiling:
        if compute_old_regime(gross_income, deductions).total_tax <= new_tax:
            return deductions
        deductions += step
    return float("inf")


# ── Building the plan from the user's own data ───────────────────────────


async def _category_totals(user: User, session: AsyncSession) -> dict[str, float]:
    """Sum the current financial year's transactions by category.

    The Indian financial year runs 1 April – 31 March.
    """
    now = datetime.now(timezone.utc)
    fy_start_year = now.year if now.month >= 4 else now.year - 1
    fy_start = datetime(fy_start_year, 4, 1, tzinfo=timezone.utc)

    rows = await session.execute(
        select(
            Transaction.category,
            func.coalesce(func.sum(Transaction.amount), 0.0).label("total"),
        )
        .where(
            Transaction.user_id == user.id,
            Transaction.transaction_date >= fy_start,
        )
        .group_by(Transaction.category)
    )
    return {row.category: float(row.total) for row in rows.all()}


def _build_opportunities(category_totals: dict[str, float]) -> list[DeductionOpportunity]:
    """Estimate deduction usage from recorded spending."""
    used: dict[str, float] = {}
    for category, amount in category_totals.items():
        section = _CATEGORY_TO_DEDUCTION.get(category)
        if section:
            used[section] = used.get(section, 0.0) + amount

    return [
        DeductionOpportunity(
            section="80C",
            new_section="Section 123",
            label="ELSS, PPF, EPF, life insurance, home loan principal, tuition fees",
            limit=LIMIT_80C,
            estimated_used=min(used.get("80C", 0.0), LIMIT_80C),
            available_in_new_regime=False,
            note=(
                "Estimated from transactions categorised as Investments. EPF "
                "deducted from salary and insurance premiums paid outside the "
                "app are not counted — add them before acting on the headroom."
            ),
        ),
        DeductionOpportunity(
            section="80D",
            new_section="Section 126",
            label="Health insurance premiums for self and family",
            limit=LIMIT_80D_SELF,
            estimated_used=min(used.get("80D", 0.0), LIMIT_80D_SELF),
            available_in_new_regime=False,
            note=(
                "Estimated from Healthcare spending, which also includes "
                "non-premium medical costs. A separate ₹25,000–₹50,000 is "
                "available for parents' policies."
            ),
        ),
        DeductionOpportunity(
            section="80CCD(1B)",
            new_section="see CBDT concordance",
            label="Additional NPS contribution, over and above 80C",
            limit=LIMIT_80CCD_1B,
            estimated_used=0.0,
            available_in_new_regime=False,
            note="Not inferable from transactions; enter your NPS contribution to refine.",
        ),
        DeductionOpportunity(
            section="80CCD(2)",
            new_section="see CBDT concordance",
            label="Employer NPS contribution, up to 14% of basic salary",
            limit=0.0,
            estimated_used=0.0,
            available_in_new_regime=True,
            note=(
                "The one significant deduction that survives under the new "
                "regime. Requires a salary restructuring with your employer; "
                "the limit depends on your basic pay."
            ),
        ),
        DeductionOpportunity(
            section="24(b)",
            new_section="Section 20",
            label="Home loan interest on a self-occupied property",
            limit=LIMIT_24B,
            estimated_used=0.0,
            available_in_new_regime=False,
            note="Not inferable from transactions; enter it to refine the comparison.",
        ),
    ]


async def build_tax_plan(
    user: User,
    session: AsyncSession,
    *,
    annual_income: float | None = None,
    declared_deductions: float | None = None,
) -> TaxPlan:
    """Estimate this user's position under both regimes.

    *annual_income* defaults to twelve times the monthly income on the profile.
    *declared_deductions* overrides the amount inferred from transactions.
    """
    income = annual_income if annual_income is not None else max(user.monthly_income, 0.0) * 12

    category_totals = await _category_totals(user, session)
    opportunities = _build_opportunities(category_totals)

    if declared_deductions is not None:
        deductions = max(0.0, declared_deductions)
        deduction_source = "the deductions you entered"
    else:
        deductions = sum(o.estimated_used for o in opportunities)
        deduction_source = "deductions inferred from your recorded transactions"

    new_result = compute_new_regime(income)
    old_result = compute_old_regime(income, deductions)

    recommended = "new" if new_result.total_tax <= old_result.total_tax else "old"
    saving = abs(new_result.total_tax - old_result.total_tax)

    break_even = break_even_deductions(income)
    assumptions = [
        f"Annual income taken as ₹{income:,.0f}"
        + ("" if annual_income is not None else " (monthly income on your profile × 12)"),
        f"Old-regime deductions of ₹{deductions:,.0f} from {deduction_source}",
        "Salaried standard deduction applied in both regimes",
        "No capital gains, other income heads, or surcharge-triggering income assumed",
    ]
    if break_even == 0.0:
        assumptions.append("The old regime wins here even with no extra deductions")
    elif break_even != float("inf"):
        assumptions.append(
            f"The old regime overtakes the new one at roughly "
            f"₹{break_even:,.0f} of total deductions"
        )
    else:
        assumptions.append("No realistic level of deductions makes the old regime cheaper here")

    return TaxPlan(
        tax_year=TAX_YEAR,
        annual_income=income,
        new_regime=new_result,
        old_regime=old_result,
        recommended_regime=recommended,
        potential_saving=saving,
        opportunities=opportunities,
        assumptions=assumptions,
    )


def summarise_for_prompt(plan: TaxPlan) -> str:
    """Render the plan as the plain-text block the advisor reasons over."""
    lines = [
        f"Tax year: {plan.tax_year}",
        f"Estimated annual income: ₹{plan.annual_income:,.0f}",
        "",
        f"New regime: taxable ₹{plan.new_regime.taxable_income:,.0f}, "
        f"total tax ₹{plan.new_regime.total_tax:,.0f}",
        f"Old regime: taxable ₹{plan.old_regime.taxable_income:,.0f}, "
        f"total tax ₹{plan.old_regime.total_tax:,.0f} "
        f"(with ₹{plan.old_regime.deductions_applied:,.0f} of deductions)",
        f"Cheaper option: {plan.recommended_regime} regime, by "
        f"₹{plan.potential_saving:,.0f}",
        "",
        "Deduction headroom:",
    ]
    for opportunity in plan.opportunities:
        if opportunity.limit > 0:
            lines.append(
                f"  - {opportunity.section} ({opportunity.label[:48]}): "
                f"₹{opportunity.estimated_used:,.0f} of ₹{opportunity.limit:,.0f} used, "
                f"₹{opportunity.headroom:,.0f} remaining"
                + ("" if opportunity.available_in_new_regime else " — old regime only")
            )
        else:
            lines.append(f"  - {opportunity.section}: {opportunity.note[:80]}")

    lines.append("")
    lines.append("Assumptions:")
    lines.extend(f"  - {assumption}" for assumption in plan.assumptions)
    return "\n".join(lines)
