# Changelog

## v1.0.0 — 2026-08-04

First release of the CyberArk PAM Value Analyzer.

- Three-tier Docker stack: React/Vite/Tailwind/Recharts web (nginx), FastAPI
  calculation + PDF API, PostgreSQL 16 persistence.
- Calculation engine with automated golden parity against the reference workbook
  `PAM_TCO_ROI.xlsx` (net savings €515,593 / ROI 78.18% / payback 4.36 months /
  NPV €437,547 on the example inputs).
- Password-count driven infrastructure t-shirt sizing (Small < 1,000 ·
  Mid-Range 1,000–20,000 · Large 20,000–100,000 · Very Large > 100,000) with
  per-size default component inventories, always user-editable.
- Quantified SaaS benefits module (breach risk, upgrade downtime, time-to-value,
  audit efficiency, hardware refresh, cyber-insurance), individually toggleable
  and reported separately from hard cost savings.
- Unlimited named analyses with full version history (every save keeps the
  inputs + results snapshot and engine version).
- Executive dashboard: KPI band, category comparison, cash-flow with payback,
  savings waterfall, value view, analyst detail tables.
- One-click boardroom PDF (A4, cover, executive summary, charts, assumptions
  appendix, methodology & disclaimer) rendered by headless Chromium.
- Seed demos, in-app methodology page, guardrails for unfavourable scenarios.
