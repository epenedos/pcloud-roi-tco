"""Server-side PDF rendering: headless Chromium prints the web app's
print-optimized report route, so the PDF matches the on-screen dashboard."""
import asyncio

from playwright.async_api import async_playwright

from app.settings import settings

# Chromium rendering is serialized: one render at a time keeps memory bounded
# and generation comfortably under the 15s budget.
_render_lock = asyncio.Lock()

RENDER_TIMEOUT_MS = 30_000


async def render_report_pdf(analysis_id: str) -> bytes:
    url = f"{settings.web_base_url}/report/{analysis_id}/print"
    async with _render_lock:
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                executable_path=settings.chromium_path or None,
                args=["--no-sandbox", "--disable-dev-shm-usage"],
            )
            try:
                page = await browser.new_page(viewport={"width": 900, "height": 1200})
                await page.goto(url, wait_until="networkidle", timeout=RENDER_TIMEOUT_MS)
                await page.wait_for_selector(
                    '[data-testid="print-report"]', timeout=RENDER_TIMEOUT_MS
                )
                # Give Recharts a beat to finish layout even with animations off.
                await page.wait_for_timeout(400)
                return await page.pdf(
                    format="A4",
                    print_background=True,
                    prefer_css_page_size=True,
                )
            finally:
                await browser.close()
