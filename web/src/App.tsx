import { Link, Route, Routes, useLocation } from "react-router-dom";
import Library from "./pages/Library";
import AnalysisWorkspace from "./pages/AnalysisWorkspace";
import Methodology from "./pages/Methodology";
import PrintReport from "./pages/PrintReport";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-[var(--brand-900)] text-white shadow-md">
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
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/methodology" className="text-blue-200 hover:text-white">
              Methodology
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const isPrint = location.pathname.startsWith("/report/");
  if (isPrint) {
    return (
      <Routes>
        <Route path="/report/:id/print" element={<PrintReport />} />
      </Routes>
    );
  }
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Library />} />
        <Route path="/analysis/:id" element={<AnalysisWorkspace />} />
        <Route path="/methodology" element={<Methodology />} />
      </Routes>
    </Shell>
  );
}
