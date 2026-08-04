import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { fmtEur, fmtNum, fmtPct } from "../format";
import { SIZE_LABELS, sizeFor, type AnalysisListItem } from "../types";

function CreateDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [customer, setCustomer] = useState("");
  const [passwords, setPasswords] = useState(5000);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      setError("Give the analysis a name");
      return;
    }
    setBusy(true);
    try {
      const created = await api.createAnalysis({
        name: name.trim(),
        customer_name: customer.trim(),
        num_passwords: passwords,
      });
      navigate(`/analysis/${created.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold">New ROI/TCO analysis</h2>
        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Analysis name *</span>
            <input
              autoFocus
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={name}
              data-testid="create-name"
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. ACME Corp – Privilege Cloud business case"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Customer</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              placeholder="Customer name"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Number of passwords under management
            </span>
            <input
              type="number"
              min={1}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={passwords}
              data-testid="create-passwords"
              onChange={(e) => setPasswords(parseInt(e.target.value, 10) || 1)}
            />
            <span className="mt-1 block text-xs text-slate-500" data-testid="create-size">
              Infrastructure t-shirt size:{" "}
              <strong>{SIZE_LABELS[sizeFor(passwords)]}</strong>
            </span>
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            onClick={submit}
            disabled={busy}
            data-testid="create-submit"
          >
            Create analysis
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Library() {
  const [items, setItems] = useState<AnalysisListItem[] | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState("");

  const reload = () =>
    api
      .listAnalyses()
      .then(setItems)
      .catch((e) => setError((e as Error).message));

  useEffect(() => {
    reload();
  }, []);

  const remove = async (item: AnalysisListItem) => {
    if (!window.confirm(`Delete analysis "${item.name}"? It can be restored via the API.`))
      return;
    await api.deleteAnalysis(item.id);
    reload();
  };

  const duplicate = async (item: AnalysisListItem) => {
    const name = window.prompt("Name for the copy:", `${item.name} (copy)`);
    if (!name) return;
    try {
      await api.duplicateAnalysis(item.id, name);
      reload();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Analyses</h1>
          <p className="text-sm text-slate-500">
            Each analysis is a complete On-Prem vs SaaS business case. All data is kept.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          data-testid="new-analysis"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700"
        >
          + New analysis
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {items === null ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-400">
          Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-14 text-center">
          <p className="text-slate-500">No analyses yet.</p>
          <p className="mt-1 text-sm text-slate-400">
            Create your first CyberArk PAM On-Prem → SaaS business case.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="analysis-cards">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <Link to={`/analysis/${item.id}`} className="grow">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-slate-900">{item.name}</h2>
                  <span className="whitespace-nowrap rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                    {SIZE_LABELS[item.headline.tshirt_size]}
                  </span>
                </div>
                {item.customer_name && (
                  <p className="text-sm text-slate-500">{item.customer_name}</p>
                )}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-slate-400">
                      Net savings
                    </div>
                    <div
                      className={`font-semibold ${item.headline.net_savings >= 0 ? "text-emerald-700" : "text-red-700"}`}
                    >
                      {fmtEur(item.headline.net_savings)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-slate-400">
                      ROI
                    </div>
                    <div className="font-semibold text-slate-900">
                      {fmtPct(item.headline.roi_pct)}
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  {fmtNum(item.headline.num_passwords)} passwords · updated{" "}
                  {new Date(item.updated_at).toLocaleDateString()}
                </p>
              </Link>
              <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3 text-xs">
                <Link
                  to={`/analysis/${item.id}?tab=dashboard`}
                  className="rounded-md bg-slate-100 px-2.5 py-1.5 font-medium text-slate-700 hover:bg-slate-200"
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => duplicate(item)}
                  className="rounded-md px-2.5 py-1.5 text-slate-500 hover:bg-slate-100"
                >
                  Duplicate
                </button>
                <button
                  onClick={() => remove(item)}
                  className="ml-auto rounded-md px-2.5 py-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateDialog onClose={() => setShowCreate(false)} />}
    </div>
  );
}
