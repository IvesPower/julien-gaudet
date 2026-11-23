import { SkeletonPage } from "@/components/skeleton-page";
import { resolveLocale } from "@/lib/locale";
import { pageMetadata } from "@/lib/page-metadata";

export function generateMetadata({
  params,
}: PageProps<"/[locale]/mentions-legales">) {
  return pageMetadata(params, "LegalPage", "/mentions-legales");
}

export default async function Page({
  params,
}: PageProps<"/[locale]/mentions-legales">) {
  await resolveLocale(params);
  return <SkeletonPage namespace="LegalPage" />;
}
