"""Pure calculation engine implementing docs/CALC-SPEC.md §2-§5.

No I/O here: inputs in, results out, full float precision throughout;
rounding happens only at presentation.
"""
from app.engine import ENGINE_VERSION
from app.engine.models import (
    BenefitItem,
    BenefitsResult,
    CalcInputs,
    CalcResult,
    CategoryRow,
    ComponentCost,
    OnPremResult,
    SaaSResult,
    Summary,
    YearLine,
)
from app.engine.sizing import size_for


def _year_line(label: str, values: list[float]) -> YearLine:
    return YearLine(label=label, values=values, total=sum(values))


def _npv(rate: float, cashflows: list[float]) -> float:
    """Excel NPV convention: first cashflow discounted one full period."""
    return sum(cf / (1 + rate) ** (y + 1) for y, cf in enumerate(cashflows))


def compute_onprem(inp: CalcInputs) -> OnPremResult:
    r = inp.rates
    years = inp.params.horizon

    components: list[ComponentCost] = []
    for row in inp.inventory:
        tot_vcpu = row.qty * row.vcpu_each
        tot_ram = row.qty * row.ram_gb_each
        tot_storage = row.qty * row.storage_gb_each
        compute = tot_vcpu * r.rate_vcpu + tot_ram * r.rate_ram
        storage = tot_storage * r.rate_storage
        os_cost = row.qty * (r.rate_windows if row.os == "Windows" else r.rate_linux)
        backup = row.qty * r.rate_backup
        facilities = row.qty * r.rate_facilities
        components.append(
            ComponentCost(
                name=row.name,
                role=row.role,
                os=row.os,
                qty=row.qty,
                tot_vcpu=tot_vcpu,
                tot_ram=tot_ram,
                tot_storage=tot_storage,
                compute=compute,
                storage=storage,
                os_cost=os_cost,
                backup=backup,
                facilities=facilities,
                annual=compute + storage + os_cost + backup + facilities,
            )
        )

    infra_annual = sum(c.annual for c in components) + r.rate_network + r.rate_hsm
    ops_annual = inp.ops.onprem_fte * inp.ops.fte_cost + inp.ops.dr_test_cost
    upgrades_annual = inp.ops.upgrade_cost * inp.ops.upgrade_count / years

    licence = [
        inp.licensing.onprem_renewal * (1 + inp.licensing.onprem_uplift) ** y
        for y in range(years)
    ]
    infra = [infra_annual] * years
    ops = [ops_annual] * years
    upgrades = [upgrades_annual] * years
    total = [licence[y] + infra[y] + ops[y] + upgrades[y] for y in range(years)]

    return OnPremResult(
        components=components,
        infra_network=r.rate_network,
        infra_hsm=r.rate_hsm,
        infra_annual=infra_annual,
        ops_annual=ops_annual,
        licence=_year_line("Software licence / maintenance", licence),
        infrastructure=_year_line("Infrastructure", infra),
        operations=_year_line("Operations & labour", ops),
        upgrades=_year_line("Major version upgrades (annualised)", upgrades),
        total=_year_line("TOTAL On-Prem TCO", total),
        tco=sum(total),
    )


def compute_saas(inp: CalcInputs) -> SaaSResult:
    r = inp.rates
    c = inp.connectors
    years = inp.params.horizon

    conn_compute = c.conn_qty * c.conn_vcpu * r.rate_vcpu + c.conn_qty * c.conn_ram * r.rate_ram
    conn_storage_cost = c.conn_qty * c.conn_storage * r.rate_storage
    conn_os = c.conn_qty * r.rate_windows  # workbook models connectors as Windows VMs
    conn_backup_facilities = c.conn_qty * (r.rate_backup + r.rate_facilities)
    conn_annual = conn_compute + conn_storage_cost + conn_os + conn_backup_facilities

    subscription = [
        inp.licensing.saas_subscription * (1 + inp.licensing.saas_uplift) ** y
        for y in range(years)
    ]
    connectors = [conn_annual] * years
    ops = [inp.ops.saas_fte * inp.ops.fte_cost] * years
    mig_total = inp.migration.mig_ps + inp.migration.mig_internal + inp.migration.mig_training
    migration = [mig_total if y == 0 else 0.0 for y in range(years)]
    total = [subscription[y] + connectors[y] + ops[y] + migration[y] for y in range(years)]

    return SaaSResult(
        conn_compute=conn_compute,
        conn_storage_cost=conn_storage_cost,
        conn_os=conn_os,
        conn_backup_facilities=conn_backup_facilities,
        conn_annual=conn_annual,
        subscription=_year_line("SaaS subscription", subscription),
        connectors=_year_line("Residual connector infrastructure", connectors),
        operations=_year_line("Operations & labour (policy admin)", ops),
        migration=_year_line("One-time migration (Year 1)", migration),
        total=_year_line("TOTAL SaaS TCO", total),
        tco=sum(total),
    )


