import type { CalcResult } from "../types";
import { fmtEur, fmtMonths, fmtPct } from "../format";

function Kpi({
  label,
  value,
  sub,
  tone = "default",
  testid,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "good" | "bad";
  testid?: string;
}) {
  const toneCls =
    tone === "good"
      ? "text-emerald-700"
      : tone === "bad"
        ? "text-red-700"
        : "text-slate-900";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-bold ${toneCls}`} data-testid={testid}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

export default function KpiBand({
  results,
  discountRate,
}: {
  results: CalcResult;
  discountRate: number;
}) {
  const s = results.summary;
  const horizon = s.annual_saving.length;
  const positive = s.net_savings >= 0;
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5" data-testid="kpi-band">
      <Kpi
        label={`${horizon}-Year Net Savings`}
        value={fmtEur(s.net_savings)}
        tone={positive ? "good" : "bad"}
        testid="kpi-net-savings"
      />
      <Kpi
        label={`${horizon}-Year ROI`}
        value={fmtPct(s.roi_pct)}
        tone={positive ? "good" : "bad"}
        testid="kpi-roi"
      />
      <Kpi
        label="Payback Period"
        value={fmtMonths(s.payback_months)}
        sub="to recoup migration"
        testid="kpi-payback"
      />
      <Kpi
        label="Annual Run-Rate Saving"
        value={fmtEur(s.run_rate)}
        tone={s.run_rate >= 0 ? "good" : "bad"}
      />
      <Kpi
        label={`NPV of savings (@${fmtPct(discountRate)})`}
        value={fmtEur(s.npv_savings)}
      />
    </div>
  );
}
