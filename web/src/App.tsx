import { Link, Route, Routes } from "react-router-dom";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="bg-[var(--brand-900)] text-white shadow-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--brand-500)] font-bold">
              ⛨
            </div>
            <div>
              <div className="text-lg font-semibold leading-tight">
                CyberArk PAM Value Analyzer
              </div>
              <div className="text-xs text-blue-200">
                On-Prem → SaaS · TCO &amp; ROI · EUR
              </div>
            </div>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route
          path="/"
          element={
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">
              Analysis library coming in M3.
            </div>
          }
        />
      </Routes>
    </Shell>
  );
}
