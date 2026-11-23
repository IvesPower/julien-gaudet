import { getPathname } from "@/i18n/navigation";
import type { AppLocale, AppPathname } from "@/i18n/routing";

/** Pathnames without a dynamic segment: the pages that exist in this lot. */
export type StaticPathname = Exclude<
  AppPathname,
  `${string}[${string}]${string}`
>;

export type Alternates = {
  canonical: string;
  languages: Record<AppLocale | "x-default", string>;
};

/**
 * Canonical URL and hreflang alternates of a page, relative to
 * `metadataBase`. `x-default` points to the root, which picks the
 * visitor's language.
 */
export async function getAlternates(
  href: StaticPathname,
  locale: AppLocale,
): Promise<Alternates> {
  const languages: Record<AppLocale, string> = {
    fr: getPathname({ locale: "fr", href }),
    en: getPathname({ locale: "en", href }),
  };
  return {
    canonical: languages[locale],
    languages: { ...languages, "x-default": "/" },
  };
}
