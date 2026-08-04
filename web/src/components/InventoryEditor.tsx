import type { CalcResult, ComponentRow } from "../types";
import { fmtEur } from "../format";

const NUM_COLS: {
  key: "qty" | "vcpu_each" | "ram_gb_each" | "storage_gb_each";
  label: string;
}[] = [
  { key: "qty", label: "Qty" },
  { key: "vcpu_each", label: "vCPU each" },
  { key: "ram_gb_each", label: "RAM GB each" },
  { key: "storage_gb_each", label: "Storage GB each" },
];

export default function InventoryEditor({
  inventory,
  results,
  onChange,
  onResetToDefaults,
}: {
  inventory: ComponentRow[];
  results: CalcResult | null;
  onChange: (rows: ComponentRow[]) => void;
  onResetToDefaults: () => void;
}) {
  const annualByName = new Map(
    (results?.onprem.components ?? []).map((c) => [c.name, c.annual]),
  );

  const update = (idx: number, patch: Partial<ComponentRow>) => {
    onChange(inventory.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Per-node specs; annual € column is the live computed infrastructure cost
          per component row.
        </p>
        <button
          type="button"
          onClick={onResetToDefaults}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          Reset to size defaults
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm" data-testid="inventory-table">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="py-2 pr-2">Component</th>
              {NUM_COLS.map((c) => (
                <th key={c.key} className="px-2 py-2">
                  {c.label}
                </th>
              ))}
              <th className="px-2 py-2">OS</th>
              <th className="px-2 py-2 text-right">Annual €</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {inventory.map((row, idx) => (
              <tr key={idx} className="border-b border-slate-100">
                <td className="py-1.5 pr-2">
                  <input
                    className="w-44 rounded border border-slate-200 px-2 py-1"
                    value={row.name}
                    onChange={(e) => update(idx, { name: e.target.value })}
                  />
                  <div className="text-[11px] text-slate-400">{row.role}</div>
                </td>
                {NUM_COLS.map((c) => (
                  <td key={c.key} className="px-2 py-1.5">
                    <input
                      type="number"
                      min={0}
                      className="w-20 rounded border border-slate-200 px-2 py-1"
                      value={row[c.key]}
                      data-testid={`inv-${idx}-${c.key}`}
                      onChange={(e) => {
                        const v = c.key === "qty"
                          ? parseInt(e.target.value, 10)
                          : parseFloat(e.target.value);
                        if (!Number.isNaN(v) && v >= 0) update(idx, { [c.key]: v });
                      }}
                    />
                  </td>
                ))}
                <td className="px-2 py-1.5">
                  <select
                    className="rounded border border-slate-200 px-2 py-1"
                    value={row.os}
                    onChange={(e) =>
                      update(idx, { os: e.target.value as ComponentRow["os"] })
                    }
                  >
                    <option>Windows</option>
                    <option>Linux</option>
                  </select>
                </td>
                <td className="px-2 py-1.5 text-right font-medium tabular-nums">
                  {annualByName.has(row.name)
                    ? fmtEur(annualByName.get(row.name)!)
                    : "—"}
                </td>
                <td className="py-1.5 text-right">
                  <button
                    type="button"
                    title="Remove row"
                    onClick={() => onChange(inventory.filter((_, i) => i !== idx))}
                    className="text-slate-400 hover:text-red-600"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={() =>
          onChange([
            ...inventory,
            {
              name: "Custom component",
              qty: 1,
              vcpu_each: 4,
              ram_gb_each: 8,
              storage_gb_each: 100,
              os: "Windows",
              role: "",
            },
          ])
        }
        className="mt-3 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
      >
        + Add component
      </button>
    </div>
  );
}
