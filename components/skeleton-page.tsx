import { getTranslations } from "next-intl/server";
import type { PageNamespace } from "@/lib/page-metadata";

/** Pages still waiting for their content. */
export type SkeletonNamespace = Exclude<
  PageNamespace,
  "ExperiencePage" | "ProjectsPage" | "PhotoPage"
>;

/** Placeholder page until the real content and design arrive. */
export async function SkeletonPage({
  namespace,
}: {
  namespace: SkeletonNamespace;
}) {
  const t = await getTranslations(namespace);
  return (
    <>
      <h1>{t("title")}</h1>
      <p>{t("placeholder")}</p>
    </>
  );
}
