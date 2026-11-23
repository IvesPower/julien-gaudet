"use client";

import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";

/** Link to the current page in the other language. */
export function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale();
  const pathname = usePathname();
  const params = useParams();
  const target = locale === "fr" ? "en" : "fr";

  return (
    <Link
      // @ts-expect-error -- pathname and params always come from the same current route.
      href={{ pathname, params }}
      locale={target}
      lang={target}
      hrefLang={target}
    >
      {t("label")}
    </Link>
  );
}
