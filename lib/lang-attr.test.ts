import { describe, expect, it } from "vitest";
import { langAttr } from "./lang-attr";

describe("langAttr", () => {
  it("returns the text language when it differs from the page", () => {
    expect(langAttr({ lang: "fr" }, "en")).toBe("fr");
  });

  it("returns nothing when the text matches the page", () => {
    expect(langAttr({ lang: "en" }, "en")).toBeUndefined();
  });
});
