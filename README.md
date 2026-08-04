# IDIRA Modern PAM Migration Value

Executive-grade ROI/TCO analysis for migrating CyberArk PAM from self-hosted
(on-premises) to CyberArk SaaS (Privilege Cloud / Modern PAM).

Build any number of **named analyses**, drive infrastructure sizing from the **number
of passwords** under management (t-shirt sizing), quantify **SaaS benefits beyond cost
savings**, present the results with C-level-ready charts, and export a **boardroom PDF
report**. All data is kept durably in PostgreSQL.

UI, dashboard and PDF report follow the **IDIRA by Palo Alto Networks** brand
(2026 one-pager template): Idira blue ramp (#265bff / #061d63), Figtree typeface,
navy header band and the signature accent rule. Brand tokens live in
`web/src/index.css` and `web/src/charts/palette.ts`.

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

## Demo data

```bash
make seed        # creates two demo analyses (idempotent)
```

- **Demo — Workbook example (Mid-Range)**: the reference workbook case (5,000
  passwords, €515,593 net savings, 78.2% ROI, 4.4-month payback).
- **Demo — Global bank (Very Large)**: 250,000 passwords, enterprise-scale figures.

## 10-minute demo script

1. `make up && make seed`, open http://localhost:8080.
2. Library: point out the two demo cases and their headline KPI badges.
3. Create a new analysis live: name it after the customer, enter their password
   count — show the t-shirt size badge react (999 → Small, 1,000 → Mid-Range).
4. Inputs: put the customer's real renewal quote and SaaS quote into section A —
   watch the live summary sidebar update as you type.
5. Inventory: show the pre-sized component grid and edit a PSM count; note the
   per-row annual € preview.
6. Benefits: toggle a benefit off to show the value view is honest and itemized.
7. Dashboard: walk the KPI band → category comparison → cash-flow with payback →
   savings waterfall ("where the value comes from").
8. Click **Export PDF** and open the boardroom report.
9. Close on the Methodology page: every formula is documented and the engine is
   verified against the reference workbook by an automated parity test.

## Restoring a deleted analysis

Deleting an analysis in the UI is a **soft delete**: the analysis and its full
version history stay in the database, hidden from the library. To bring one back,
use the API (all endpoints go through the web port — nginx proxies `/api`):

1. Find the deleted analysis's ID:

   ```bash
   curl -s "http://localhost:8080/api/analyses?include_deleted=true" | python3 -m json.tool
   ```

   Deleted entries show `"deleted": true`; note the `id` (a UUID).

2. Restore it:

   ```bash
   curl -s -X POST "http://localhost:8080/api/analyses/<id>/restore"
   ```

   The analysis reappears in the library with all versions intact.

One-liner to restore by name:

```bash
NAME="ACME Corp"
ID=$(curl -s "http://localhost:8080/api/analyses?include_deleted=true" \
  | python3 -c "import sys,json;print(next(a['id'] for a in json.load(sys.stdin) if a['name']==\"$NAME\" and a['deleted']))")
curl -s -X POST "http://localhost:8080/api/analyses/$ID/restore"
```

Notes:

- An analysis's name stays reserved while it is soft-deleted — creating a new
  analysis with the same name returns `409 Conflict`. Restore the old one first,
  or choose another name.
- There is no hard-delete endpoint: nothing is ever purged unless you remove it
  directly in the database.

## Backup & restore

All analysis data lives in the `pamroi_pgdata` volume. Logical backup:

```bash
docker compose exec db pg_dump -U pamroi pamroi > pamroi-backup.sql   # backup
cat pamroi-backup.sql | docker compose exec -T db psql -U pamroi pamroi   # restore
```

Volume-level backup (stack stopped):

```bash
docker run --rm -v pamroi_pamroi_pgdata:/data -v "$PWD":/backup alpine \
  tar czf /backup/pamroi_pgdata.tgz -C /data .
```

## Verification

```bash
./scripts/check.sh   # API tests + web typecheck/build + Playwright e2e
```

## Disclaimer

Default unit rates and benefit assumptions are illustrative industry benchmarks, not a
CyberArk quote. Replace them with the customer's real figures before presenting.
