import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/lib/locale";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  await resolveLocale(params);
  const t = await getTranslations("HomePage");
  return (
    <>
      <h1>{t("title")}</h1>
      <p>{t("placeholder")}</p>
    </>
  );
}
