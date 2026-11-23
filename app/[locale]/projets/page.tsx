import { SkeletonPage } from "@/components/skeleton-page";
import { resolveLocale } from "@/lib/locale";
import { pageMetadata } from "@/lib/page-metadata";

export function generateMetadata({ params }: PageProps<"/[locale]/projets">) {
  return pageMetadata(params, "ProjectsPage", "/projets");
}

export default async function Page({ params }: PageProps<"/[locale]/projets">) {
  await resolveLocale(params);
  return <SkeletonPage namespace="ProjectsPage" />;
}
