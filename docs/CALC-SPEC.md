# Calculation Specification — CyberArk PAM TCO/ROI Model (v1)

Source of truth: `docs/reference/PAM_TCO_ROI.xlsx` (customer-provided 3-year On-Prem vs
SaaS model, EUR) plus the two v1 extensions requested by the product owner:

1. **Number of passwords** input → drives a **t-shirt size** that pre-fills the on-prem
   component inventory.
2. **SaaS additional benefits** module → quantified value beyond raw cost savings.

Every formula below must be reproduced exactly by the calculation engine. The golden
parity test (`M1-T6`) asserts the engine reproduces the workbook's example outputs from
the workbook's example inputs.

---

## 1. Inputs

All inputs are editable per analysis. Defaults shown are the workbook's example values
(illustrative industry benchmarks, not CyberArk quotes — the UI must carry this
disclaimer).

### A. Licensing / Subscription
| Key | Label | Default |
|---|---|---|
| `onprem_renewal` | On-prem annual licence renewal (maintenance) | €180,000 |
| `onprem_uplift` | On-prem renewal annual uplift % | 5% |
| `saas_subscription` | SaaS annual subscription (Privilege Cloud) | €150,000 |
| `saas_uplift` | SaaS subscription annual uplift % | 3% |

### A2. Scope & Sizing (NEW in v1)
| Key | Label | Default |
|---|---|---|
| `num_passwords` | Number of passwords (privileged credentials under management) | 5,000 |

**T-shirt size derivation** (from `num_passwords`):

| Size | Condition |
|---|---|
| `SMALL` | < 1,000 |
| `MID_RANGE` | ≥ 1,000 and ≤ 20,000 |
| `LARGE` | > 20,000 and ≤ 100,000 |
| `VERY_LARGE` | > 100,000 |

The derived size selects a **default on-prem component inventory** (section B). The user
may override any row afterwards; changing `num_passwords` re-applies the size defaults
only after an explicit confirmation (never silently destroy user edits).

**Default inventory per t-shirt size** (qty × vCPU / RAM GB / storage GB per node, OS):

| Component | OS | Small | Mid-Range | Large | Very Large |
|---|---|---|---|---|---|
| Vault (Primary Cluster) | Windows | 1 × 8/32/500 | 2 × 8/32/500 | 2 × 16/64/1000 | 2 × 32/128/2000 |
| Vault DR | Windows | 1 × 8/32/500 | 1 × 8/32/500 | 2 × 16/64/1000 | 2 × 32/128/2000 |
| CPM | Windows | 1 × 4/8/100 | 2 × 4/8/100 | 3 × 8/16/100 | 4 × 8/16/150 |
| PSM | Windows | 1 × 8/16/250 | 3 × 8/16/250 | 6 × 8/32/500 | 10 × 16/64/500 |
| PSMP | Linux | 1 × 4/8/100 | 2 × 4/8/100 | 3 × 8/16/100 | 4 × 8/16/150 |
| PTA | Linux | 0 | 1 × 8/32/1000 | 1 × 16/64/2000 | 2 × 16/64/2000 |

The Mid-Range column equals the workbook's example inventory, so the golden parity test
runs at `num_passwords = 5,000`. Defaults live in versioned config (not code constants
scattered around) so field engineers can tune them.

### B. On-Prem Component Inventory
Per component row: `qty`, `vcpu_each`, `ram_gb_each`, `storage_gb_each`, `os`
(`Windows` | `Linux`), `role` (display only). Rows are editable and user can add/remove
custom rows.

### C. Infrastructure Unit Rates (annual, EUR)
| Key | Label | Default |
|---|---|---|
| `rate_vcpu` | Compute per vCPU / year | 120 |
| `rate_ram` | Compute per GB RAM / year | 18 |
| `rate_storage` | Storage per GB / year | 0.60 |
| `rate_windows` | Windows Server licence / VM / year | 350 |
| `rate_linux` | Linux (RHEL) subscription / VM / year | 700 |
| `rate_backup` | Backup / VM / year | 180 |
| `rate_facilities` | Facilities (power, cooling, DC space) / VM / year | 600 |
| `rate_network` | Network / LB / firewall allocation / year (environment-level, once) | 4,000 |
| `rate_hsm` | HSM / key management / year (0 if none) | 0 |

