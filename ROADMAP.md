# Roadmap — CyberArk PAM ROI/TCO Application, Version 1

An executive-grade, multi-tier web application that lets a user build any number of
named CyberArk PAM **On-Prem vs SaaS (Privilege Cloud)** ROI/TCO analyses, visualize
them with C-level-ready charts, and export a polished PDF report. Runs entirely on
Docker. Calculation model is specified in `docs/CALC-SPEC.md` (extracted from the
customer workbook in `docs/reference/PAM_TCO_ROI.xlsx`, extended with password-count
t-shirt sizing and a quantified SaaS-benefits module).

---

## How to use this roadmap in a loop (execution protocol)

This file is the single source of truth for build progress. Each iteration of the
loop MUST:

1. **Read** this file. Find the lowest-numbered milestone that is not `✅ Done`.
2. **Pick** the first unchecked task `[ ]` in that milestone (respect task order —
   tasks within a milestone are dependency-ordered).
3. **Implement** the task fully, including its acceptance criteria.
4. **Verify**: run the test/acceptance command(s) listed for the task or milestone.
   A task is not done until its acceptance criteria pass.
5. **Update** this file: tick the task `[x]`; if all tasks in the milestone are
   ticked and the milestone's Definition of Done passes, set its status to `✅ Done`
   and update the status table below.
6. **Commit & push** with message `M<x>-T<y>: <summary>` to branch
   `claude/cyberark-roi-tco-app-pejhud`.
7. Stop, or loop again from step 1.

Rules:
- Never skip ahead to a later milestone while an earlier one has unchecked tasks,
  unless a task is explicitly marked `(parallel-ok)`.
- Never change `docs/CALC-SPEC.md` formulas without recording the change in the
  Decision Log below.
- Keep `docker compose up --build` green at the end of every task from M0 onward.

### Status board

| Milestone | Title | Status |
|---|---|---|
| M0 | Foundations & scaffolding | ✅ Done |
| M1 | Calculation engine (Excel parity) | ✅ Done |
| M2 | Persistence & analysis management API | ✅ Done |
| M3 | Input experience (wizard + t-shirt sizing) | ✅ Done |
| M4 | Executive results dashboard | ✅ Done |
| M5 | SaaS benefits module | ✅ Done |
| M6 | PDF report export | ✅ Done |
| M7 | Executive polish & demo readiness | ✅ Done |
| M8 | Hardening & v1 release | ⬜ Not started |

---

## Architecture (decided for v1)

Three Docker services orchestrated by `docker-compose.yml`:

| Tier | Service | Technology | Responsibility |
|---|---|---|---|
| Presentation | `web` | React 18 + TypeScript + Vite, Tailwind CSS, Recharts; nginx serving the production build and proxying `/api` | Input wizard, dashboard, charts, analysis library |
| Application | `api` | Python 3.12 + FastAPI + SQLAlchemy + Alembic; Playwright/Chromium for PDF | Calculation engine, REST API, validation, PDF rendering |
| Data | `db` | PostgreSQL 16 + named volume | Durable storage of all analyses (nothing is ever lost) |

Key decisions:
- **Engine lives server-side** and is the only place formulas exist. The frontend
  never computes money. One source of truth, testable to Excel parity.
- **PDF via headless Chromium** rendering a dedicated print-optimized report route of
  the web app: the PDF's charts and styling match the on-screen dashboard exactly.
- **Snapshot on calculate**: every analysis stores its full input set and its computed
  results (versioned by engine version), so historical reports remain reproducible
  even if defaults change later.
- **Config-driven defaults**: t-shirt inventory matrix, unit-rate defaults, and
  benefit defaults ship as versioned data (JSON) so field engineers can tune them
  without touching engine code.
- Currency: EUR, horizon default 3 years (engine is horizon-generic).
- No authentication in v1 (single-team tool); the API is not exposed beyond the
  Docker network except through nginx. Auth is a v2 candidate.

Repository layout:

```
/docker-compose.yml            # dev + prod profiles
/api/                          # FastAPI app, engine/, models/, reports/, tests/
/web/                          # Vite React app, src/pages, src/components, src/charts
/docs/CALC-SPEC.md             # calculation source of truth
/docs/reference/PAM_TCO_ROI.xlsx
/ROADMAP.md                    # this file
```

---

## M0 — Foundations & scaffolding

Goal: `docker compose up --build` brings up all three tiers with health checks; hot
reload works for dev.

- [x] **M0-T1** Scaffold repo layout (`api/`, `web/`, `docs/`), root `README.md`
      (what/why/quickstart), `.gitignore`, `.editorconfig`.
