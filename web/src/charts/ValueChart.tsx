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
import { fmtEur, fmtEurCompact } from "../format";
import { COLORS, chartMargin } from "./palette";

/** Hard TCO savings vs total value including quantified SaaS benefits. */
export default function ValueChart({
  netSavings,
  benefitsTotal,
  horizon,
  animate = true,
}: {
  netSavings: number;
  benefitsTotal: number;
  horizon: number;
  animate?: boolean;
}) {
  const data = [
    { name: "Hard cost savings", value: netSavings, color: COLORS.saving },
    { name: "Quantified SaaS benefits", value: benefitsTotal, color: COLORS.benefit },
    {
      name: "Total value",
      value: netSavings + benefitsTotal,
      color: COLORS.saas,
    },
  ];
  return (
    <div data-testid="chart-value">
      <h3 className="mb-1 text-sm font-semibold text-slate-700">
        {horizon}-year value: savings + benefits
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} layout="vertical" margin={{ ...chartMargin, left: 24, right: 72 }}>
          <CartesianGrid stroke={COLORS.gridline} horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={fmtEurCompact}
            tick={{ fill: COLORS.inkSecondary, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={170}
            tick={{ fill: COLORS.inkSecondary, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip formatter={(v) => fmtEur(Number(v))} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={animate}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              formatter={(v: number) => fmtEurCompact(v)}
              style={{ fill: COLORS.inkSecondary, fontSize: 12 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
