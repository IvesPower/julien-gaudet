import type { AppLocale } from "@/i18n/routing";

/**
 * The `lang` attribute of a text shown on a page: set only when the text is in
 * another language than the page (a French fallback on an English page).
 */
export function langAttr(
  text: { lang: AppLocale },
  pageLocale: AppLocale,
): AppLocale | undefined {
  return text.lang === pageLocale ? undefined : text.lang;
}