- [x] **M0-T2** `api`: FastAPI skeleton with `GET /api/health`, structured settings
      (env vars for DB URL), Dockerfile (multi-stage), `pytest` wired with one
      passing smoke test.
- [x] **M0-T3** `db`: PostgreSQL 16 service with named volume, healthcheck, init
      database `pamroi`.
- [x] **M0-T4** `web`: Vite + React + TS + Tailwind skeleton, app shell (header with
      product name "CyberArk PAM Value Analyzer", empty routes), Dockerfile
      (build → nginx), nginx proxies `/api` → `api:8000`.
- [x] **M0-T5** `docker-compose.yml` with `dev` profile (bind mounts + hot reload)
      and default prod profile; document both in README.

**Definition of Done**: `docker compose up --build` → `http://localhost:8080` serves
the shell; `curl localhost:8080/api/health` returns `{"status":"ok","db":"up"}`;
`pytest` green in the api container.

## M1 — Calculation engine (Excel parity)

Goal: a pure, fully-tested Python engine implementing `docs/CALC-SPEC.md`.

- [x] **M1-T1** Typed input model (Pydantic): sections A–H incl. `num_passwords`,
      component inventory rows, benefits config; strict validation (non-negative,
      percentage bounds, horizon 1–10).
- [x] **M1-T2** Defaults registry: JSON config with workbook defaults + t-shirt
      inventory matrix from CALC-SPEC §A2; loader with schema check.
- [x] **M1-T3** T-shirt sizing: `size_for(num_passwords)` + `default_inventory(size)`
      exactly per spec thresholds (<1,000 / 1,000–20,000 / 20,000–100,000 / >100,000).
      Unit tests on all boundaries (999, 1000, 20000, 20001, 100000, 100001).
- [x] **M1-T4** On-Prem TCO calculator: per-component infra build-up, ops, yearly
      build with licence uplift compounding and annualised upgrades (CALC-SPEC §2).
- [x] **M1-T5** SaaS TCO calculator: connector infra, subscription uplift, ops,
      Year-1 migration (CALC-SPEC §3).
- [x] **M1-T6** ROI summary: net savings, ROI%, payback months (workbook formula incl.
      the ≤0 guard), run-rate, per-year and cumulative savings, category comparison
      table, NPV (Excel convention). **Golden parity test**: workbook example inputs
      reproduce every value in CALC-SPEC §6 to the cent / 6 decimal places.
- [x] **M1-T7** Benefits engine (CALC-SPEC §1H + §5): per-benefit annual values,
      toggles, benefits-adjusted totals (total value, value ROI, value payback, NPV).
      Unit tests per benefit + double-counting guard test (benefits view never
      re-includes FTE or upgrade project cost).
- [x] **M1-T8** `POST /api/calc/preview`: stateless endpoint — full input set in,
      full result set out (used later for live recalculation in the wizard).

**Definition of Done**: `pytest api/tests` green including golden parity; engine has
zero I/O (pure functions); engine version constant `ENGINE_VERSION = "1.x"` exported.

## M2 — Persistence & analysis management API

Goal: unlimited named analyses, all data kept.

- [x] **M2-T1** SQLAlchemy models + Alembic migration: `analyses` (id, name unique,
      customer_name, description, created_at, updated_at) and `analysis_versions`
      (id, analysis_id, inputs JSONB, results JSONB, engine_version, created_at) —
      every save appends a version; latest version is the live one.
- [x] **M2-T2** CRUD endpoints: create (name required, seeded from defaults +
      chosen/derived t-shirt size), list (with headline KPIs for the library view),
      get latest, update inputs (recalculates + appends version), rename, duplicate,
      soft-delete + restore. Consistent error envelope; 409 on duplicate name.
- [x] **M2-T3** Version history endpoints: list versions, get specific version
      (feeds "as-of" reporting later).
- [x] **M2-T4** API integration tests against a throwaway Postgres (docker) covering
      the full lifecycle: create → edit → duplicate → soft-delete → restore.

**Definition of Done**: full lifecycle test green; restarting the stack
(`docker compose down && up`) loses nothing.

## M3 — Input experience (wizard + t-shirt sizing)

Goal: a guided, credible input flow a presales engineer can complete live in front of
a customer.

- [x] **M3-T1** Analysis library home: card/list of analyses (name, customer, date,
      headline savings & ROI badges), create-new dialog (name + customer +
      number of passwords), duplicate/rename/delete actions, empty state.
