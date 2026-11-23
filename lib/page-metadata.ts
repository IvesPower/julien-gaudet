import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getAlternates, type StaticPathname } from "@/lib/alternates";
import { resolveLocale } from "@/lib/locale";
import type { PageNamespace } from "@/components/skeleton-page";

/** Title and hreflang alternates of a page, read from its messages. */
export async function pageMetadata(
  params: Promise<{ locale: string }>,
  namespace: PageNamespace,
  href: StaticPathname,
): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace });
  const title = t("title");
  return {
    // The home page title is the site name: skip the "%s · site name" template.
    title: href === "/" ? { absolute: title } : title,
    alternates: await getAlternates(href, locale),
  };
}
