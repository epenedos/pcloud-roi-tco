import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { fmtEur, fmtMonths, fmtPct } from "../format";
import {
  SIZE_LABELS,
  SIZE_RANGES,
  sizeFor,
  type AnalysisFull,
  type CalcInputs,
  type CalcResult,
  type TShirtSize,
} from "../types";
import { FieldGrid, NumberField, Section, Toggle } from "../components/fields";
import InventoryEditor from "../components/InventoryEditor";
import Dashboard from "./Dashboard";

const SECTIONS = [
  ["scope", "Scope & sizing"],
  ["licensing", "Licensing"],
  ["inventory", "On-prem inventory"],
  ["rates", "Unit rates"],
  ["ops", "Operations"],
  ["migration", "Migration"],
  ["connectors", "SaaS connectors"],
  ["params", "Parameters"],
  ["benefits", "SaaS benefits"],
] as const;

const BENEFIT_EXPLAIN: Record<string, { title: string; body: string }> = {
  b1: {
    title: "Breach-risk reduction",
    body: "SaaS keeps the platform permanently patched and hardened by CyberArk. Expected annual loss avoided = breach cost × annual breach probability × risk reduction share.",
  },
  b2: {
    title: "Upgrade-downtime avoidance",
    body: "On-prem major upgrades interrupt privileged access workflows. SaaS upgrades are rolling and invisible. Value = annualised upgrades × downtime hours × business cost per hour (the upgrade project cost itself is already in the TCO).",
  },
  b3: {
    title: "Faster time-to-value",
    body: "Privilege Cloud deploys in weeks, not months. One-time Year-1 value = months earlier × the monthly recurring-cost gap between on-prem and SaaS.",
  },
  b4: {
    title: "Audit & compliance efficiency",
    body: "Built-in reporting, session audit and compliance packs reduce evidence-collection effort. Value = audit hours saved per year × loaded hourly rate.",
  },
  b5: {
    title: "Hardware refresh avoidance",
    body: "The on-prem estate needs a hardware/hypervisor refresh each cycle. SaaS removes it. Value = refresh capex ÷ refresh cycle in years.",
  },
  b6: {
    title: "Cyber-insurance premium reduction",
    body: "Insurers increasingly price PAM maturity into premiums. Value = annual premium × expected reduction share.",
  },
};