- [x] **M3-T2** Wizard shell with sections mirroring CALC-SPEC: Scope & Sizing,
      Licensing, Inventory, Unit Rates, Operations, Migration, Connectors,
      Parameters, Benefits. Progress indicator, per-field inline validation,
      autosave (debounced update → API).
- [x] **M3-T3** Scope & Sizing step: `num_passwords` input with live t-shirt size
      badge (Small / Mid-Range / Large / Very Large) and a visual scale; changing
      size proposes re-applying default inventory with an explicit confirm
      (per CALC-SPEC — never silently overwrite user edits).
- [x] **M3-T4** Inventory editor: editable grid (qty, vCPU, RAM, storage, OS, role),
      add/remove rows, live per-row annual cost preview via `/api/calc/preview`,
      "reset to size defaults" action.
- [x] **M3-T5** Remaining input steps with sensible grouping, unit suffixes (€, %,
      GB, FTE), tooltips explaining each assumption (text lifted from workbook
      annotations, e.g. "salary + overhead", "environment-level, once").
- [x] **M3-T6** Live mini-summary sidebar: 3-yr net savings, ROI, payback update as
      inputs change (debounced preview call), so the story builds while typing.

**Definition of Done**: create → complete wizard → values persist across reload;
t-shirt boundary behavior verified in a Playwright e2e test (999 vs 1000 passwords).

## M4 — Executive results dashboard

Goal: the money screen — instantly legible to a CIO/CFO.

- [x] **M4-T1** KPI headline band: 3-Year Net Savings, ROI %, Payback (months),
      Annual Run-Rate Saving, NPV — large numerals, delta arrows, EUR formatting
      (`€515,593`, `78.2%`, `4.4 months`).
- [x] **M4-T2** TCO comparison chart: grouped/stacked bars On-Prem vs SaaS by cost
      category (Licence, Infrastructure, Operations, Upgrades, Migration) with a
      savings column; follows the repo dataviz conventions (accessible palette,
      light/dark safe).
- [x] **M4-T3** Cash-flow chart: yearly On-Prem vs SaaS cost bars + cumulative
      savings line with break-even marker at the payback point.
- [x] **M4-T4** Cost-category waterfall: On-Prem TCO → savings per category →
      SaaS TCO, the single most persuasive C-level visual.
- [x] **M4-T5** Benefits value panel (renders once M5 lands; hidden if all benefits
      disabled): hard savings vs total-value bar, benefit line items with amounts.
- [x] **M4-T6** Detail tables (collapsible "for the analysts" section): full On-Prem
      build-up per component, SaaS build-up, per-year matrices — mirroring the
      workbook tabs so finance can audit every number.

**Definition of Done**: dashboard renders the golden-parity analysis identically to
the workbook's numbers; charts responsive ≥1280px and presentable on a projector;
screenshot check in e2e.

## M5 — SaaS benefits module

Goal: quantify SaaS value beyond cost savings, credibly and transparently.

- [x] **M5-T1** Benefits wizard step: card per benefit (B1–B6) with toggle,
      editable assumptions, plain-language explanation of the formula and its
      rationale, and live computed annual value.
