#!/bin/sh
# Full verification sweep: API unit + integration tests, web typecheck + build,
# and the Playwright e2e suite (needs a Chromium; defaults to /opt/pw-browsers
# or set PW_CHROMIUM_PATH). Used by the roadmap loop and before releases.
set -e
cd "$(dirname "$0")/.."

echo "== api: pytest =="
if [ -x api/.venv/bin/python ]; then
  (cd api && .venv/bin/python -m pytest -q)
else
  (cd api && python -m pytest -q)
fi

echo "== web: typecheck + build =="
(cd web && npm run build)

echo "== e2e: playwright =="
(cd web && npx playwright test)

echo "All checks green."