export default function AnalysisWorkspace() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "dashboard" ? "dashboard" : "inputs";

  const [analysis, setAnalysis] = useState<AnalysisFull | null>(null);
  const [inputs, setInputs] = useState<CalcInputs | null>(null);
  const [results, setResults] = useState<CalcResult | null>(null);
  const [appliedSize, setAppliedSize] = useState<TShirtSize | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const inputsRef = useRef<CalcInputs | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .getAnalysis(id)
      .then((a) => {
        setAnalysis(a);
        setInputs(a.inputs);
        inputsRef.current = a.inputs;
        setResults(a.results);
        setAppliedSize(a.results.tshirt_size);
      })
      .catch((e) => setError((e as Error).message));
  }, [id]);

  const persist = useCallback(
    (next: CalcInputs) => {
      if (!id) return;
      setSaving(true);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        try {
          const updated = await api.updateInputs(id, next);
          // Ignore stale responses: only accept results for the latest edit.
          if (inputsRef.current === next) {
            setResults(updated.results);
            setAnalysis(updated);
            setError("");
          }
        } catch (e) {
          setError((e as Error).message);
        } finally {
          if (inputsRef.current === next) setSaving(false);
        }
      }, 600);
    },
    [id],
  );

  const update = useCallback(
    (mutate: (draft: CalcInputs) => void) => {
      setInputs((prev) => {
        if (!prev) return prev;
        const next = structuredClone(prev);
        mutate(next);
        inputsRef.current = next;
        persist(next);
        return next;
      });
    },
    [persist],
  );

  if (error && !inputs)
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
        {error} — <Link className="underline" to="/">back to library</Link>
      </div>
    );
  if (!inputs || !results || !analysis)
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-400">
        Loading…
      </div>
    );

  const derivedSize = sizeFor(inputs.num_passwords);
  const sizeMismatch = appliedSize !== null && derivedSize !== appliedSize;

  const applySizeDefaults = async (size: TShirtSize) => {
    const { inventory } = await api.inventoryForSize(size);
    setAppliedSize(size);
    update((d) => {
      d.inventory = inventory;
    });
  };

  const downloadPdf = async () => {
    if (!id) return;
    setPdfBusy(true);
    try {
      const resp = await fetch(`/api/analyses/${id}/report`, { method: "POST" });
      if (!resp.ok) throw new Error("PDF generation failed");
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PAM-ROI-${analysis.name.replace(/[^\w-]+/g, "_")}-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPdfBusy(false);
    }
  };

  const b = inputs.benefits;

  return (
    <div>
      {/* header row */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="grow">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm text-slate-400 hover:text-slate-600">
              ← Analyses
            </Link>
            <h1 className="text-xl font-semibold text-slate-900">{analysis.name}</h1>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700" data-testid="size-badge">
              {SIZE_LABELS[derivedSize]}
            </span>
          </div>
          {analysis.customer_name && (
            <p className="text-sm text-slate-500">{analysis.customer_name}</p>
          )}
        </div>
        <span className="text-xs text-slate-400" data-testid="save-state">
          {saving ? "Saving…" : `Saved · v${analysis.version_seq}`}
        </span>
        <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm">
          {(["inputs", "dashboard"] as const).map((t) => (
            <button
              key={t}
              data-testid={`tab-${t}`}
              onClick={() => setSearchParams(t === "inputs" ? {} : { tab: t })}
              className={`rounded-md px-4 py-1.5 font-medium capitalize ${
                tab === t ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          onClick={downloadPdf}
          disabled={pdfBusy}
          data-testid="export-pdf"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {pdfBusy ? "Generating…" : "Export PDF"}
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}

      {tab === "dashboard" ? (
        <Dashboard inputs={inputs} results={results} />
      ) : (
        <div className="flex gap-6">
          {/* section nav */}
          <nav className="sticky top-24 hidden h-fit w-44 shrink-0 lg:block">
            {SECTIONS.map(([sid, label]) => (
              <a
                key={sid}
                href={`#${sid}`}
                className="block rounded-md px-3 py-1.5 text-sm text-slate-500 hover:bg-white hover:text-slate-800"
              >
                {label}
              </a>
            ))}
          </nav>

          {/* form */}
          <div className="min-w-0 grow space-y-6">
            <Section
              id="scope"
              title="Scope & sizing"
              subtitle="The number of passwords under management drives the infrastructure t-shirt size."
            >
              <div className="flex flex-wrap items-end gap-6">
                <div className="w-64">
                  <NumberField
                    label="Number of passwords"
                    value={inputs.num_passwords}
                    min={1}
                    testid="num-passwords"
                    onChange={(v) =>
                      update((d) => {
                        d.num_passwords = Math.max(1, Math.round(v));
                      })
                    }
                  />
                </div>
                <div className="grow">
                  <div className="flex gap-1.5" data-testid="size-scale">
                    {(Object.keys(SIZE_LABELS) as TShirtSize[]).map((size) => (
                      <div
                        key={size}
                        className={`grow rounded-lg border px-3 py-2 text-center text-xs ${
                          size === derivedSize
                            ? "border-blue-500 bg-blue-50 font-semibold text-blue-800"
                            : "border-slate-200 bg-white text-slate-400"
                        }`}
                      >
                        <div>{SIZE_LABELS[size]}</div>
                        <div className="mt-0.5 text-[10px]">{SIZE_RANGES[size]}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {sizeMismatch && (
                <div
                  className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800"
                  data-testid="size-mismatch"
                >
                  <span>
                    The password count now maps to <strong>{SIZE_LABELS[derivedSize]}</strong>, but
                    the inventory below is sized for <strong>{appliedSize && SIZE_LABELS[appliedSize]}</strong>.
                    Apply the {SIZE_LABELS[derivedSize]} default inventory? Your manual edits will be replaced.
                  </span>
                  <button
                    onClick={() => applySizeDefaults(derivedSize)}
                    data-testid="apply-size"
                    className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
                  >
                    Apply {SIZE_LABELS[derivedSize]} defaults
                  </button>
                  <button
                    onClick={() => setAppliedSize(derivedSize)}
                    className="rounded-md px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
                  >
                    Keep current inventory
                  </button>
                </div>
              )}
            </Section>

            <Section
              id="licensing"
              title="A · Licensing / subscription"
              subtitle="Enter your real renewal quote and SaaS quote — these two numbers matter most."
            >
              <FieldGrid>
                <NumberField
                  label="On-prem annual licence renewal"
                  unit="€/yr"
                  hint="Your actual maintenance renewal quote"
                  value={inputs.licensing.onprem_renewal}
                  testid="onprem-renewal"
                  onChange={(v) => update((d) => void (d.licensing.onprem_renewal = v))}
                />
                <NumberField
                  label="On-prem renewal annual uplift"
                  percent
                  value={inputs.licensing.onprem_uplift}
                  onChange={(v) => update((d) => void (d.licensing.onprem_uplift = v))}
                />
                <NumberField
                  label="SaaS annual subscription (Privilege Cloud)"
                  unit="€/yr"
                  hint="Your SaaS quote (annual)"
                  value={inputs.licensing.saas_subscription}
                  testid="saas-subscription"
                  onChange={(v) => update((d) => void (d.licensing.saas_subscription = v))}
                />
                <NumberField
                  label="SaaS subscription annual uplift"
                  percent
                  value={inputs.licensing.saas_uplift}
                  onChange={(v) => update((d) => void (d.licensing.saas_uplift = v))}
                />
              </FieldGrid>
            </Section>

            <Section
              id="inventory"
              title="B · On-prem component inventory"
              subtitle={`Pre-sized for ${SIZE_LABELS[derivedSize]} (${SIZE_RANGES[derivedSize]}); every row is editable.`}
            >
              <InventoryEditor
                inventory={inputs.inventory}
                results={results}
                onChange={(rows) => update((d) => void (d.inventory = rows))}
                onResetToDefaults={() => applySizeDefaults(derivedSize)}
              />
            </Section>

            <Section
              id="rates"
              title="C · Infrastructure unit rates"
              subtitle="Annual EUR rates — illustrative industry defaults, replace with the customer's real figures."
            >
              <FieldGrid>
                <NumberField label="Compute per vCPU / year" unit="€" hint="Virtualised, incl. hypervisor" value={inputs.rates.rate_vcpu} onChange={(v) => update((d) => void (d.rates.rate_vcpu = v))} />
                <NumberField label="Compute per GB RAM / year" unit="€" value={inputs.rates.rate_ram} onChange={(v) => update((d) => void (d.rates.rate_ram = v))} />
                <NumberField label="Storage per GB / year" unit="€" step={0.1} hint="Enterprise SAN + snapshots" value={inputs.rates.rate_storage} onChange={(v) => update((d) => void (d.rates.rate_storage = v))} />
                <NumberField label="Windows Server licence / VM / year" unit="€" hint="Amortised incl. SA" value={inputs.rates.rate_windows} onChange={(v) => update((d) => void (d.rates.rate_windows = v))} />
                <NumberField label="Linux (RHEL) subscription / VM / year" unit="€" value={inputs.rates.rate_linux} onChange={(v) => update((d) => void (d.rates.rate_linux = v))} />
                <NumberField label="Backup / VM / year" unit="€" value={inputs.rates.rate_backup} onChange={(v) => update((d) => void (d.rates.rate_backup = v))} />
                <NumberField label="Facilities / VM / year" unit="€" hint="Power, cooling, DC space" value={inputs.rates.rate_facilities} onChange={(v) => update((d) => void (d.rates.rate_facilities = v))} />
                <NumberField label="Network / LB / firewall / year" unit="€" hint="Environment-level, once" value={inputs.rates.rate_network} onChange={(v) => update((d) => void (d.rates.rate_network = v))} />
                <NumberField label="HSM / key management / year" unit="€" hint="0 if none" value={inputs.rates.rate_hsm} onChange={(v) => update((d) => void (d.rates.rate_hsm = v))} />
              </FieldGrid>
            </Section>

            <Section id="ops" title="D · Operations & labour">
              <FieldGrid>
                <NumberField label="Fully-loaded FTE cost / year" unit="€" hint="Salary + overhead" value={inputs.ops.fte_cost} onChange={(v) => update((d) => void (d.ops.fte_cost = v))} />
                <NumberField label="On-prem PAM admin" unit="FTE" step={0.1} hint="Patching, upgrades, HA/DR, backup" value={inputs.ops.onprem_fte} onChange={(v) => update((d) => void (d.ops.onprem_fte = v))} />
                <NumberField label="SaaS PAM admin" unit="FTE" step={0.1} hint="Policy administration only" value={inputs.ops.saas_fte} onChange={(v) => update((d) => void (d.ops.saas_fte = v))} />
                <NumberField label="Major version upgrade — cost each" unit="€" hint="Services + internal effort" value={inputs.ops.upgrade_cost} onChange={(v) => update((d) => void (d.ops.upgrade_cost = v))} />
                <NumberField label="Major upgrades in horizon" unit="count" hint="On-prem only" value={inputs.ops.upgrade_count} onChange={(v) => update((d) => void (d.ops.upgrade_count = Math.round(v)))} />
                <NumberField label="DR test / audit / year" unit="€" value={inputs.ops.dr_test_cost} onChange={(v) => update((d) => void (d.ops.dr_test_cost = v))} />
              </FieldGrid>
            </Section>

            <Section id="migration" title="E · One-time migration cost (Year 1)">
              <FieldGrid>
                <NumberField label="Professional services" unit="€" hint="CyberArk / partner" value={inputs.migration.mig_ps} onChange={(v) => update((d) => void (d.migration.mig_ps = v))} />
                <NumberField label="Internal migration effort" unit="€" value={inputs.migration.mig_internal} onChange={(v) => update((d) => void (d.migration.mig_internal = v))} />
                <NumberField label="Training & enablement" unit="€" value={inputs.migration.mig_training} onChange={(v) => update((d) => void (d.migration.mig_training = v))} />
              </FieldGrid>
            </Section>

            <Section
              id="connectors"
              title="F · SaaS residual on-prem connectors"
              subtitle="Minimal footprint that remains on-prem after migration."
            >
              <FieldGrid>
                <NumberField label="Connector VMs" unit="qty" value={inputs.connectors.conn_qty} onChange={(v) => update((d) => void (d.connectors.conn_qty = Math.round(v)))} />
                <NumberField label="vCPU each" value={inputs.connectors.conn_vcpu} onChange={(v) => update((d) => void (d.connectors.conn_vcpu = v))} />
                <NumberField label="RAM GB each" value={inputs.connectors.conn_ram} onChange={(v) => update((d) => void (d.connectors.conn_ram = v))} />
                <NumberField label="Storage GB each" value={inputs.connectors.conn_storage} onChange={(v) => update((d) => void (d.connectors.conn_storage = v))} />
              </FieldGrid>
            </Section>

            <Section id="params" title="G · Analysis parameters">
              <FieldGrid>
                <NumberField label="Analysis horizon" unit="years" min={1} value={inputs.params.horizon} onChange={(v) => update((d) => void (d.params.horizon = Math.min(10, Math.max(1, Math.round(v)))))} />
                <NumberField label="Discount rate (NPV)" percent value={inputs.params.discount_rate} onChange={(v) => update((d) => void (d.params.discount_rate = v))} />
              </FieldGrid>
            </Section>

            <Section
              id="benefits"
              title="H · SaaS benefits beyond cost savings"
              subtitle="Each benefit is optional and fully editable. They are always reported separately from hard cost savings, so the CFO can accept or strike each line."
            >
              <div className="space-y-4">
                {/* B1 */}
                <BenefitCard
                  id="b1"
                  enabled={b.b1.enabled}
                  value={results.benefits.items[0]}
                  onToggle={(v) => update((d) => void (d.benefits.b1.enabled = v))}
                >
                  <NumberField label="Average breach cost" unit="€" value={b.b1.breach_cost} onChange={(v) => update((d) => void (d.benefits.b1.breach_cost = v))} />
                  <NumberField label="Annual breach probability" percent value={b.b1.breach_prob} onChange={(v) => update((d) => void (d.benefits.b1.breach_prob = v))} />
                  <NumberField label="Risk reduction from SaaS PAM" percent value={b.b1.risk_reduction} onChange={(v) => update((d) => void (d.benefits.b1.risk_reduction = v))} />
                </BenefitCard>
                <BenefitCard
                  id="b2"
                  enabled={b.b2.enabled}
                  value={results.benefits.items[1]}
                  onToggle={(v) => update((d) => void (d.benefits.b2.enabled = v))}
                >
                  <NumberField label="Downtime hours per upgrade" value={b.b2.downtime_hours_per_upgrade} onChange={(v) => update((d) => void (d.benefits.b2.downtime_hours_per_upgrade = v))} />
                  <NumberField label="Business cost per downtime hour" unit="€" value={b.b2.downtime_cost_hour} onChange={(v) => update((d) => void (d.benefits.b2.downtime_cost_hour = v))} />
                </BenefitCard>
                <BenefitCard
                  id="b3"
                  enabled={b.b3.enabled}
                  value={results.benefits.items[2]}
                  onToggle={(v) => update((d) => void (d.benefits.b3.enabled = v))}
                >
                  <NumberField label="Months earlier in production" unit="months" value={b.b3.months_earlier} onChange={(v) => update((d) => void (d.benefits.b3.months_earlier = v))} />
                </BenefitCard>
                <BenefitCard
                  id="b4"
                  enabled={b.b4.enabled}
                  value={results.benefits.items[3]}
                  onToggle={(v) => update((d) => void (d.benefits.b4.enabled = v))}
                >
                  <NumberField label="Audit hours saved / year" value={b.b4.audit_hours_saved} onChange={(v) => update((d) => void (d.benefits.b4.audit_hours_saved = v))} />
                  <NumberField label="Loaded hourly rate" unit="€/h" value={b.b4.audit_hourly_rate} onChange={(v) => update((d) => void (d.benefits.b4.audit_hourly_rate = v))} />
                </BenefitCard>
                <BenefitCard
                  id="b5"
                  enabled={b.b5.enabled}
                  value={results.benefits.items[4]}
                  onToggle={(v) => update((d) => void (d.benefits.b5.enabled = v))}
                >
                  <NumberField label="Hardware refresh capex" unit="€" value={b.b5.refresh_capex} onChange={(v) => update((d) => void (d.benefits.b5.refresh_capex = v))} />
                  <NumberField label="Refresh cycle" unit="years" min={1} value={b.b5.refresh_cycle_years} onChange={(v) => update((d) => void (d.benefits.b5.refresh_cycle_years = v))} />
                </BenefitCard>
                <BenefitCard
                  id="b6"
                  enabled={b.b6.enabled}
                  value={results.benefits.items[5]}
                  onToggle={(v) => update((d) => void (d.benefits.b6.enabled = v))}
                >
                  <NumberField label="Annual cyber-insurance premium" unit="€" value={b.b6.insurance_premium} onChange={(v) => update((d) => void (d.benefits.b6.insurance_premium = v))} />
                  <NumberField label="Expected premium reduction" percent value={b.b6.premium_reduction} onChange={(v) => update((d) => void (d.benefits.b6.premium_reduction = v))} />
                </BenefitCard>
              </div>
            </Section>

            <p className="pb-8 text-xs text-slate-400">
              Default unit rates and benefit assumptions are illustrative industry
              benchmarks, not a CyberArk quote. Replace them with the customer's real
              figures before presenting.
            </p>
          </div>

          {/* live summary sidebar */}
          <aside className="sticky top-24 hidden h-fit w-64 shrink-0 xl:block">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" data-testid="live-summary">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Live summary
              </h3>
              <dl className="mt-3 space-y-3 text-sm">
                <div>
                  <dt className="text-slate-500">{inputs.params.horizon}-yr net savings</dt>
                  <dd
                    className={`text-lg font-bold ${results.summary.net_savings >= 0 ? "text-emerald-700" : "text-red-700"}`}
                    data-testid="live-net-savings"
                  >
                    {fmtEur(results.summary.net_savings)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">ROI</dt>
                  <dd className="font-semibold">{fmtPct(results.summary.roi_pct)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Payback</dt>
                  <dd className="font-semibold">{fmtMonths(results.summary.payback_months)}</dd>
                </div>
                <div className="border-t border-slate-100 pt-3">
                  <dt className="text-slate-500">Total value incl. benefits</dt>
                  <dd className="font-semibold text-indigo-700">
                    {fmtEur(results.benefits.total_value)}
                  </dd>
                </div>
              </dl>
              <button
                onClick={() => setSearchParams({ tab: "dashboard" })}
                className="mt-4 w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                View dashboard →
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function BenefitCard({
  id,
  enabled,
  value,
  onToggle,
  children,
}: {
  id: string;
  enabled: boolean;
  value: { annual_value: number; oneoff_value: number } | undefined;
  onToggle: (v: boolean) => void;
  children: React.ReactNode;
}) {
  const info = BENEFIT_EXPLAIN[id];
  const amount = value ? (value.annual_value > 0 ? value.annual_value : value.oneoff_value) : 0;
  const recurring = (value?.annual_value ?? 0) > 0;
  return (
    <div
      className={`rounded-lg border p-4 ${enabled ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 opacity-70"}`}
      data-testid={`benefit-${id}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Toggle checked={enabled} onChange={onToggle} testid={`benefit-${id}-toggle`} />
            <h3 className="font-medium text-slate-800">{info.title}</h3>
          </div>
          <p className="mt-1.5 max-w-2xl text-xs text-slate-500">{info.body}</p>
        </div>
        <div className="whitespace-nowrap text-right">
          <div className="text-[11px] uppercase tracking-wide text-slate-400">
            {recurring ? "per year" : "one-time (Y1)"}
          </div>
          <div className="font-semibold text-indigo-700" data-testid={`benefit-${id}-value`}>
            {fmtEur(amount)}
          </div>
        </div>
      </div>
      {enabled && (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">{children}</div>
      )}
    </div>
  );
}