### D. Operations & Labour
| Key | Label | Default |
|---|---|---|
| `fte_cost` | Fully-loaded FTE cost / year | €95,000 |
| `onprem_fte` | On-prem PAM platform + infra admin (FTE) | 1.5 |
| `saas_fte` | SaaS PAM admin (FTE) | 0.4 |
| `upgrade_cost` | Major version upgrade — cost each | €30,000 |
| `upgrade_count` | Number of major upgrades in horizon (on-prem only) | 2 |
| `dr_test_cost` | DR test / audit / year | €8,000 |

### E. One-Time Migration Cost (SaaS project, Year 1)
| Key | Label | Default |
|---|---|---|
| `mig_ps` | Professional services (migration) | €45,000 |
| `mig_internal` | Internal migration effort | €20,000 |
| `mig_training` | Training & enablement | €6,000 |

### F. SaaS Residual On-Prem Connectors
| Key | Label | Default |
|---|---|---|
| `conn_qty` | Connector VMs remaining on-prem | 2 |
| `conn_vcpu` | vCPU each | 4 |
| `conn_ram` | RAM GB each | 8 |
| `conn_storage` | Storage GB each | 100 |

### G. Analysis Parameters
| Key | Label | Default |
|---|---|---|
| `horizon` | Analysis horizon (years) | 3 |
| `discount_rate` | Discount rate (for NPV) | 8% |

Note: the workbook is hard-wired to 3 years. v1 implements the engine generically over
`horizon` years but the UI ships with 3 as the default; the parity test uses 3.

### H. SaaS Additional Benefits (NEW in v1)
Each benefit is **individually toggleable** (`enabled` flag, all ON by default) and fully
editable. Benefits are reported **separately** from hard cost savings — never blended
silently — so the CFO can accept or strike each line.

| ID | Benefit | Inputs (defaults) | Annual value formula |
|---|---|---|---|
| `B1` | Breach-risk reduction | `breach_cost` (€4,500,000), `breach_prob` (5%/yr), `risk_reduction` (15%) | `breach_cost × breach_prob × risk_reduction` |
| `B2` | Upgrade-downtime avoidance | `downtime_hours_per_upgrade` (8), `downtime_cost_hour` (€5,000) | `(upgrade_count / horizon) × downtime_hours_per_upgrade × downtime_cost_hour` |
| `B3` | Faster time-to-value | `months_earlier` (3) | One-time, Year 1 only: `months_earlier × (year1_onprem_cost − year1_saas_recurring) / 12` where `year1_saas_recurring` excludes migration |
| `B4` | Audit & compliance efficiency | `audit_hours_saved` (120/yr), `audit_hourly_rate` (€120) | `audit_hours_saved × audit_hourly_rate` |
| `B5` | Hardware refresh avoidance | `refresh_capex` (€90,000), `refresh_cycle_years` (5) | `refresh_capex / refresh_cycle_years` |
| `B6` | Cyber-insurance premium reduction | `insurance_premium` (€150,000/yr), `premium_reduction` (5%) | `insurance_premium × premium_reduction` |

Anti-double-counting rule: FTE savings and upgrade project costs are already in the TCO
delta — benefits must not restate them. B2 counts only *business downtime* cost, not the
upgrade project cost (which is TCO line `Version upgrades`).

---

## 2. On-Prem TCO

### 2.1 Infrastructure — annual, per component row
```
tot_vcpu    = qty × vcpu_each
tot_ram     = qty × ram_gb_each
tot_storage = qty × storage_gb_each
compute     = tot_vcpu × rate_vcpu + tot_ram × rate_ram
storage     = tot_storage × rate_storage
os          = qty × (rate_windows if os == Windows else rate_linux)
backup      = qty × rate_backup
facilities  = qty × rate_facilities
row_annual  = compute + storage + os + backup + facilities
```
```
infra_annual = Σ row_annual + rate_network + rate_hsm
```

### 2.2 Operations — annual
```
ops_annual = onprem_fte × fte_cost + dr_test_cost
```

