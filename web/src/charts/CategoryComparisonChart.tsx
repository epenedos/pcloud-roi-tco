import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CategoryRow } from "../types";
import { fmtEur, fmtEurCompact } from "../format";
import { COLORS, chartMargin } from "./palette";

const SHORT: Record<string, string> = {
  "Licence / Subscription": "Licence / Sub",
  Infrastructure: "Infrastructure",
  "Operations & labour": "Operations",
  "Version upgrades": "Upgrades",
  "One-time migration": "Migration",
};

export default function CategoryComparisonChart({
  categories,
  horizon,
  animate = true,
}: {
  categories: CategoryRow[];
  horizon: number;
  animate?: boolean;
}) {
  const data = categories.map((c) => ({
    name: SHORT[c.category] ?? c.category,
    "On-Prem": c.onprem,
    SaaS: c.saas,
  }));
  return (
    <div data-testid="chart-categories">
      <h3 className="mb-1 text-sm font-semibold text-slate-700">
        {horizon}-year cost by category
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={chartMargin} barGap={2}>
          <CartesianGrid stroke={COLORS.gridline} vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: COLORS.inkSecondary, fontSize: 12 }}
            axisLine={{ stroke: COLORS.gridline }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={fmtEurCompact}
            tick={{ fill: COLORS.inkSecondary, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={64}
          />
          <Tooltip formatter={(v) => fmtEur(Number(v))} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="On-Prem" fill={COLORS.onprem} radius={[4, 4, 0, 0]} isAnimationActive={animate} />
          <Bar dataKey="SaaS" fill={COLORS.saas} radius={[4, 4, 0, 0]} isAnimationActive={animate} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
