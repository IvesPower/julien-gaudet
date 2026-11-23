import { notFound } from "next/navigation";
import { resolveLocale } from "@/lib/locale";

// No content yet (lot 2): no slug is generated and every other slug is a 404.
export const dynamicParams = false;

export function generateStaticParams(): Array<{ slug: string }> {
  return [];
}

export default async function Page({
  params,
}: PageProps<"/[locale]/projets/[slug]">) {
  await resolveLocale(params);
  notFound();
}
