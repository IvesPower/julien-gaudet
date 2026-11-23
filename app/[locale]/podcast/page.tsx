import { SkeletonPage } from "@/components/skeleton-page";
import { resolveLocale } from "@/lib/locale";
import { pageMetadata } from "@/lib/page-metadata";

export function generateMetadata({ params }: PageProps<"/[locale]/podcast">) {
  return pageMetadata(params, "PodcastPage", "/podcast");
}

export default async function Page({ params }: PageProps<"/[locale]/podcast">) {
  await resolveLocale(params);
  return <SkeletonPage namespace="PodcastPage" />;
}
