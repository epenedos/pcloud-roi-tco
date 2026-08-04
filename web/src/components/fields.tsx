import { useEffect, useState } from "react";

export function Section({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

/** Numeric input that keeps focus-friendly local text state and commits parsed values. */
export function NumberField({
  label,
  value,
  onChange,
  unit,
  hint,
  percent = false,
  min = 0,
  step,
  testid,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  hint?: string;
  percent?: boolean;
  min?: number;
  step?: number;
  testid?: string;
}) {
  const display = percent ? value * 100 : value;
  const [text, setText] = useState(String(display));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(String(percent ? value * 100 : value));
  }, [value, percent, focused]);

  const commit = (raw: string) => {
    const parsed = parseFloat(raw);
    if (Number.isNaN(parsed)) return;
    const v = percent ? parsed / 100 : parsed;
    if (v < min) return;
    onChange(v);
  };

  return (
    <label className="block">
      <span className="flex items-center gap-1 text-sm font-medium text-slate-700">
        {label}
        {hint && (
          <span className="group relative inline-block">
            <span className="cursor-help text-slate-400">ⓘ</span>
            <span className="pointer-events-none absolute left-1/2 top-6 z-20 hidden w-56 -translate-x-1/2 rounded-lg bg-slate-800 p-2 text-xs font-normal text-white shadow-lg group-hover:block">
              {hint}
            </span>
          </span>
        )}
      </span>
      <span className="mt-1 flex items-center overflow-hidden rounded-lg border border-slate-300 bg-white focus-within:border-[var(--brand-500)] focus-within:ring-1 focus-within:ring-[var(--brand-250)]">
        <input
          type="number"
          className="w-full border-0 px-3 py-2 text-sm focus:outline-none"
          value={text}
          min={percent ? min * 100 : min}
          step={step ?? (percent ? 0.5 : 1)}
          data-testid={testid}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            setFocused(false);
            commit(e.target.value);
          }}
          onChange={(e) => {
            setText(e.target.value);
            commit(e.target.value);
          }}
        />
        {(unit || percent) && (
          <span className="whitespace-nowrap border-l border-slate-200 bg-slate-50 px-2 py-2 text-xs text-slate-500">
            {percent ? "%" : unit}
          </span>
        )}
      </span>
    </label>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  testid,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  testid?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      data-testid={testid}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-[var(--brand-500)]" : "bg-slate-300"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
      {label && <span className="sr-only">{label}</span>}
    </button>
  );
}
