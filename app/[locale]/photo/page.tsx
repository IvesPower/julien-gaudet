import { SkeletonPage } from "@/components/skeleton-page";
import { resolveLocale } from "@/lib/locale";
import { pageMetadata } from "@/lib/page-metadata";

export function generateMetadata({ params }: PageProps<"/[locale]/photo">) {
  return pageMetadata(params, "PhotoPage", "/photo");
}

export default async function Page({ params }: PageProps<"/[locale]/photo">) {
  await resolveLocale(params);
  return <SkeletonPage namespace="PhotoPage" />;
}
