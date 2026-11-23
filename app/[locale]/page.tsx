import { SkeletonPage } from "@/components/skeleton-page";
import { resolveLocale } from "@/lib/locale";
import { pageMetadata } from "@/lib/page-metadata";

export function generateMetadata({ params }: PageProps<"/[locale]">) {
  return pageMetadata(params, "HomePage", "/");
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  await resolveLocale(params);
  return <SkeletonPage namespace="HomePage" />;
}
