import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getAlternates, type StaticPathname } from "@/lib/alternates";
import { resolveLocale } from "@/lib/locale";

/** Message namespaces of the pages that read their metadata from messages. */
export type PageNamespace =
  | "HomePage"
  | "ExperiencePage"
  | "ProjectsPage"
  | "PhotoPage"
  | "TalksPage"
  | "PodcastPage"
  | "LegalPage";

/** Title, description and hreflang alternates of a page, from its messages. */
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
    ...(t.has("description") && { description: t("description") }),
    alternates: await getAlternates(href, locale),
  };
}
