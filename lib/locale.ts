import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { type AppLocale, routing } from "@/i18n/routing";

/**
 * Reads the `[locale]` segment, renders a 404 for an unknown locale and
 * enables static rendering for the request. Call it first in every layout
 * and page under `app/[locale]/`.
 */
export async function resolveLocale(
  params: Promise<{ locale: string }>,
): Promise<AppLocale> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return locale;
}
