import { defineRouting } from "next-intl/routing";

/**
 * Locales and localized URLs. Keys are the internal pathnames (the folders
 * under `app/[locale]/`, in French); values are the public URLs per locale.
 */
export const routing = defineRouting({
  locales: ["fr", "en"],
  defaultLocale: "fr",
  localePrefix: "always",
  // hreflang links come from each page's metadata (lib/alternates.ts), with
  // x-default = "/". next-intl's own `Link` header would contradict them.
  alternateLinks: false,
  localeCookie: {
    // One year: a language preference cookie, exempt from consent.
    maxAge: 60 * 60 * 24 * 365,
  },
  pathnames: {
    "/": "/",
    "/parcours": { fr: "/parcours", en: "/experience" },
    "/projets": { fr: "/projets", en: "/projects" },
    "/projets/[slug]": { fr: "/projets/[slug]", en: "/projects/[slug]" },
    "/photo": "/photo",
    "/conferences": { fr: "/conferences", en: "/talks" },
    "/conferences/[slug]": { fr: "/conferences/[slug]", en: "/talks/[slug]" },
    "/podcast": "/podcast",
    "/mentions-legales": { fr: "/mentions-legales", en: "/legal-notice" },
  },
});

export type AppLocale = (typeof routing.locales)[number];
export type AppPathname = keyof typeof routing.pathnames;
