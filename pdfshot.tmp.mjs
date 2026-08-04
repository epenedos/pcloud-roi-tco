import { chromium } from "@playwright/test";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 850, height: 1100 } });
await page.goto("file:///" + process.env.PDF, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
await page.screenshot({ path: process.env.OUT, fullPage: false });
await browser.close();
