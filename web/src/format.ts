const eur0 = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const num0 = new Intl.NumberFormat("en-IE", { maximumFractionDigits: 0 });

export const fmtEur = (v: number) => eur0.format(Math.round(v));

export const fmtEurCompact = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `€${Math.round(v / 1_000)}k`;
  return fmtEur(v);
};

export const fmtNum = (v: number) => num0.format(v);

export const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;

export const fmtMonths = (v: number) =>
  v <= 0 ? "—" : `${v.toFixed(1)} months`;
