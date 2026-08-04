import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtEur, fmtEurCompact, fmtMonths } from "../format";
import { COLORS, chartMargin } from "./palette";

export default function CashflowChart({
  onpremYears,
  saasYears,
  cumulative,
  paybackMonths,
  animate = true,
}: {
  onpremYears: number[];
  saasYears: number[];
  cumulative: number[];
  paybackMonths: number;
  animate?: boolean;
}) {
  const data = onpremYears.map((v, i) => ({
    name: `Year ${i + 1}`,
    "On-Prem cost": v,
    "SaaS cost": saasYears[i],
    "Cumulative saving": cumulative[i],
  }));
  return (
    <div data-testid="chart-cashflow">
      <h3 className="mb-1 text-sm font-semibold text-slate-700">
        Annual cost &amp; cumulative savings
        {paybackMonths > 0 && (
          <span className="ml-2 font-normal text-slate-500">
            (migration recouped in {fmtMonths(paybackMonths)})
          </span>
        )}
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={chartMargin} barGap={2}>
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
          <Bar dataKey="On-Prem cost" fill={COLORS.onprem} radius={[4, 4, 0, 0]} isAnimationActive={animate} />
          <Bar dataKey="SaaS cost" fill={COLORS.saas} radius={[4, 4, 0, 0]} isAnimationActive={animate} />
          <Line
            dataKey="Cumulative saving"
            stroke={COLORS.saving}
            strokeWidth={2}
            dot={{ r: 4, fill: COLORS.saving }}
            isAnimationActive={animate}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
