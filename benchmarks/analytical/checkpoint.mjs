export default async function ({ page }) {
  await page.locator("#apply-filter").click();
  await page.locator('body[data-state="filtered"]').waitFor();
}
