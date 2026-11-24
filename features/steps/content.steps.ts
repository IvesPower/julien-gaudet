import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page } from "@playwright/test";
import { Given, Then, When } from "./fixtures";

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

Then(
  "the project {string} shows {string}",
  async ({ page }, slug: string, text: string) => {
    await expect(page.locator(`article[id="${slug}"]`)).toContainText(text);
  },
);

Then(
  "the project {string} links {string} to {string}",
  async ({ page }, slug: string, name: string, href: string) => {
    await expect(
      page
        .locator(`article[id="${slug}"]`)
        .getByRole("link", { name, exact: true }),
    ).toHaveAttribute("href", href);
  },
);

type PhotoEntry = { id: string; width: number; height: number };

function readPhotoEntries(): PhotoEntry[] {
  return JSON.parse(
    readFileSync(join(process.cwd(), "content", "photos.json"), "utf8"),
  );
}

Then("the page contains {string}", async ({ page }, text: string) => {
  await expect(page.locator("body")).toContainText(text);
});

Then("the page shows as many photos as the content file", async ({ page }) => {
  await expect(page.locator("main figure")).toHaveCount(
    readPhotoEntries().length,
  );
});

Then("every photo has a non-empty alternative text", async ({ page }) => {
  const alts = await page
    .locator("main figure img")
    .evaluateAll((images) =>
      images.map((image) => image.getAttribute("alt")?.trim() ?? ""),
    );
  expect(alts.length).toBeGreaterThan(0);
  expect(alts.filter((alt) => alt === "")).toEqual([]);
});

async function expectFirstPhotoKeepsRatio(
  page: Page,
  matches: (photo: PhotoEntry) => boolean,
) {
  const photo = readPhotoEntries().find(matches);
  expect(photo).toBeDefined();
  if (!photo) return;
  const image = page.locator(`figure[id="${photo.id}"] img`);
  await image.scrollIntoViewIfNeeded();
  const box = await image.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  expect(
    Math.abs(box.width / box.height - photo.width / photo.height),
  ).toBeLessThan(0.01);
}

Given("the viewport is {int} pixels wide", async ({ page }, width: number) => {
  await page.setViewportSize({ width, height: 800 });
});

Then(
  "the first photo fits the viewport width and keeps its ratio",
  async ({ page }) => {
    const photo = readPhotoEntries()[0];
    expect(photo).toBeDefined();
    if (!photo) return;
    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    if (!viewport) return;
    const image = page.locator(`figure[id="${photo.id}"] img`);
    await image.scrollIntoViewIfNeeded();
    const box = await image.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    expect(box.width).toBeLessThanOrEqual(viewport.width);
    expect(
      Math.abs(box.width / box.height - photo.width / photo.height),
    ).toBeLessThan(0.01);
  },
);

Then("the first portrait photo keeps its ratio", async ({ page }) => {
  await expectFirstPhotoKeepsRatio(page, (p) => p.height > p.width);
});

Then("the first landscape photo keeps its ratio", async ({ page }) => {
  await expectFirstPhotoKeepsRatio(page, (p) => p.width > p.height);
});

Then("the photo {string} is shown", async ({ page }, id: string) => {
  await expect(page.locator(`figure[id="${id}"]`)).toBeVisible();
});

When("I open the photo page at the second photo's anchor", async ({ page }) => {
  const second = readPhotoEntries()[1];
  expect(second).toBeDefined();
  if (!second) return;
  await page.goto(`/fr/photo#${second.id}`);
});

Then("the second photo is shown", async ({ page }) => {
  const second = readPhotoEntries()[1];
  expect(second).toBeDefined();
  if (!second) return;
  await expect(page.locator(`figure[id="${second.id}"]`)).toBeVisible();
});
