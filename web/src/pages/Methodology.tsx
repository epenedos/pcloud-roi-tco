import { Link } from "react-router-dom";
import { SIZE_LABELS, SIZE_RANGES } from "../types";

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
        {children}
      </div>
    </section>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <code className="block rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
      {children}
    </code>
  );
}

export default function Methodology() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link to="/" className="text-sm text-slate-400 hover:text-slate-600">
          ← Analyses
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">Methodology</h1>
        <p className="text-sm text-slate-500">
          How this tool computes the On-Prem vs SaaS business case. Lineage: the model
          reproduces the reference workbook <em>PAM_TCO_ROI.xlsx</em> exactly (verified by
          an automated golden-parity test) and extends it with password-count sizing and a
          quantified benefits module.
        </p>
      </div>

      <Block title="Infrastructure t-shirt sizing">
        <p>
          The number of passwords under management determines the default on-prem
          component inventory (Vault, Vault DR, CPM, PSM, PSMP, PTA):
        </p>
        <ul className="list-inside list-disc">
          {(Object.keys(SIZE_LABELS) as (keyof typeof SIZE_LABELS)[]).map((size) => (
            <li key={size}>
              <strong>{SIZE_LABELS[size]}</strong> — {SIZE_RANGES[size]}
            </li>
          ))}
        </ul>
        <p>
          The derived inventory is a starting point: every row remains editable, and
          changing the password count never silently overwrites manual edits.
        </p>
      </Block>

      <Block title="On-Prem TCO">
        <p>Annual infrastructure cost is built per component:</p>
        <Formula>
          compute = vCPU × rate/vCPU + RAM × rate/GB · storage = GB × rate/GB ·
          OS/backup/facilities = qty × per-VM rates
        </Formula>
        <p>
          plus environment-level network/load-balancer and HSM allocations. Operations =
          on-prem admin FTE × loaded FTE cost + annual DR test. Licence renewal compounds
          by the uplift each year; major upgrades are annualised across the horizon:
        </p>
        <Formula>upgrades/year = upgrade cost × upgrade count ÷ horizon</Formula>
      </Block>

      <Block title="SaaS TCO">
        <p>
          SaaS subscription compounds by its uplift; the residual footprint is only the
          connector VMs (compute, storage, OS, backup, facilities). Operations shrink to
          policy administration. The one-time migration project (professional services +
          internal effort + training) lands in Year 1.
        </p>
      </Block>

      <Block title="ROI, payback & NPV">
        <Formula>net savings = on-prem TCO − SaaS TCO · ROI = net savings ÷ SaaS TCO</Formula>
        <Formula>
          payback (months) = one-time migration investment ÷ steady-state annual saving × 12
        </Formula>
        <Formula>NPV = Σ annual savingₜ ÷ (1 + discount rate)ᵗ</Formula>
        <p>
          Steady-state saving is the Year-2 delta (post-migration run-rate). If the
          run-rate is not positive, no payback is reported.
        </p>
      </Block>

      <Block title="Quantified SaaS benefits">
        <p>
          Benefits capture value beyond the cost delta and are always reported separately
          from hard savings, so each line can be accepted or struck independently:
        </p>
        <ul className="list-inside list-disc">
          <li>Breach-risk reduction = breach cost × annual probability × risk reduction %</li>
          <li>Upgrade-downtime avoidance = annualised upgrades × downtime hours × cost/hour</li>
          <li>Faster time-to-value (one-time) = months earlier × monthly recurring-cost gap</li>
          <li>Audit & compliance efficiency = hours saved × loaded hourly rate</li>
          <li>Hardware refresh avoidance = refresh capex ÷ refresh cycle</li>
          <li>Cyber-insurance premium reduction = premium × reduction %</li>
        </ul>
        <p>
          Benefits never restate TCO lines: FTE savings and upgrade project costs live in
          the TCO only; the downtime benefit counts business impact, not project cost.
        </p>
      </Block>

      <Block title="Disclaimer">
        <p>
          Default unit rates and benefit assumptions are illustrative industry benchmarks,
          not a CyberArk quote. Replace them with the customer's real figures before
          presenting. Licence and subscription prices are entered by the user and are not
          sourced from CyberArk price lists.
        </p>
      </Block>
    </div>
  );
}
