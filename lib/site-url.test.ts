import { describe, expect, it } from "vitest";
import { getSiteUrl } from "./site-url";

describe("getSiteUrl", () => {
  it("uses the Vercel production host when it is set", () => {
    expect(
      getSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "julien-gaudet.vercel.app" })
        .href,
    ).toBe("https://julien-gaudet.vercel.app/");
  });

  it("falls back to localhost on port 3000", () => {
    expect(getSiteUrl({}).href).toBe("http://localhost:3000/");
  });
});