def compute_summary(inp: CalcInputs, onprem: OnPremResult, saas: SaaSResult) -> Summary:
    years = inp.params.horizon
    net_savings = onprem.tco - saas.tco
    roi_pct = net_savings / saas.tco if saas.tco else 0.0

    # Workbook: steady-state saving = Year-2 delta (falls back to Year-1 when horizon=1)
    steady_year = 1 if years > 1 else 0
    run_rate = onprem.total.values[steady_year] - saas.total.values[steady_year]
    # Workbook: months to recoup the one-time migration investment
    migration_y1 = saas.migration.values[0]
    payback_months = 0.0 if run_rate <= 0 else migration_y1 / run_rate * 12

    annual_saving = [
        onprem.total.values[y] - saas.total.values[y] for y in range(years)
    ]
    cumulative: list[float] = []
    acc = 0.0
    for s in annual_saving:
        acc += s
        cumulative.append(acc)

    categories = [
        CategoryRow(
            category="Licence / Subscription",
            onprem=onprem.licence.total,
            saas=saas.subscription.total,
            saving=onprem.licence.total - saas.subscription.total,
        ),
        CategoryRow(
            category="Infrastructure",
            onprem=onprem.infrastructure.total,
            saas=saas.connectors.total,
            saving=onprem.infrastructure.total - saas.connectors.total,
        ),
        CategoryRow(
            category="Operations & labour",
            onprem=onprem.operations.total,
            saas=saas.operations.total,
            saving=onprem.operations.total - saas.operations.total,
        ),
        CategoryRow(
            category="Version upgrades",
            onprem=onprem.upgrades.total,
            saas=0.0,
            saving=onprem.upgrades.total,
        ),
        CategoryRow(
            category="One-time migration",
            onprem=0.0,
            saas=saas.migration.total,
            saving=-saas.migration.total,
        ),
    ]

    return Summary(
        net_savings=net_savings,
        roi_pct=roi_pct,
        payback_months=payback_months,
        run_rate=run_rate,
        annual_saving=annual_saving,
        cumulative_saving=cumulative,
        npv_savings=_npv(inp.params.discount_rate, annual_saving),
        categories=categories,
    )


def compute_benefits(
    inp: CalcInputs, onprem: OnPremResult, saas: SaaSResult, summary: Summary
) -> BenefitsResult:
    """CALC-SPEC §1H + §5. Benefits never restate TCO lines (FTE delta, upgrade
    project cost): B2 counts business downtime only, B3 uses the recurring-cost
    delta, all other benefits are external to the TCO model."""
    b = inp.benefits
    years = inp.params.horizon

    b1_annual = b.b1.breach_cost * b.b1.breach_prob * b.b1.risk_reduction
    b2_annual = (
        inp.ops.upgrade_count / years
    ) * b.b2.downtime_hours_per_upgrade * b.b2.downtime_cost_hour
    saas_y1_recurring = saas.total.values[0] - saas.migration.values[0]
    b3_oneoff = b.b3.months_earlier * (onprem.total.values[0] - saas_y1_recurring) / 12
    b4_annual = b.b4.audit_hours_saved * b.b4.audit_hourly_rate
    b5_annual = b.b5.refresh_capex / b.b5.refresh_cycle_years
    b6_annual = b.b6.insurance_premium * b.b6.premium_reduction

    items = [
        BenefitItem(
            id="B1", label="Breach-risk reduction", enabled=b.b1.enabled,
            annual_value=b1_annual, oneoff_value=0.0,
            formula="breach cost × annual breach probability × risk reduction %",
        ),
        BenefitItem(
            id="B2", label="Upgrade-downtime avoidance", enabled=b.b2.enabled,
            annual_value=b2_annual, oneoff_value=0.0,
            formula="(upgrades ÷ horizon) × downtime hours per upgrade × downtime cost/hour",
        ),
        BenefitItem(
            id="B3", label="Faster time-to-value", enabled=b.b3.enabled,
            annual_value=0.0, oneoff_value=b3_oneoff,
            formula="months earlier × (Year-1 on-prem cost − Year-1 SaaS recurring cost) ÷ 12",
        ),
        BenefitItem(
            id="B4", label="Audit & compliance efficiency", enabled=b.b4.enabled,
            annual_value=b4_annual, oneoff_value=0.0,
            formula="audit hours saved per year × hourly rate",
        ),
        BenefitItem(
            id="B5", label="Hardware refresh avoidance", enabled=b.b5.enabled,
            annual_value=b5_annual, oneoff_value=0.0,
            formula="refresh capex ÷ refresh cycle years",
        ),
        BenefitItem(
            id="B6", label="Cyber-insurance premium reduction", enabled=b.b6.enabled,
            annual_value=b6_annual, oneoff_value=0.0,
            formula="annual premium × premium reduction %",
        ),
    ]

    steady = sum(i.annual_value for i in items if i.enabled)
    annual = [steady] * years
    if items[2].enabled:  # B3 one-time lands in Year 1
        annual[0] += items[2].oneoff_value
    total = sum(annual)

    total_value = summary.net_savings + total
    value_roi = total_value / saas.tco if saas.tco else 0.0
    value_run_rate = summary.run_rate + steady
    migration_y1 = saas.migration.values[0]
    value_payback = (
        0.0 if value_run_rate <= 0 else migration_y1 / value_run_rate * 12
    )
    value_cashflows = [summary.annual_saving[y] + annual[y] for y in range(years)]

    return BenefitsResult(
        items=items,
        annual=annual,
        steady_state_annual=steady,
        total=total,
        total_value=total_value,
        value_roi_pct=value_roi,
        value_payback_months=value_payback,
        npv_total_value=_npv(inp.params.discount_rate, value_cashflows),
    )


def calculate(inp: CalcInputs) -> CalcResult:
    onprem = compute_onprem(inp)
    saas = compute_saas(inp)
    summary = compute_summary(inp, onprem, saas)
    benefits = compute_benefits(inp, onprem, saas, summary)
    return CalcResult(
        engine_version=ENGINE_VERSION,
        tshirt_size=size_for(inp.num_passwords),
        onprem=onprem,
        saas=saas,
        summary=summary,
        benefits=benefits,
    )
