import { useState } from "react";
import type { CalcInputs, CalcResult } from "../types";
import { fmtEur, fmtPct, fmtMonths } from "../format";
import KpiBand from "../components/KpiBand";
import CategoryComparisonChart from "../charts/CategoryComparisonChart";
import CashflowChart from "../charts/CashflowChart";
import WaterfallChart from "../charts/WaterfallChart";
import ValueChart from "../charts/ValueChart";

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {children}
    </div>
  );
}

export function BenefitsPanel({
  results,
  animate = true,
}: {
  results: CalcResult;
  animate?: boolean;
}) {
  const b = results.benefits;
  const horizon = results.summary.annual_saving.length;
  const enabled = b.items.filter((i) => i.enabled);
  if (enabled.length === 0) return null;
  return (
    <Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <ValueChart
          netSavings={results.summary.net_savings}
          benefitsTotal={b.total}
          horizon={horizon}
          animate={animate}
        />
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">
            Quantified SaaS benefits ({horizon}-year)
          </h3>
          <table className="w-full text-sm" data-testid="benefits-table">
            <tbody>
              {enabled.map((item) => {
                const total =
                  item.annual_value * horizon + item.oneoff_value;
                return (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="py-1.5 pr-2 text-slate-600">
                      {item.label}
                      {item.oneoff_value > 0 && (
                        <span className="ml-1 text-xs text-slate-400">(one-time)</span>
                      )}
                    </td>
                    <td className="py-1.5 text-right font-medium tabular-nums">
                      {fmtEur(total)}
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td className="py-2 pr-2 font-semibold text-slate-800">
                  Total quantified benefits
                </td>
                <td
                  className="py-2 text-right font-semibold tabular-nums"
                  data-testid="benefits-total"
                >
                  {fmtEur(b.total)}
                </td>
              </tr>
            </tbody>
          </table>
          <div className="mt-3 grid grid-cols-3 gap-3 rounded-lg bg-[var(--brand-tint)] p-3 text-center">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-[var(--brand-500)]">
                Total value
              </div>
              <div className="font-bold text-[var(--brand-1000)]" data-testid="total-value">
                {fmtEur(b.total_value)}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-[var(--brand-500)]">
                Value ROI
              </div>
              <div className="font-bold text-[var(--brand-1000)]">{fmtPct(b.value_roi_pct)}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-[var(--brand-500)]">
                Value payback
              </div>
              <div className="font-bold text-[var(--brand-1000)]">
                {fmtMonths(b.value_payback_months)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function DetailTables({ results }: { results: CalcResult }) {
  const [open, setOpen] = useState(false);
  const horizon = results.summary.annual_saving.length;
  const years = Array.from({ length: horizon }, (_, i) => `Year ${i + 1}`);

  const yearTable = (
    title: string,
    lines: { label: string; values: number[]; total: number }[],
  ) => (
    <div className="overflow-x-auto">
      <h4 className="mb-1 mt-4 text-sm font-semibold text-slate-700">{title}</h4>
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="py-1.5 pr-2">Cost line</th>
            {years.map((y) => (
              <th key={y} className="px-2 py-1.5 text-right">
                {y}
              </th>
            ))}
            <th className="px-2 py-1.5 text-right">{horizon}-yr total</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => (
            <tr
              key={line.label}
              className={`border-b border-slate-100 ${i === lines.length - 1 ? "font-semibold" : ""}`}
            >
              <td className="py-1.5 pr-2">{line.label}</td>
              {line.values.map((v, j) => (
                <td key={j} className="px-2 py-1.5 text-right tabular-nums">
                  {fmtEur(v)}
                </td>
              ))}
              <td className="px-2 py-1.5 text-right tabular-nums">{fmtEur(line.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <Card>
      <button
        className="flex w-full items-center justify-between text-left"
        onClick={() => setOpen(!open)}
        data-testid="detail-toggle"
      >
        <span className="text-sm font-semibold text-slate-700">
          Detailed build-up (for the analysts)
        </span>
        <span className="text-slate-400">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div>
          <div className="overflow-x-auto">
            <h4 className="mb-1 mt-4 text-sm font-semibold text-slate-700">
              On-Prem infrastructure — annual build-up per component
            </h4>
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-1.5 pr-2">Component</th>
                  <th className="px-2 py-1.5 text-right">Qty</th>
                  <th className="px-2 py-1.5 text-right">vCPU</th>
                  <th className="px-2 py-1.5 text-right">RAM GB</th>
                  <th className="px-2 py-1.5 text-right">Stor GB</th>
                  <th className="px-2 py-1.5 text-right">Compute €</th>
                  <th className="px-2 py-1.5 text-right">Storage €</th>
                  <th className="px-2 py-1.5 text-right">OS €</th>
                  <th className="px-2 py-1.5 text-right">Backup €</th>
                  <th className="px-2 py-1.5 text-right">Facilities €</th>
                  <th className="px-2 py-1.5 text-right">Annual €</th>
                </tr>
              </thead>
              <tbody>
                {results.onprem.components.map((c) => (
                  <tr key={c.name} className="border-b border-slate-100">
                    <td className="py-1.5 pr-2">{c.name}</td>
                    <td className="px-2 py-1.5 text-right">{c.qty}</td>
                    <td className="px-2 py-1.5 text-right">{c.tot_vcpu}</td>
                    <td className="px-2 py-1.5 text-right">{c.tot_ram}</td>
                    <td className="px-2 py-1.5 text-right">{c.tot_storage}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{fmtEur(c.compute)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{fmtEur(c.storage)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{fmtEur(c.os_cost)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{fmtEur(c.backup)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{fmtEur(c.facilities)}</td>
                    <td className="px-2 py-1.5 text-right font-medium tabular-nums">
                      {fmtEur(c.annual)}
                    </td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="py-1.5 pr-2">
                    Total incl. network ({fmtEur(results.onprem.infra_network)}) &amp; HSM (
                    {fmtEur(results.onprem.infra_hsm)})
                  </td>
                  <td colSpan={9} />
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {fmtEur(results.onprem.infra_annual)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          {yearTable("On-Prem TCO by year", [
            results.onprem.licence,
            results.onprem.infrastructure,
            results.onprem.operations,
            results.onprem.upgrades,
            results.onprem.total,
          ])}
          {yearTable("SaaS TCO by year", [
            results.saas.subscription,
            results.saas.connectors,
            results.saas.operations,
            results.saas.migration,
            results.saas.total,
          ])}
        </div>
      )}
    </Card>
  );
}

export default function Dashboard({
  inputs,
  results,
  animate = true,
  showDetails = true,
}: {
  inputs: CalcInputs;
  results: CalcResult;
  animate?: boolean;
  showDetails?: boolean;
}) {
  const horizon = inputs.params.horizon;
  return (
    <div className="space-y-6" data-testid="dashboard">
      <KpiBand results={results} discountRate={inputs.params.discount_rate} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CategoryComparisonChart
            categories={results.summary.categories}
            horizon={horizon}
            animate={animate}
          />
        </Card>
        <Card>
          <CashflowChart
            onpremYears={results.onprem.total.values}
            saasYears={results.saas.total.values}
            cumulative={results.summary.cumulative_saving}
            paybackMonths={results.summary.payback_months}
            animate={animate}
          />
        </Card>
      </div>
      <Card>
        <WaterfallChart
          categories={results.summary.categories}
          onpremTco={results.onprem.tco}
          saasTco={results.saas.tco}
          horizon={horizon}
          animate={animate}
        />
      </Card>
      <BenefitsPanel results={results} animate={animate} />
      {showDetails && <DetailTables results={results} />}
    </div>
  );
}
