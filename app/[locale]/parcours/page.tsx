import { SkeletonPage } from "@/components/skeleton-page";
import { resolveLocale } from "@/lib/locale";
import { pageMetadata } from "@/lib/page-metadata";

export function generateMetadata({ params }: PageProps<"/[locale]/parcours">) {
  return pageMetadata(params, "ExperiencePage", "/parcours");
}

export default async function Page({
  params,
}: PageProps<"/[locale]/parcours">) {
  await resolveLocale(params);
  return <SkeletonPage namespace="ExperiencePage" />;
}
