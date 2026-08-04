"""Degenerate-input guardrails (M7-T4): the tool must stay credible when the
numbers do not favour SaaS, and for non-default horizons."""
import pytest

from app.engine.calc import calculate


def test_saas_more_expensive_renders_honestly(workbook_inputs):
    workbook_inputs.licensing.saas_subscription = 600_000
    r = calculate(workbook_inputs)
    assert r.summary.net_savings < 0
    assert r.summary.roi_pct < 0
    assert r.summary.payback_months == 0.0  # never a fake payback
    assert r.summary.cumulative_saving[-1] == pytest.approx(r.summary.net_savings)


def test_zero_saas_quote_no_division_error(workbook_inputs):
    workbook_inputs.licensing.saas_subscription = 0
    workbook_inputs.ops.saas_fte = 0
    workbook_inputs.connectors.conn_qty = 0
    workbook_inputs.migration.mig_ps = 0
    workbook_inputs.migration.mig_internal = 0
    workbook_inputs.migration.mig_training = 0
    r = calculate(workbook_inputs)
    assert r.saas.tco == 0
    assert r.summary.roi_pct == 0.0  # guarded division
    assert r.summary.payback_months == 0.0


def test_horizon_one_year(workbook_inputs):
    workbook_inputs.params.horizon = 1
    r = calculate(workbook_inputs)
    assert len(r.onprem.total.values) == 1
    assert len(r.benefits.annual) == 1
    # steady-state falls back to Year 1
    assert r.summary.run_rate == pytest.approx(
        r.onprem.total.values[0] - r.saas.total.values[0]
    )


def test_horizon_five_years(workbook_inputs):
    workbook_inputs.params.horizon = 5
    r = calculate(workbook_inputs)
    assert len(r.onprem.total.values) == 5
    assert len(r.summary.cumulative_saving) == 5
    # licence keeps compounding
    assert r.onprem.licence.values[4] == pytest.approx(180000 * 1.05**4)
    # migration only in Y1
    assert r.saas.migration.values == pytest.approx([71000, 0, 0, 0, 0])


def test_empty_inventory_is_valid(workbook_inputs):
    workbook_inputs.inventory = []
    r = calculate(workbook_inputs)
    assert r.onprem.infra_annual == pytest.approx(4000)  # network allocation only
