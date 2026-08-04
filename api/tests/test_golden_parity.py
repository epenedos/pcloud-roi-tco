"""Golden parity: engine must reproduce the reference workbook exactly
(docs/CALC-SPEC.md §6, docs/reference/PAM_TCO_ROI.xlsx)."""
import pytest

from app.engine.calc import calculate
from app.engine.models import TShirtSize


@pytest.fixture
def result(workbook_inputs):
    return calculate(workbook_inputs)


def test_tshirt_size(result):
    assert result.tshirt_size == TShirtSize.MID_RANGE


def test_onprem_infra_annual(result):
    assert result.onprem.infra_annual == pytest.approx(32054)


def test_onprem_component_annuals(result):
    by_name = {c.name: c.annual for c in result.onprem.components}
    assert by_name["Vault (Primary Cluster)"] == pytest.approx(5932)
    assert by_name["Vault DR"] == pytest.approx(2966)
    assert by_name["CPM"] == pytest.approx(3628)
    assert by_name["PSM"] == pytest.approx(7584)
    assert by_name["PSMP"] == pytest.approx(4328)
    assert by_name["PTA"] == pytest.approx(3616)


def test_onprem_ops_annual(result):
    assert result.onprem.ops_annual == pytest.approx(150500)


def test_onprem_yearly_totals(result):
    assert result.onprem.total.values == pytest.approx([382554, 391554, 401004])
    assert result.onprem.tco == pytest.approx(1175112)


def test_saas_connector_annual(result):
    assert result.saas.conn_annual == pytest.approx(3628)


def test_saas_yearly_totals(result):
    assert result.saas.total.values == pytest.approx([262628, 196128, 200763])
    assert result.saas.tco == pytest.approx(659519)


def test_headlines(result):
    s = result.summary
    assert s.net_savings == pytest.approx(515593)
    assert s.roi_pct == pytest.approx(0.781771260570203, abs=1e-9)
    assert s.payback_months == pytest.approx(4.35970648736606, abs=1e-9)
    assert s.run_rate == pytest.approx(195426)


def test_cumulative_savings(result):
    assert result.summary.annual_saving == pytest.approx([119926, 195426, 200241])
    assert result.summary.cumulative_saving == pytest.approx([119926, 315352, 515593])


def test_npv(result):
    assert result.summary.npv_savings == pytest.approx(437546.650663009, abs=1e-6)


def test_categories(result):
    cats = {c.category: c for c in result.summary.categories}
    assert cats["Licence / Subscription"].onprem == pytest.approx(567450)
    assert cats["Licence / Subscription"].saas == pytest.approx(463635)
    assert cats["Licence / Subscription"].saving == pytest.approx(103815)
    assert cats["Infrastructure"].saving == pytest.approx(85278)
    assert cats["Operations & labour"].saving == pytest.approx(337500)
    assert cats["Version upgrades"].saving == pytest.approx(60000)
    assert cats["One-time migration"].saving == pytest.approx(-71000)
    assert sum(c.saving for c in cats.values()) == pytest.approx(515593)