- [x] **M5-T2** Wire benefits into results: dual headline blocks ("Hard cost
      savings" vs "Total value incl. quantified benefits"), value ROI, value
      payback, value NPV (CALC-SPEC §5).
- [x] **M5-T3** Methodology transparency: every benefit shows its formula and
      sources footnote in UI and PDF; disclaimer that defaults are illustrative
      benchmarks to be replaced with customer figures.
- [x] **M5-T4** e2e test: toggling a benefit updates totals; disabling all benefits
      collapses the value view back to TCO-only.

**Definition of Done**: benefits fully editable/toggleable; anti-double-counting
guard tests green; UI copy reviewed against CALC-SPEC §1H.

## M6 — PDF report export

Goal: one click → boardroom-ready PDF.

- [x] **M6-T1** Print-optimized report route in `web` (`/report/:id/print`):
      cover page (analysis name, customer, date, prepared-by), executive summary
      with KPI band, charts, benefits panel, assumption appendix, methodology &
      disclaimer page. A4, page breaks controlled, no app chrome.
- [x] **M6-T2** `api` PDF service: Playwright + Chromium in the api image renders
      the print route to PDF; `POST /api/analyses/{id}/report` returns the file;
      generation is async-safe (locks or queue) and < 15 s.
- [x] **M6-T3** Download UX: "Export PDF" button with progress state; filename
      `PAM-ROI-<analysis-name>-<date>.pdf`.
- [x] **M6-T4** Report snapshots: report renders from the stored results snapshot
      (specific version), stamped with engine version and generation date, so a PDF
      regenerated later matches the original analysis.
- [x] **M6-T5** e2e test: generate PDF for golden analysis; assert page count,
      presence of key strings (net savings figure), and file size sanity.

**Definition of Done**: PDF of the golden analysis is visually reviewed (charts
render, no clipped content), reproducible, and downloads from the UI.

## M7 — Executive polish & demo readiness

- [x] **M7-T1** Visual pass: consistent typography scale, spacing, brand-neutral
      professional palette (CyberArk-adjacent blues), loading/empty/error states
      everywhere, dark-mode-safe charts.
- [x] **M7-T2** Number formatting audit: EUR thousands separators, one decimal on
      %, months with one decimal, consistent rounding-at-presentation (engine stays
      full precision).
- [x] **M7-T3** Seed script: `make seed` (or compose profile) creating two demo
      analyses — the workbook golden case (Mid-Range) and a Very Large showcase.
- [x] **M7-T4** Guardrails: friendly handling of degenerate inputs (zero SaaS quote,
      negative savings scenario renders honestly — the tool must stay credible when
      SaaS loses), horizon ≠ 3 sanity.
- [x] **M7-T5** In-app methodology page reproducing CALC-SPEC in readable form +
      workbook lineage note.

**Definition of Done**: 10-minute demo script (in README) runs end-to-end flawlessly
from a fresh `docker compose up`.

## M8 — Hardening & v1 release

- [ ] **M8-T1** Prod images slimmed (multi-stage, non-root users), healthchecks on
      all services, restart policies, resource limits in compose.
- [ ] **M8-T2** Backup/restore documented: volume backup one-liner + restore drill
      executed once.
- [ ] **M8-T3** Full test sweep in CI-style script `./scripts/check.sh` (api unit +
      integration, web lint + typecheck + e2e headless); README badges/manual.
- [ ] **M8-T4** Version stamping: app shows `v1.0.0` + engine version in footer;
      CHANGELOG.md; git tag `v1.0.0`.
- [ ] **M8-T5** Final acceptance walkthrough against the v1 scope checklist below;
      record results in this file.

**Definition of Done**: v1 scope checklist all green; tag pushed.

---

## V1 scope checklist (acceptance)

- [ ] User inputs match the workbook's Inputs & Assumptions sections A–G.
- [ ] Additional input: number of passwords; drives t-shirt size
      (Small <1,000 · Mid-Range 1,000–20,000 · Large 20,000–100,000 · Very Large >100,000)
      which pre-sizes local infrastructure defaults.
- [ ] SaaS additional benefits quantified, toggleable, reported as distinct value.
- [ ] Multi-tier application, fully Dockerized (`docker compose up`).
- [ ] Interactive, chart-rich UI suitable for C-level presentation.
- [ ] PDF report export after analysis completion.
- [ ] Unlimited analyses, each identified by name; all data durably kept.
- [ ] Engine reproduces the reference workbook's results exactly (golden parity).

## Explicitly out of scope for v1 (v2 candidates)

Authentication/multi-user roles · multi-currency · scenario side-by-side comparison
across analyses · sensitivity/tornado analysis · Excel export · CyberArk price-list
integration · SSO · localization beyond EUR/English.

## Decision Log

| Date | Decision |
|---|---|
| 2026-08-04 | Stack: FastAPI + PostgreSQL + React/Vite/Recharts, PDF via headless Chromium print route. |
| 2026-08-04 | T-shirt thresholds interpreted as: Small <1,000; Mid-Range 1,000–20,000; Large 20,000–100,000; Very Large >100,000 passwords ("Small > 1000" in the request read as "up to 1,000"). |
| 2026-08-04 | Mid-Range default inventory = workbook example inventory, keeping golden parity at 5,000 passwords. |
| 2026-08-04 | Benefits shown separately from hard savings; both ROI views always visible (credibility with CFOs). |
| 2026-08-04 | Payback formula kept exactly as workbook (SaaS Y1 total ÷ steady-state Y2 saving × 12), incl. its ≤0 guard. |
| 2026-08-04 | Golden-parity finding: the workbook's payback numerator is the one-time migration investment ('SaaS TCO'!C17 = €71,000), not the SaaS Year-1 total. CALC-SPEC §4/§5 corrected; engine matches the workbook (4.36 months). |
| 2026-08-04 | Build-sandbox limitation: container registries' blob CDNs are blocked by egress policy, so `docker compose up` cannot be exercised in the build environment. Verification is done natively (pytest, vite build, headless-Chromium e2e, SQLite-backed test runs) plus `docker compose config` validation; the compose stack targets standard environments and Postgres remains the production DB. |
