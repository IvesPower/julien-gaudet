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
  // Retry: a client-side navigation (language switcher) may still be running.
  await expect.poll(() => new URL(page.url()).pathname).toBe(path);
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

When("I press {string}", async ({ page }, key: string) => {
  await page.keyboard.press(key);
});

When("I click the link {string}", async ({ page }, name: string) => {
  const before = page.url();
  await page.getByRole("link", { name, exact: true }).click();
  // Wait for the (client-side) navigation, so the next step starts after it.
  await page.waitForURL((url) => url.href !== before);
});

Then(
  "the focused element is the link {string}",
  async ({ page }, name: string) => {
    await expect(page.getByRole("link", { name, exact: true })).toBeFocused();
  },
);

Then(
  "the {string} alternate link ends with {string}",
  async ({ page }, hreflang: string, suffix: string) => {
    const href = await page
      .locator(`head link[rel="alternate"][hreflang="${hreflang}"]`)
      .getAttribute("href");
    expect(href ? new URL(href).pathname : null).toBe(suffix);
  },
);

Then(
  "the canonical link ends with {string}",
  async ({ page }, suffix: string) => {
    const href = await page
      .locator('head link[rel="canonical"]')
      .getAttribute("href");
    expect(href ? new URL(href).pathname : null).toBe(suffix);
  },
);
