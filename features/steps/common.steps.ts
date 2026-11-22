import { AxeBuilder } from "@axe-core/playwright";
import { expect } from "@playwright/test";
import { Given, Then, When } from "./fixtures";

Given("my browser language is {string}", async ({ page }, header: string) => {
  // The runner's `locale` option (en-US by default) wins over
  // setExtraHTTPHeaders in Chromium, so rewrite the header on every request
  // to send the exact value, weights included.
  await page.route("**/*", (route) =>
    route.continue({
      headers: { ...route.request().headers(), "accept-language": header },
    }),
  );
});

When("I open {string}", async ({ page, lastResponse }, path: string) => {
  lastResponse.current = await page.goto(path);
});

Then("the URL path is {string}", async ({ page }, path: string) => {
  expect(new URL(page.url()).pathname).toBe(path);
});

Then(
  "the response status is {int}",
  async ({ lastResponse }, status: number) => {
    expect(lastResponse.current?.status()).toBe(status);
  },
);

Then("the main heading is {string}", async ({ page }, text: string) => {
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(text);
});

Then("the page language is {string}", async ({ page }, lang: string) => {
  await expect(page.locator("html")).toHaveAttribute("lang", lang);
});

Then("the page has no accessibility violations", async ({ page }) => {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
