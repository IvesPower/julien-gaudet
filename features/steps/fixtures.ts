import type { Response } from "@playwright/test";
import { createBdd, test as base } from "playwright-bdd";

type Fixtures = {
  /** Response of the last page opened with "I open {string}". */
  lastResponse: { current: Response | null };
};

export const test = base.extend<Fixtures>({
  // oxlint-disable-next-line no-empty-pattern -- Playwright requires a destructured first argument.
  lastResponse: async ({}, use) => {
    await use({ current: null });
  },
});

export const { Given, When, Then } = createBdd(test);
