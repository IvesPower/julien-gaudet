import { describe, expect, it } from "vitest";
import { getAlternates } from "./alternates";

describe("getAlternates", () => {
  it("lists both languages and the root as x-default", async () => {
    expect(await getAlternates("/conferences", "fr")).toEqual({
      canonical: "/fr/conferences",
      languages: { fr: "/fr/conferences", en: "/en/talks", "x-default": "/" },
    });
  });

  it("uses the page in the requested language as canonical", async () => {
    expect(await getAlternates("/mentions-legales", "en")).toEqual({
      canonical: "/en/legal-notice",
      languages: {
        fr: "/fr/mentions-legales",
        en: "/en/legal-notice",
        "x-default": "/",
      },
    });
  });
});
