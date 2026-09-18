"""Tests for the FY 2026-27 tax estimation logic.

The expected figures are computed by hand from the published slabs rather than
from the implementation, so a change to the constants that breaks the intended
behaviour fails here rather than passing silently.
"""

import pytest

from app.services import tax_service as tax
from app.services.tax_service import (
    CESS_RATE,
    NEW_REGIME_SLABS,
    OLD_REGIME_SLABS,
    break_even_deductions,
    compute_new_regime,
    compute_old_regime,
    slab_tax,
    summarise_for_prompt,
)


# ── Slab arithmetic ──────────────────────────────────────────────────────

def test_slab_tax_is_zero_below_the_exemption():
    assert slab_tax(0, NEW_REGIME_SLABS) == 0
    assert slab_tax(-5000, NEW_REGIME_SLABS) == 0
    assert slab_tax(400_000, NEW_REGIME_SLABS) == 0


def test_slab_tax_is_progressive_not_flat():
    """₹8,00,001 must not be taxed at 10% on the whole amount."""
    # 4L nil + 4L at 5% = 20,000
    assert slab_tax(800_000, NEW_REGIME_SLABS) == pytest.approx(20_000)
    # plus 4L at 10% = 60,000
    assert slab_tax(1_200_000, NEW_REGIME_SLABS) == pytest.approx(60_000)
    # plus 3.25L at 15%
    assert slab_tax(1_525_000, NEW_REGIME_SLABS) == pytest.approx(60_000 + 48_750)


def test_old_regime_slab_arithmetic():
    # 2.5L nil, 2.5L at 5% = 12,500
    assert slab_tax(500_000, OLD_REGIME_SLABS) == pytest.approx(12_500)
    # plus 5L at 20% = 112,500
    assert slab_tax(1_000_000, OLD_REGIME_SLABS) == pytest.approx(112_500)
    # plus 5L at 30% = 262,500
    assert slab_tax(1_500_000, OLD_REGIME_SLABS) == pytest.approx(262_500)


def test_slab_tax_is_monotonic():
    previous = -1.0
    for income in range(0, 3_000_000, 50_000):
        current = slab_tax(income, NEW_REGIME_SLABS)
        assert current >= previous
        previous = current


# ── New regime ───────────────────────────────────────────────────────────

def test_new_regime_rebate_makes_12_75_lakh_salary_tax_free():
    """₹75,000 standard deduction + the 87A rebate up to ₹12L taxable."""
    assert compute_new_regime(1_275_000).total_tax == 0


def test_new_regime_just_above_the_rebate_cliff():
    result = compute_new_regime(1_300_000)
    assert result.taxable_income == pytest.approx(1_225_000)
    assert result.rebate == 0
    assert result.total_tax > 0


def test_new_regime_applies_standard_deduction_and_cess():
    result = compute_new_regime(1_600_000)

    assert result.deductions_applied == pytest.approx(75_000)
    assert result.taxable_income == pytest.approx(1_525_000)
    assert result.tax_before_rebate == pytest.approx(108_750)
    assert result.cess == pytest.approx(108_750 * CESS_RATE)
    assert result.total_tax == pytest.approx(113_100)


def test_employer_nps_reduces_new_regime_income():
    """80CCD(2) is the deduction that survives the new regime."""
    without = compute_new_regime(2_000_000)
    with_nps = compute_new_regime(2_000_000, employer_nps=140_000)

    assert with_nps.taxable_income == pytest.approx(without.taxable_income - 140_000)
    assert with_nps.total_tax < without.total_tax


def test_new_regime_surcharge_applies_above_fifty_lakh():
    below = compute_new_regime(4_900_000)
    above = compute_new_regime(6_000_000)

    assert below.surcharge == 0
    assert above.surcharge > 0


# ── Old regime ───────────────────────────────────────────────────────────

def test_old_regime_rebate_at_five_lakh_taxable():
    assert compute_old_regime(550_000, 0).total_tax == 0
    assert compute_old_regime(600_000, 0).total_tax > 0


