import { SkeletonPage } from "@/components/skeleton-page";
import { resolveLocale } from "@/lib/locale";
import { pageMetadata } from "@/lib/page-metadata";

export function generateMetadata({
  params,
}: PageProps<"/[locale]/conferences">) {
  return pageMetadata(params, "TalksPage", "/conferences");
}

export default async function Page({
  params,
}: PageProps<"/[locale]/conferences">) {
  await resolveLocale(params);
  return <SkeletonPage namespace="TalksPage" />;
}
