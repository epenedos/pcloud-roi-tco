import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import { fmtEur, fmtMonths, fmtNum, fmtPct } from "../format";
import { SIZE_LABELS, SIZE_RANGES, type AnalysisFull } from "../types";
import KpiBand from "../components/KpiBand";
import CategoryComparisonChart from "../charts/CategoryComparisonChart";
import CashflowChart from "../charts/CashflowChart";
import WaterfallChart from "../charts/WaterfallChart";
import { BenefitsPanel } from "./Dashboard";

/** A4 print-optimized report. Rendered headlessly by the API's PDF service. */
export default function PrintReport() {
  const { id } = useParams<{ id: string }>();
  const [analysis, setAnalysis] = useState<AnalysisFull | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    api
      .getAnalysis(id)
      .then(setAnalysis)
      .catch((e) => setError((e as Error).message));
  }, [id]);

  if (error) return <div className="p-10 text-[var(--bad)]">{error}</div>;
  if (!analysis) return <div className="p-10 text-slate-400">Loading…</div>;

  const { inputs, results } = analysis;
  const horizon = inputs.params.horizon;
  const s = results.summary;
  const generated = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="print-report mx-auto max-w-[780px] bg-white px-8 text-slate-900" data-testid="print-report">
      <style>{`
        @page { size: A4; margin: 14mm; }
        @media print {
          .page-break { break-before: page; }
          .avoid-break { break-inside: avoid; }
        }
      `}</style>

      {/* Cover — IDIRA one-pager style: navy band with lockup, bold title,
          signature rule with brand segment */}
      <div className="flex min-h-[900px] flex-col justify-between pb-10">
        <div>
          <div className="-mx-8 flex items-center gap-3 bg-[var(--brand-1000)] px-8 py-6 text-white">
            <span className="text-xl font-extrabold tracking-[0.22em]">IDIRA</span>
            <span className="h-6 w-px bg-white/30" />
            <span className="text-sm font-medium tracking-wide text-[var(--brand-0)]">
              Modern PAM Migration Value
            </span>
          </div>
          <h1 className="mt-14 text-4xl font-extrabold leading-tight">
            Modern PAM Migration
            <br />
            Value Report
          </h1>
          <p className="mt-4 text-xl text-slate-600">{analysis.name}</p>
          {analysis.customer_name && (
            <p className="mt-1 text-lg text-slate-500">
              Prepared for {analysis.customer_name}
            </p>
          )}
          <div className="idira-rule mt-8" />
        </div>
        <div>
          <div className="grid grid-cols-3 gap-4 rounded-xl bg-slate-50 p-6">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">
                {horizon}-year net savings
              </div>
              <div className="mt-1 text-2xl font-bold text-[var(--good)]">
                {fmtEur(s.net_savings)}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">ROI</div>
              <div className="mt-1 text-2xl font-bold">{fmtPct(s.roi_pct)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">Payback</div>
              <div className="mt-1 text-2xl font-bold">{fmtMonths(s.payback_months)}</div>
            </div>
          </div>
          <div className="mt-6 border-t border-slate-200 pt-3 text-xs text-slate-400">
            <span className="font-semibold text-slate-500">
              Idira by Palo Alto Networks
            </span>{" "}
            | {analysis.name} | Value Report · Generated {generated} · Analysis version{" "}
            {analysis.version_seq} · Engine v{analysis.engine_version} · All figures EUR
          </div>
        </div>
      </div>

      {/* Executive summary */}
      <div className="page-break">
        <h2 className="mb-2 mt-8 text-2xl font-extrabold">Executive summary</h2>
        <div className="idira-rule mb-4" />
        <p className="mb-6 text-sm leading-relaxed text-slate-600">
          Migrating CyberArk PAM from the self-hosted estate to CyberArk SaaS (Privilege
          Cloud) saves <strong>{fmtEur(s.net_savings)}</strong> over {horizon} years — a{" "}
          <strong>{fmtPct(s.roi_pct)}</strong> return on the SaaS investment. The one-time
          migration investment of {fmtEur(results.saas.migration.total)} is recouped in{" "}
          <strong>{fmtMonths(s.payback_months)}</strong>, after which the run-rate saving is{" "}
          {fmtEur(s.run_rate)} per year. Including quantified operational and risk benefits,
          the total {horizon}-year value reaches{" "}
          <strong>{fmtEur(results.benefits.total_value)}</strong>. The environment is sized{" "}
          <strong>{SIZE_LABELS[results.tshirt_size]}</strong> (
          {SIZE_RANGES[results.tshirt_size]}) for {fmtNum(inputs.num_passwords)} passwords
          under management.
        </p>
        <div className="avoid-break">
          <KpiBand results={results} discountRate={inputs.params.discount_rate} />
        </div>
        <div className="avoid-break mt-6 rounded-xl border border-slate-200 p-4">
          <CategoryComparisonChart
            categories={s.categories}
            horizon={horizon}
            animate={false}
          />
        </div>
        <div className="avoid-break mt-6 rounded-xl border border-slate-200 p-4">
          <CashflowChart
            onpremYears={results.onprem.total.values}
            saasYears={results.saas.total.values}
            cumulative={s.cumulative_saving}
            paybackMonths={s.payback_months}
            animate={false}
          />
        </div>
      </div>

      {/* Savings breakdown + benefits */}
      <div className="page-break">
        <h2 className="mb-2 mt-8 text-2xl font-extrabold">Where the value comes from</h2>
        <div className="idira-rule mb-4" />
        <div className="avoid-break rounded-xl border border-slate-200 p-4">
          <WaterfallChart
            categories={s.categories}
            onpremTco={results.onprem.tco}
            saasTco={results.saas.tco}
            horizon={horizon}
            animate={false}
          />
        </div>
        <div className="avoid-break mt-6">
          <BenefitsPanel results={results} animate={false} />
        </div>
      </div>

      {/* Assumptions appendix */}
      <div className="page-break">
        <h2 className="mb-2 mt-8 text-2xl font-extrabold">Appendix — assumptions</h2>
        <div className="idira-rule mb-4" />
        <div className="grid grid-cols-2 gap-6 text-sm">
          <AssumptionTable
            title="Licensing & subscription"
            rows={[
              ["On-prem renewal / year", fmtEur(inputs.licensing.onprem_renewal)],
              ["On-prem uplift", fmtPct(inputs.licensing.onprem_uplift)],
              ["SaaS subscription / year", fmtEur(inputs.licensing.saas_subscription)],
              ["SaaS uplift", fmtPct(inputs.licensing.saas_uplift)],
            ]}
          />
          <AssumptionTable
            title="Operations & labour"
            rows={[
              ["FTE cost / year", fmtEur(inputs.ops.fte_cost)],
              ["On-prem admin", `${inputs.ops.onprem_fte} FTE`],
              ["SaaS admin", `${inputs.ops.saas_fte} FTE`],
              ["Upgrade cost × count", `${fmtEur(inputs.ops.upgrade_cost)} × ${inputs.ops.upgrade_count}`],
              ["DR test / year", fmtEur(inputs.ops.dr_test_cost)],
            ]}
          />
          <AssumptionTable
            title="Migration (one-time)"
            rows={[
              ["Professional services", fmtEur(inputs.migration.mig_ps)],
              ["Internal effort", fmtEur(inputs.migration.mig_internal)],
              ["Training", fmtEur(inputs.migration.mig_training)],
            ]}
          />
          <AssumptionTable
            title="Parameters"
            rows={[
              ["Horizon", `${horizon} years`],
              ["Discount rate", fmtPct(inputs.params.discount_rate)],
              ["Passwords under management", fmtNum(inputs.num_passwords)],
              ["T-shirt size", SIZE_LABELS[results.tshirt_size]],
            ]}
          />
        </div>
        <h3 className="mb-2 mt-8 text-lg font-semibold">On-prem inventory</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="py-1.5">Component</th>
              <th className="py-1.5 text-right">Qty</th>
              <th className="py-1.5 text-right">vCPU</th>
              <th className="py-1.5 text-right">RAM GB</th>
              <th className="py-1.5 text-right">Storage GB</th>
              <th className="py-1.5 pl-6">OS</th>
            </tr>
          </thead>
          <tbody>
            {inputs.inventory.map((r) => (
              <tr key={r.name} className="border-b border-slate-100">
                <td className="py-1.5">{r.name}</td>
                <td className="py-1.5 text-right">{r.qty}</td>
                <td className="py-1.5 text-right">{r.vcpu_each}</td>
                <td className="py-1.5 text-right">{r.ram_gb_each}</td>
                <td className="py-1.5 text-right">{r.storage_gb_each}</td>
                <td className="py-1.5 pl-6">{r.os}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 className="mb-2 mt-8 text-lg font-semibold">Methodology & disclaimer</h3>
        <p className="text-xs leading-relaxed text-slate-500">
          This report compares the fully-loaded {horizon}-year cost of the self-hosted
          CyberArk PAM estate against CyberArk SaaS (Privilege Cloud). Hard cost savings
          are the difference between the two TCO builds (licence/subscription,
          infrastructure, operations, upgrades, migration). Quantified SaaS benefits are
          reported separately and never blended into hard savings:{" "}
          {results.benefits.items.map((i) => `${i.label} = ${i.formula}`).join("; ")}.
          Default unit rates and benefit assumptions are illustrative industry benchmarks,
          not a CyberArk quote; figures shown reflect the inputs recorded in analysis
          version {analysis.version_seq}. NPV uses a {fmtPct(inputs.params.discount_rate)}{" "}
          discount rate.
        </p>
      </div>
    </div>
  );
}

function AssumptionTable({
  title,
  rows,
}: {
  title: string;
  rows: [string, string][];
}) {
  return (
    <div className="avoid-break">
      <h3 className="mb-2 font-semibold">{title}</h3>
      <table className="w-full">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-b border-slate-100">
              <td className="py-1 pr-2 text-slate-500">{k}</td>
              <td className="py-1 text-right font-medium tabular-nums">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
