// Application-owned Playwright setup used by a Viewrule checkpoint.
export default async function ({ page }) {
  await page.getByRole("button", { name: "Details" }).click();
  await page.getByRole("complementary").waitFor({ state: "visible" });
}
