import { expect } from "@playwright/test";
import { Then } from "./fixtures";

Then(
  "the section {string} lists {int} entries",
  async ({ page }, name: string, count: number) => {
    await expect(
      page.getByRole("region", { name, exact: true }).getByRole("article"),
    ).toHaveCount(count);
  },
);

Then(
  "the first entry of {string} contains {string}",
  async ({ page }, name: string, text: string) => {
    await expect(
      page
        .getByRole("region", { name, exact: true })
        .getByRole("article")
        .first(),
    ).toContainText(text);
  },
);

Then(
  "the page has a link {string} to {string}",
  async ({ page }, name: string, href: string) => {
    await expect(
      page.getByRole("link", { name, exact: true }).first(),
    ).toHaveAttribute("href", href);
  },
);

Then("the page does not contain {string}", async ({ page }, text: string) => {
  await expect(page.locator("body")).not.toContainText(text);
});
