export type TShirtSize = "SMALL" | "MID_RANGE" | "LARGE" | "VERY_LARGE";

export interface ComponentRow {
  name: string;
  qty: number;
  vcpu_each: number;
  ram_gb_each: number;
  storage_gb_each: number;
  os: "Windows" | "Linux";
  role: string;
}

export interface CalcInputs {
  num_passwords: number;
  licensing: {
    onprem_renewal: number;
    onprem_uplift: number;
    saas_subscription: number;
    saas_uplift: number;
  };
  inventory: ComponentRow[];
  rates: {
    rate_vcpu: number;
    rate_ram: number;
    rate_storage: number;
    rate_windows: number;
    rate_linux: number;
    rate_backup: number;
    rate_facilities: number;
    rate_network: number;
    rate_hsm: number;
  };
  ops: {
    fte_cost: number;
    onprem_fte: number;
    saas_fte: number;
    upgrade_cost: number;
    upgrade_count: number;
    dr_test_cost: number;
  };
  migration: { mig_ps: number; mig_internal: number; mig_training: number };
  connectors: {
    conn_qty: number;
    conn_vcpu: number;
    conn_ram: number;
    conn_storage: number;
  };
  params: { horizon: number; discount_rate: number };
  benefits: {
    b1: { enabled: boolean; breach_cost: number; breach_prob: number; risk_reduction: number };
    b2: { enabled: boolean; downtime_hours_per_upgrade: number; downtime_cost_hour: number };
    b3: { enabled: boolean; months_earlier: number };
    b4: { enabled: boolean; audit_hours_saved: number; audit_hourly_rate: number };
    b5: { enabled: boolean; refresh_capex: number; refresh_cycle_years: number };
    b6: { enabled: boolean; insurance_premium: number; premium_reduction: number };
  };
}

export interface YearLine {
  label: string;
  values: number[];
  total: number;
}

export interface ComponentCost {
  name: string;
  role: string;
  os: string;
  qty: number;
  tot_vcpu: number;
  tot_ram: number;
  tot_storage: number;
  compute: number;
  storage: number;
  os_cost: number;
  backup: number;
  facilities: number;
  annual: number;
}

export interface CategoryRow {
  category: string;
  onprem: number;
  saas: number;
  saving: number;
}

export interface BenefitItem {
  id: string;
  label: string;
  enabled: boolean;
  annual_value: number;
  oneoff_value: number;
  formula: string;
}

export interface CalcResult {
  engine_version: string;
  tshirt_size: TShirtSize;
  onprem: {
    components: ComponentCost[];
    infra_network: number;
    infra_hsm: number;
    infra_annual: number;
    ops_annual: number;
    licence: YearLine;
    infrastructure: YearLine;
    operations: YearLine;
    upgrades: YearLine;
    total: YearLine;
    tco: number;
  };
  saas: {
    conn_compute: number;
    conn_storage_cost: number;
    conn_os: number;
    conn_backup_facilities: number;
    conn_annual: number;
    subscription: YearLine;
    connectors: YearLine;
    operations: YearLine;
    migration: YearLine;
    total: YearLine;
    tco: number;
  };
  summary: {
    net_savings: number;
    roi_pct: number;
    payback_months: number;
    run_rate: number;
    annual_saving: number[];
    cumulative_saving: number[];
    npv_savings: number;
    categories: CategoryRow[];
  };
  benefits: {
    items: BenefitItem[];
    annual: number[];
    steady_state_annual: number;
    total: number;
    total_value: number;
    value_roi_pct: number;
    value_payback_months: number;
    npv_total_value: number;
  };
}

export interface AnalysisMeta {
  id: string;
  name: string;
  customer_name: string;
  description: string;
  created_at: string;
  updated_at: string;
  deleted: boolean;
}

export interface AnalysisListItem extends AnalysisMeta {
  headline: {
    net_savings: number;
    roi_pct: number;
    payback_months: number;
    total_value: number;
    tshirt_size: TShirtSize;
    num_passwords: number;
  };
}

export interface AnalysisFull extends AnalysisMeta {
  version_seq: number;
  version_id: string;
  engine_version: string;
  inputs: CalcInputs;
  results: CalcResult;
}

export function sizeFor(numPasswords: number): TShirtSize {
  if (numPasswords < 1_000) return "SMALL";
  if (numPasswords <= 20_000) return "MID_RANGE";
  if (numPasswords <= 100_000) return "LARGE";
  return "VERY_LARGE";
}

export const SIZE_LABELS: Record<TShirtSize, string> = {
  SMALL: "Small",
  MID_RANGE: "Mid-Range",
  LARGE: "Large",
  VERY_LARGE: "Very Large",
};

export const SIZE_RANGES: Record<TShirtSize, string> = {
  SMALL: "< 1,000 passwords",
  MID_RANGE: "1,000 – 20,000 passwords",
  LARGE: "20,000 – 100,000 passwords",
  VERY_LARGE: "> 100,000 passwords",
};
