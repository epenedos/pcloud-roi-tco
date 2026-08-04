import { expect, test } from "@playwright/test";

const stamp = Date.now();

test("t-shirt sizing boundary: 999 is Small, 1000 becomes Mid-Range", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("new-analysis").click();
  await page.getByTestId("create-name").fill(`Boundary ${stamp}`);
  await page.getByTestId("create-passwords").fill("999");
  await expect(page.getByTestId("create-size")).toContainText("Small");
  await page.getByTestId("create-submit").click();

  await expect(page.getByTestId("size-badge")).toHaveText("Small");
  // PSM qty for Small default inventory is 1
  await expect(page.getByTestId("inv-3-qty")).toHaveValue("1");

  // Crossing the boundary proposes (but does not silently apply) new defaults
  await page.getByTestId("num-passwords").fill("1000");
  await expect(page.getByTestId("size-badge")).toHaveText("Mid-Range");
  await expect(page.getByTestId("size-mismatch")).toBeVisible();
  await expect(page.getByTestId("inv-3-qty")).toHaveValue("1"); // unchanged yet
  await page.getByTestId("apply-size").click();
  await expect(page.getByTestId("inv-3-qty")).toHaveValue("3"); // Mid-Range PSM qty
  await expect(page.getByTestId("size-mismatch")).toBeHidden();
});

test("golden analysis dashboard shows workbook headline figures", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("new-analysis").click();
  await page.getByTestId("create-name").fill(`Golden ${stamp}`);
  await page.getByTestId("create-passwords").fill("5000");
  await page.getByTestId("create-submit").click();

  await page.getByTestId("tab-dashboard").click();
  await expect(page.getByTestId("kpi-net-savings")).toHaveText("€515,593");
  await expect(page.getByTestId("kpi-roi")).toHaveText("78.2%");
  await expect(page.getByTestId("kpi-payback")).toContainText("4.4 months");
  await expect(page.getByTestId("chart-categories")).toBeVisible();
  await expect(page.getByTestId("chart-cashflow")).toBeVisible();
  await expect(page.getByTestId("chart-waterfall")).toBeVisible();
  await expect(page.getByTestId("chart-value")).toBeVisible();

  // analyst detail tables
  await page.getByTestId("detail-toggle").click();
  await expect(page.getByText("On-Prem infrastructure — annual build-up per component")).toBeVisible();
});

test("input edits autosave and update the live summary", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("new-analysis").click();
  await page.getByTestId("create-name").fill(`Live ${stamp}`);
  await page.getByTestId("create-passwords").fill("5000");
  await page.getByTestId("create-submit").click();

  await expect(page.getByTestId("live-net-savings")).toHaveText("€515,593");
  await page.getByTestId("saas-subscription").fill("140000");
  await expect(page.getByTestId("live-net-savings")).toHaveText("€546,502", {
    timeout: 10_000,
  });

  // persists across reload
  await page.reload();
  await expect(page.getByTestId("live-net-savings")).toHaveText("€546,502");
});

test("benefit toggles update the value view; disabling all hides the panel", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("new-analysis").click();
  await page.getByTestId("create-name").fill(`Benefits ${stamp}`);
  await page.getByTestId("create-passwords").fill("5000");
  await page.getByTestId("create-submit").click();

  const b1Value = page.getByTestId("benefit-b1-value");
  await expect(b1Value).toHaveText("€33,750");

  await page.getByTestId("tab-dashboard").click();
  await expect(page.getByTestId("benefits-table")).toBeVisible();
  const before = await page.getByTestId("total-value").innerText();

  await page.getByTestId("tab-inputs").click();
  await page.getByTestId("benefit-b1-toggle").click();
  await page.getByTestId("tab-dashboard").click();
  await expect(page.getByTestId("total-value")).not.toHaveText(before, {
    timeout: 10_000,
  });
  await expect(page.getByTestId("benefits-table")).not.toContainText("Breach-risk");

  // disable the rest → panel collapses to TCO-only view
  await page.getByTestId("tab-inputs").click();
  for (const id of ["b2", "b3", "b4", "b5", "b6"]) {
    await page.getByTestId(`benefit-${id}-toggle`).click();
  }
  await page.getByTestId("tab-dashboard").click();
  await expect(page.getByTestId("benefits-table")).toBeHidden();
});

test("Export PDF button downloads a boardroom PDF", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("new-analysis").click();
  await page.getByTestId("create-name").fill(`PDF ${stamp}`);
  await page.getByTestId("create-passwords").fill("5000");
  await page.getByTestId("create-submit").click();
  await page.waitForURL(/\/analysis\//);

  const downloadPromise = page.waitForEvent("download", { timeout: 30_000 });
  await page.getByTestId("export-pdf").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^PAM-ROI-PDF_\d+-\d{4}-\d{2}-\d{2}\.pdf$/);
  const path = await download.path();
  const fs = await import("node:fs");
  const buf = fs.readFileSync(path!);
  expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
  expect(buf.length).toBeGreaterThan(30_000);
});

test("print report route renders cover and figures", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("new-analysis").click();
  await page.getByTestId("create-name").fill(`Report ${stamp}`);
  await page.getByTestId("create-passwords").fill("5000");
  await page.getByTestId("create-submit").click();
  await page.waitForURL(/\/analysis\//);
  const id = page.url().split("/analysis/")[1].split("?")[0];

  await page.goto(`/report/${id}/print`);
  await expect(page.getByTestId("print-report")).toBeVisible();
  await expect(page.getByText("On-Prem → SaaS Business Case")).toBeVisible();
  await expect(page.getByText("€515,593").first()).toBeVisible();
  await expect(page.getByText("Methodology & disclaimer")).toBeVisible();
});
