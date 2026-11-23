import { describe, expect, it } from "vitest";
import { getPathname } from "./navigation";
import { routing } from "./routing";

const expectedPaths = [
  { href: "/", fr: "/fr", en: "/en" },
  { href: "/parcours", fr: "/fr/parcours", en: "/en/experience" },
  { href: "/projets", fr: "/fr/projets", en: "/en/projects" },
  { href: "/photo", fr: "/fr/photo", en: "/en/photo" },
  { href: "/conferences", fr: "/fr/conferences", en: "/en/talks" },
  { href: "/podcast", fr: "/fr/podcast", en: "/en/podcast" },
  {
    href: "/mentions-legales",
    fr: "/fr/mentions-legales",
    en: "/en/legal-notice",
  },
] as const;

describe("routing", () => {
  it("uses French as the default locale", () => {
    expect(routing.defaultLocale).toBe("fr");
    expect(routing.locales).toEqual(["fr", "en"]);
  });

  it.each(expectedPaths)(
    "localizes $href in both languages",
    ({ href, fr, en }) => {
      expect(getPathname({ locale: "fr", href })).toBe(fr);
      expect(getPathname({ locale: "en", href })).toBe(en);
    },
  );

  it("localizes talk detail pages with their slug", () => {
    expect(
      getPathname({
        locale: "en",
        href: {
          pathname: "/conferences/[slug]",
          params: { slug: "devlille-2026" },
        },
      }),
    ).toBe("/en/talks/devlille-2026");
  });
});
