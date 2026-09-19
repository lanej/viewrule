import assert from "node:assert/strict";

// Application-owned controlled response evidence, not a generic state detector.
export default async function ({ page }) {
  const role = (name) => page.locator(`#good [data-role="${name}"]`);
  const state = page.locator("#state-picker");
  const expectSnapshot = async (count, time) => {
    assert.equal(await role("count").textContent(), count);
    assert.equal(await role("as-of").textContent(), `Data as of ${time}`);
  };
  const settled = async (name) => {
    await page.locator(`#behavior-examples[data-shipment-state="${name}"]`).waitFor();
  };
  await page.locator("#reset").click();
  await expectSnapshot("12", "09:00");
  await page.locator("#pause-response").check();
  await role("retry").click();
  await settled("retrying");
  await expectSnapshot("12", "09:00");
  assert.equal(await role("retry").getAttribute("aria-disabled"), "true");
  assert.equal(await role("retry").evaluate((el) => el === el.ownerDocument.activeElement), true);
  await page.locator("#resolve-failure").click();
  await settled("failed");
  await expectSnapshot("12", "09:00");
  assert.match(await role("refresh-at").textContent(), /09:06/);
  await role("retry").click();
  await settled("retrying");
  await expectSnapshot("12", "09:00");
  await page.locator("#resolve-success").click();
  await settled("loaded");
  await expectSnapshot("18", "09:05");
  assert.equal(await role("retry").evaluate((el) => el === el.ownerDocument.activeElement), true);

  // Refreshing known data retains it too; abandoning the request cannot recover it.
  await role("retry").click();
  await settled("refreshing");
  await expectSnapshot("18", "09:05");
  await page.locator("#reset").click();
  await settled("failed");
  await expectSnapshot("12", "09:00");
  assert.equal(await page.locator("#response-controls").isVisible(), false);
  await state.selectOption("loading");
  assert.equal(await role("count").textContent(), "—");
  assert.equal(await role("as-of").isVisible(), false);
  assert.equal(await role("retry").isVisible(), false);
  await page.locator("#reset").click();

  // Deferring documentation must not defer the meaning-changing context.
  const summary = page.locator(".review-notes > summary");
  assert.equal(await page.locator("#verification").isVisible(), false);
  await summary.focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.locator("#verification").isVisible(), true);
  await expectSnapshot("12", "09:00");
  assert.equal(await role("status").isVisible(), true);
  assert.equal(await role("refresh-at").isVisible(), true);
  await page.keyboard.press("Enter");
  assert.equal(await page.locator("#verification").isVisible(), false);
  assert.equal(await summary.evaluate((el) => el === el.ownerDocument.activeElement), true);
}
