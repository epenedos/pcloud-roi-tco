"""Typed input/output models for the calculation engine (CALC-SPEC §1)."""
from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


class TShirtSize(str, Enum):
    SMALL = "SMALL"
    MID_RANGE = "MID_RANGE"
    LARGE = "LARGE"
    VERY_LARGE = "VERY_LARGE"


class ComponentRow(BaseModel):
    name: str
    qty: int = Field(ge=0)
    vcpu_each: float = Field(ge=0)
    ram_gb_each: float = Field(ge=0)
    storage_gb_each: float = Field(ge=0)
    os: Literal["Windows", "Linux"]
    role: str = ""


class Licensing(BaseModel):
    onprem_renewal: float = Field(ge=0)
    onprem_uplift: float = Field(ge=-1, le=1)
    saas_subscription: float = Field(ge=0)
    saas_uplift: float = Field(ge=-1, le=1)


class Rates(BaseModel):
    rate_vcpu: float = Field(ge=0)
    rate_ram: float = Field(ge=0)
    rate_storage: float = Field(ge=0)
    rate_windows: float = Field(ge=0)
    rate_linux: float = Field(ge=0)
    rate_backup: float = Field(ge=0)
    rate_facilities: float = Field(ge=0)
    rate_network: float = Field(ge=0)
    rate_hsm: float = Field(ge=0)


class Ops(BaseModel):
    fte_cost: float = Field(ge=0)
    onprem_fte: float = Field(ge=0)
    saas_fte: float = Field(ge=0)
    upgrade_cost: float = Field(ge=0)
    upgrade_count: int = Field(ge=0)
    dr_test_cost: float = Field(ge=0)


class Migration(BaseModel):
    mig_ps: float = Field(ge=0)
    mig_internal: float = Field(ge=0)
    mig_training: float = Field(ge=0)


class Connectors(BaseModel):
    conn_qty: int = Field(ge=0)
    conn_vcpu: float = Field(ge=0)
    conn_ram: float = Field(ge=0)
    conn_storage: float = Field(ge=0)


class Params(BaseModel):
    horizon: int = Field(ge=1, le=10)
    discount_rate: float = Field(ge=0, le=1)


class BenefitB1(BaseModel):
    enabled: bool = True
    breach_cost: float = Field(ge=0)
    breach_prob: float = Field(ge=0, le=1)
    risk_reduction: float = Field(ge=0, le=1)


class BenefitB2(BaseModel):
    enabled: bool = True
    downtime_hours_per_upgrade: float = Field(ge=0)
    downtime_cost_hour: float = Field(ge=0)


class BenefitB3(BaseModel):
    enabled: bool = True
    months_earlier: float = Field(ge=0, le=36)


class BenefitB4(BaseModel):
    enabled: bool = True
    audit_hours_saved: float = Field(ge=0)
    audit_hourly_rate: float = Field(ge=0)


class BenefitB5(BaseModel):
    enabled: bool = True
    refresh_capex: float = Field(ge=0)
    refresh_cycle_years: float = Field(gt=0)


class BenefitB6(BaseModel):
    enabled: bool = True
    insurance_premium: float = Field(ge=0)
    premium_reduction: float = Field(ge=0, le=1)


class Benefits(BaseModel):
    b1: BenefitB1
    b2: BenefitB2
    b3: BenefitB3
    b4: BenefitB4
    b5: BenefitB5
    b6: BenefitB6


class CalcInputs(BaseModel):
    """Complete input set for one analysis (CALC-SPEC §1, sections A-H)."""

    num_passwords: int = Field(ge=1)
    licensing: Licensing
    inventory: list[ComponentRow]
    rates: Rates
    ops: Ops
    migration: Migration
    connectors: Connectors
    params: Params
    benefits: Benefits


# ---------- results ----------

class ComponentCost(BaseModel):
    name: str
    role: str
    os: str
    qty: int
    tot_vcpu: float
    tot_ram: float
    tot_storage: float
    compute: float
    storage: float
    os_cost: float
    backup: float
    facilities: float
    annual: float


class YearLine(BaseModel):
    label: str
    values: list[float]  # one per year
    total: float


class OnPremResult(BaseModel):
    components: list[ComponentCost]
    infra_network: float
    infra_hsm: float
    infra_annual: float
    ops_annual: float
    licence: YearLine
    infrastructure: YearLine
    operations: YearLine
    upgrades: YearLine
    total: YearLine
    tco: float


class SaaSResult(BaseModel):
    conn_compute: float
    conn_storage_cost: float
    conn_os: float
    conn_backup_facilities: float
    conn_annual: float
    subscription: YearLine
    connectors: YearLine
    operations: YearLine
    migration: YearLine
    total: YearLine
    tco: float


class CategoryRow(BaseModel):
    category: str
    onprem: float
    saas: float
    saving: float


class Summary(BaseModel):
    net_savings: float
    roi_pct: float
    payback_months: float
    run_rate: float
    annual_saving: list[float]
    cumulative_saving: list[float]
    npv_savings: float
    categories: list[CategoryRow]


class BenefitItem(BaseModel):
    id: str
    label: str
    enabled: bool
    annual_value: float   # recurring annual value (0 for one-time benefits)
    oneoff_value: float   # one-time Year-1 value (0 for recurring benefits)
    formula: str


class BenefitsResult(BaseModel):
    items: list[BenefitItem]
    annual: list[float]           # benefits per year (Y1 includes one-time)
    steady_state_annual: float    # recurring benefits only
    total: float
    total_value: float            # net_savings + total
    value_roi_pct: float
    value_payback_months: float
    npv_total_value: float


class CalcResult(BaseModel):
    engine_version: str
    tshirt_size: TShirtSize
    onprem: OnPremResult
    saas: SaaSResult
    summary: Summary
    benefits: BenefitsResult
