import { getTranslations } from "next-intl/server";

export type PageNamespace =
  | "HomePage"
  | "ExperiencePage"
  | "ProjectsPage"
  | "PhotoPage"
  | "TalksPage"
  | "PodcastPage"
  | "LegalPage";

/** Placeholder page until the real content and design arrive. */
export async function SkeletonPage({
  namespace,
}: {
  namespace: PageNamespace;
}) {
  const t = await getTranslations(namespace);
  return (
    <>
      <h1>{t("title")}</h1>
      <p>{t("placeholder")}</p>
    </>
  );
}
