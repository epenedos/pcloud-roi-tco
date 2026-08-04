# CyberArk PAM Value Analyzer

Executive-grade ROI/TCO analysis for migrating CyberArk PAM from self-hosted
(on-premises) to CyberArk SaaS (Privilege Cloud / Modern PAM).

Build any number of **named analyses**, drive infrastructure sizing from the **number
of passwords** under management (t-shirt sizing), quantify **SaaS benefits beyond cost
savings**, present the results with C-level-ready charts, and export a **boardroom PDF
report**. All data is kept durably in PostgreSQL.

The calculation model is specified in [`docs/CALC-SPEC.md`](docs/CALC-SPEC.md) and is
verified against the reference workbook
[`docs/reference/PAM_TCO_ROI.xlsx`](docs/reference/PAM_TCO_ROI.xlsx) by an automated
golden-parity test.

## Quickstart (production profile)

```bash
docker compose up --build -d
```

Then open **http://localhost:8080**.

- `web` — React dashboard served by nginx (port 8080), proxies `/api` to the API
- `api` — FastAPI application: calculation engine, REST API, PDF rendering
- `db`  — PostgreSQL 16 with a named volume (`pamroi_pgdata`), nothing is lost across restarts

Health check: `curl http://localhost:8080/api/health` → `{"status":"ok","db":"up"}`

## Development profile (hot reload)

```bash
docker compose --profile dev up --build
```

- Vite dev server on **http://localhost:5173** (proxies `/api` to the dev API)
- API with `--reload` on http://localhost:8000, code bind-mounted

## Running tests

```bash
# API unit + engine tests
docker compose run --rm api pytest -q

# Everything (used by the roadmap loop)
./scripts/check.sh
```

## Project layout

```
docker-compose.yml     # prod (default) + dev profiles
api/                   # FastAPI app: engine/, routers/, tests/
web/                   # React + TypeScript + Vite + Tailwind + Recharts
docs/CALC-SPEC.md      # calculation source of truth
docs/reference/        # customer reference workbook
ROADMAP.md             # loop-executable build plan and progress
```

## Disclaimer

Default unit rates and benefit assumptions are illustrative industry benchmarks, not a
CyberArk quote. Replace them with the customer's real figures before presenting.
