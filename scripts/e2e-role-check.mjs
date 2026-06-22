/**
 * Quick production role smoke test (Playwright).
 * Usage: npx playwright test scripts/e2e-role-check.mjs  OR node with playwright
 */
import { chromium } from "playwright";

const BASE = "https://os.candela.adrine.in";

const ROLES = [
  { email: "priya@navayu.in", password: "priya2026", expectPath: "/app/counsellor", label: "Counsellor" },
  { email: "nurse@navayu.in", password: "demo2026", expectPath: "/app/nurse", label: "Nurse" },
  { email: "pharmacy@navayu.in", password: "pharma2026", expectPath: "/app/pharmacy", label: "Pharmacy" },
  { email: "crm@navayu.in", password: "crm2026", expectPath: "/app/crm", label: "CRM" },
  { email: "hr@navayu.in", password: "hr2026", expectPath: "/app/hr", label: "HR" },
  { email: "admin@navayu.in", password: "admin2026", expectPath: "/app/admin", label: "Admin" },
];

async function setInput(page, selector, value) {
  await page.locator(selector).fill(value);
}

async function loginRole(page, { email, password, expectPath, label }) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.waitForSelector('input[placeholder="Email"]', { timeout: 15000 }).catch(() => {});
  if (page.url().includes("/tenant")) {
    // already past login
  } else {
    await setInput(page, 'input[placeholder="Email"]', email);
    await setInput(page, 'input[placeholder="Password"]', password);
    await page.getByRole("button", { name: /Continue/i }).click();
    await page.waitForURL(/\/tenant/, { timeout: 15000 });
  }
  await setInput(page, 'input[placeholder="Organization ID"]', "navayu");
  await setInput(page, 'input[placeholder="Organization password"]', "demo");
  await page.getByRole("button", { name: /Verify organization/i }).click();
  await page.waitForURL(/\/branch/, { timeout: 15000 });
  await page.getByRole("button", { name: /Gurgaon/i }).click();
  await page.waitForURL(/\/workspace/, { timeout: 15000 });
  await setInput(page, 'input[placeholder="Work email"]', email);
  await setInput(page, 'input[placeholder="Password"]', password);
  await page.getByRole("button", { name: /Enter/i }).click();
  await page.waitForURL(new RegExp(expectPath.replace("/", "\\/")), { timeout: 20000 });
  await page.waitForTimeout(3000);
  const body = await page.textContent("body");
  const hasError = body?.includes("Could not load workspace data") ?? false;
  const title = await page.title();
  return { label, url: page.url(), hasError, title, ok: !hasError && page.url().includes(expectPath) };
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const results = [];

for (const role of ROLES) {
  try {
    const r = await loginRole(page, role);
    results.push(r);
    console.log(r.ok ? "PASS" : "FAIL", JSON.stringify(r));
    // sign out via sidebar logout (last icon button in footer)
    await page.locator("aside button").last().click().catch(() => {});
    await page.waitForTimeout(1500);
    await page.goto(`${BASE}/login`);
    await page.waitForTimeout(1000);
  } catch (e) {
    results.push({ label: role.label, ok: false, error: String(e) });
    console.log("FAIL", role.label, String(e));
    await page.goto(`${BASE}/login`);
  }
}

await browser.close();
const passed = results.filter((r) => r.ok).length;
console.log(`\nSummary: ${passed}/${results.length} roles OK`);
process.exit(passed === results.length ? 0 : 1);