def test_old_regime_deductions_reduce_taxable_income():
    result = compute_old_regime(1_500_000, 450_000)

    assert result.deductions_applied == pytest.approx(500_000)  # 450k + 50k standard
    assert result.taxable_income == pytest.approx(1_000_000)


def test_deductions_never_push_taxable_income_negative():
    result = compute_old_regime(300_000, 900_000)
    assert result.taxable_income == 0
    assert result.total_tax == 0


# ── Regime comparison ────────────────────────────────────────────────────

def test_new_regime_wins_without_deductions():
    for income in (700_000, 1_000_000, 1_500_000, 2_500_000):
        assert compute_new_regime(income).total_tax <= compute_old_regime(income, 0).total_tax


def test_old_regime_wins_with_large_deductions():
    """A full 80C + 80D + NPS + home loan interest claim flips the comparison."""
    income = 1_800_000
    deductions = 150_000 + 25_000 + 50_000 + 200_000 + 240_000  # + HRA

    assert compute_old_regime(income, deductions).total_tax < compute_new_regime(income).total_tax


def test_break_even_deductions_is_the_crossover_point():
    income = 2_000_000
    break_even = break_even_deductions(income)

    assert break_even > 0
    new_tax = compute_new_regime(income).total_tax
    # At the break-even the old regime is at least as cheap...
    assert compute_old_regime(income, break_even).total_tax <= new_tax
    # ...and a step below it, it is not.
    assert compute_old_regime(income, break_even - 2_000).total_tax > new_tax


def test_break_even_is_zero_when_old_regime_already_wins():
    # Below the old regime's rebate ceiling both are nil, so old never loses.
    assert break_even_deductions(400_000) == 0


# ── Plan assembly ────────────────────────────────────────────────────────

def test_opportunities_cover_the_main_sections():
    opportunities = tax._build_opportunities({})
    sections = {o.section for o in opportunities}

    assert {"80C", "80D", "80CCD(1B)", "80CCD(2)", "24(b)"} <= sections

    by_section = {o.section: o for o in opportunities}
    assert by_section["80C"].limit == 150_000
    assert by_section["80C"].headroom == 150_000
    # Only employer NPS survives the new regime.
    assert by_section["80CCD(2)"].available_in_new_regime is True
    assert by_section["80C"].available_in_new_regime is False


def test_opportunities_read_usage_from_transaction_categories():
    opportunities = tax._build_opportunities({"Investments": 60_000, "Healthcare": 8_000})
    by_section = {o.section: o for o in opportunities}

    assert by_section["80C"].estimated_used == 60_000
    assert by_section["80C"].headroom == 90_000
    assert by_section["80D"].estimated_used == 8_000


def test_estimated_usage_is_capped_at_the_limit():
    opportunities = tax._build_opportunities({"Investments": 500_000})
    by_section = {o.section: o for o in opportunities}

    assert by_section["80C"].estimated_used == 150_000
    assert by_section["80C"].headroom == 0


async def test_build_tax_plan_from_the_user_profile(session_factory, test_user):
    async with session_factory() as session:
        plan = await tax.build_tax_plan(test_user, session)

    # monthly_income 10,000 × 12
    assert plan.annual_income == pytest.approx(120_000)
    assert plan.recommended_regime in {"new", "old"}
    assert plan.new_regime.total_tax == 0  # well below the exemption
    assert plan.assumptions


async def test_declared_deductions_override_inference(session_factory, test_user):
    async with session_factory() as session:
        plan = await tax.build_tax_plan(
            test_user,
            session,
            annual_income=1_800_000,
            declared_deductions=600_000,
        )

    assert plan.annual_income == 1_800_000
    assert plan.old_regime.deductions_applied == pytest.approx(650_000)
    assert plan.recommended_regime == "old"
    assert plan.potential_saving > 0


async def test_summary_for_prompt_contains_both_regimes(session_factory, test_user):
    async with session_factory() as session:
        plan = await tax.build_tax_plan(test_user, session, annual_income=1_500_000)

    summary = summarise_for_prompt(plan)

    assert "New regime" in summary
    assert "Old regime" in summary
    assert "Deduction headroom" in summary
    assert "Assumptions" in summary
    assert tax.TAX_YEAR in summary
