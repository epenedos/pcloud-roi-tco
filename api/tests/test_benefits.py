"""Benefits engine tests (CALC-SPEC §1H, §5)."""
import pytest

from app.engine.calc import calculate


@pytest.fixture
def result(workbook_inputs):
    return calculate(workbook_inputs)


def items_by_id(result):
    return {i.id: i for i in result.benefits.items}


def test_b1_breach_risk(result):
    assert items_by_id(result)["B1"].annual_value == pytest.approx(
        4_500_000 * 0.05 * 0.15
    )  # 33,750


def test_b2_downtime(result):
    assert items_by_id(result)["B2"].annual_value == pytest.approx((2 / 3) * 8 * 5000)


def test_b3_time_to_value(result):
    # Y1 on-prem 382,554; Y1 SaaS recurring (excl. migration) 191,628
    expected = 3 * (382554 - (262628 - 71000)) / 12
    b3 = items_by_id(result)["B3"]
    assert b3.oneoff_value == pytest.approx(expected)
    assert b3.annual_value == 0.0


def test_b4_b5_b6(result):
    ids = items_by_id(result)
    assert ids["B4"].annual_value == pytest.approx(120 * 120)
    assert ids["B5"].annual_value == pytest.approx(90000 / 5)
    assert ids["B6"].annual_value == pytest.approx(150000 * 0.05)


def test_totals_and_value_view(result):
    b = result.benefits
    steady = 33750 + (2 / 3) * 8 * 5000 + 14400 + 18000 + 7500
    assert b.steady_state_annual == pytest.approx(steady)
    b3 = 3 * (382554 - 191628) / 12
    assert b.annual[0] == pytest.approx(steady + b3)
    assert b.total == pytest.approx(steady * 3 + b3)
    assert b.total_value == pytest.approx(515593 + b.total)
    assert b.value_roi_pct == pytest.approx(b.total_value / 659519)
    assert b.value_payback_months == pytest.approx(
        71000 / (195426 + steady) * 12
    )


def test_disable_all_benefits(workbook_inputs):
    for key in ("b1", "b2", "b3", "b4", "b5", "b6"):
        getattr(workbook_inputs.benefits, key).enabled = False
    result = calculate(workbook_inputs)
    b = result.benefits
    assert b.total == 0.0
    assert b.total_value == pytest.approx(result.summary.net_savings)
    assert b.value_roi_pct == pytest.approx(result.summary.roi_pct)
    assert b.value_payback_months == pytest.approx(result.summary.payback_months)
    assert b.npv_total_value == pytest.approx(result.summary.npv_savings)


def test_single_toggle(workbook_inputs):
    for key in ("b2", "b3", "b4", "b5", "b6"):
        getattr(workbook_inputs.benefits, key).enabled = False
    result = calculate(workbook_inputs)
    assert result.benefits.total == pytest.approx(33750 * 3)


def test_no_double_counting_of_tco_lines(workbook_inputs):
    """Benefits must not restate FTE savings or upgrade project costs, which are
    TCO lines. Guard: no benefit formula references fte_cost or upgrade_cost;
    scaling those inputs changes TCO but leaves benefit values untouched."""
    base = calculate(workbook_inputs)
    workbook_inputs.ops.fte_cost *= 2
    workbook_inputs.ops.upgrade_cost *= 2
    changed = calculate(workbook_inputs)
    for before, after in zip(base.benefits.items, changed.benefits.items):
        if before.id == "B3":
            continue  # B3 derives from the yearly cost delta by design
        assert before.annual_value == pytest.approx(after.annual_value)
        assert before.oneoff_value == pytest.approx(after.oneoff_value)


def test_payback_guard_non_positive(workbook_inputs):
    workbook_inputs.licensing.saas_subscription = 600_000  # SaaS costs more
    result = calculate(workbook_inputs)
    assert result.summary.run_rate < 0
    assert result.summary.payback_months == 0.0
