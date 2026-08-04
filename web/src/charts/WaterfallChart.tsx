import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CategoryRow } from "../types";
import { fmtEur, fmtEurCompact } from "../format";
import { COLORS, chartMargin } from "./palette";

const SHORT: Record<string, string> = {
  "Licence / Subscription": "Licence",
  Infrastructure: "Infra",
  "Operations & labour": "Operations",
  "Version upgrades": "Upgrades",
  "One-time migration": "Migration",
};

/** On-Prem TCO → per-category savings steps → SaaS TCO. */
export default function WaterfallChart({
  categories,
  onpremTco,
  saasTco,
  horizon,
  animate = true,
}: {
  categories: CategoryRow[];
  onpremTco: number;
  saasTco: number;
  horizon: number;
  animate?: boolean;
}) {
  type Step = { name: string; base: number; value: number; kind: "total" | "down" | "up" };
  const steps: Step[] = [
    { name: `On-Prem ${horizon}yr`, base: 0, value: onpremTco, kind: "total" },
  ];
  let level = onpremTco;
  for (const c of categories) {
    if (c.saving === 0) continue;
    const next = level - c.saving;
    steps.push({
      name: SHORT[c.category] ?? c.category,
      base: Math.min(level, next),
      value: Math.abs(c.saving),
      kind: c.saving >= 0 ? "down" : "up",
    });
    level = next;
  }
  steps.push({ name: `SaaS ${horizon}yr`, base: 0, value: saasTco, kind: "total" });

  const fill = (kind: Step["kind"], name: string) =>
    kind === "total"
      ? name.startsWith("On-Prem")
        ? COLORS.onprem
        : COLORS.saas
      : kind === "down"
        ? COLORS.saving
        : COLORS.negative;

  return (
    <div data-testid="chart-waterfall">
      <h3 className="mb-1 text-sm font-semibold text-slate-700">
        Where the savings come from ({horizon}-year)
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={steps} margin={{ ...chartMargin, top: 28 }}>
          <CartesianGrid stroke={COLORS.gridline} vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: COLORS.inkSecondary, fontSize: 11 }}
            axisLine={{ stroke: COLORS.gridline }}
            tickLine={false}
            interval={0}
          />
          <YAxis
            tickFormatter={fmtEurCompact}
            tick={{ fill: COLORS.inkSecondary, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={64}
          />
          <Tooltip
            formatter={(v, key) => (key === "base" ? null : fmtEur(Number(v)))}
            labelFormatter={(l) => String(l)}
          />
          <Bar dataKey="base" stackId="w" fill="transparent" isAnimationActive={false} />
          <Bar dataKey="value" stackId="w" isAnimationActive={animate}>
            {steps.map((s) => (
              <Cell key={s.name} fill={fill(s.kind, s.name)} />
            ))}
            <LabelList
              dataKey="value"
              position="top"
              formatter={(v: number) => fmtEurCompact(v)}
              style={{ fill: COLORS.inkSecondary, fontSize: 11 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