### 2.3 Multi-year build (year y = 1..horizon)
```
licence[y]  = onprem_renewal × (1 + onprem_uplift)^(y−1)
infra[y]    = infra_annual
ops[y]      = ops_annual
upgrades[y] = upgrade_cost × upgrade_count / horizon        (annualised)
onprem_total[y] = licence[y] + infra[y] + ops[y] + upgrades[y]
onprem_tco      = Σ_y onprem_total[y]
```

## 3. SaaS TCO

### 3.1 Residual connector infrastructure — annual
```
conn_compute = conn_qty × conn_vcpu × rate_vcpu + conn_qty × conn_ram × rate_ram
conn_storage_cost = conn_qty × conn_storage × rate_storage
conn_os      = conn_qty × rate_windows           (workbook models connectors as Windows)
conn_backup_fac = conn_qty × (rate_backup + rate_facilities)
conn_annual  = conn_compute + conn_storage_cost + conn_os + conn_backup_fac
```

### 3.2 Multi-year build
```
subscription[y] = saas_subscription × (1 + saas_uplift)^(y−1)
conn[y]         = conn_annual
saas_ops[y]     = saas_fte × fte_cost
migration[y]    = (mig_ps + mig_internal + mig_training)  if y == 1 else 0
saas_total[y]   = subscription[y] + conn[y] + saas_ops[y] + migration[y]
saas_tco        = Σ_y saas_total[y]
```

## 4. ROI Summary (TCO-only, matches workbook)

```
net_savings   = onprem_tco − saas_tco
roi_pct       = net_savings / saas_tco
run_rate      = onprem_total[2] − saas_total[2]           (Year-2 delta, steady state)
payback_months= 0 if run_rate ≤ 0
                else saas_total[1] / run_rate × 12
                (workbook: SaaS Year-1 total incl. migration ÷ steady-state annual saving × 12)
annual_saving[y]     = onprem_total[y] − saas_total[y]
cumulative_saving[y] = Σ_{i≤y} annual_saving[i]
npv_savings   = NPV(discount_rate, annual_saving[1..horizon])
              = Σ_y annual_saving[y] / (1 + discount_rate)^y     (Excel NPV convention)
```

Category comparison table (3-yr): Licence/Subscription, Infrastructure,
Operations & labour, Version upgrades (SaaS = 0), One-time migration (On-Prem = 0),
each with `saving = onprem − saas`.

## 5. Benefits-Adjusted View (NEW)

```
benefits_annual[y] = Σ enabled recurring benefits (B1, B2, B4, B5, B6)
benefits_annual[1] += B3 one-time value (if enabled)
total_benefits     = Σ_y benefits_annual[y]

total_value        = net_savings + total_benefits
value_roi_pct      = total_value / saas_tco
value_payback_months = saas_total[1] / (run_rate + steady_state_benefits) × 12   (if > 0)
npv_total_value    = NPV(discount_rate, annual_saving[y] + benefits_annual[y])
```

The dashboard and PDF always show **both** headline blocks: "Hard cost savings (TCO)"
and "Total value including quantified benefits", with the benefit line items listed.

## 6. Golden parity values (workbook example inputs, 3-year horizon)

| Output | Expected |
|---|---|
| On-Prem infra annual | €32,054 |
| On-Prem ops annual | €150,500 |
| On-Prem TCO Y1 / Y2 / Y3 | €382,554 / €391,554 / €401,004 |
| On-Prem 3-yr TCO | €1,175,112 |
| Connector infra annual | €3,628 |
| SaaS TCO Y1 / Y2 / Y3 | €262,628 / €196,128 / €200,763 |
| SaaS 3-yr TCO | €659,519 |
| 3-yr net savings | €515,593 |
| 3-yr ROI | 78.18% (0.781771…) |
| Payback | 4.36 months (4.3597…) |
| Annual run-rate saving | €195,426 |
| Cumulative savings Y1/Y2/Y3 | €119,926 / €315,352 / €515,593 |
| NPV @ 8% | €437,546.65 (437546.650663…) |

Note: yearly subscription/licence lines carry fractional cents from uplift compounding
(e.g. SaaS Y3 = 159,135.135); the engine computes at full float precision and rounds only
at presentation, matching the workbook.
