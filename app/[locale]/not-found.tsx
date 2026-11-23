import { useTranslations } from "next-intl";

export default function LocaleNotFound() {
  const t = useTranslations("NotFoundPage");
  return (
    <>
      <h1>{t("title")}</h1>
      <p>{t("placeholder")}</p>
    </>
  );
}
