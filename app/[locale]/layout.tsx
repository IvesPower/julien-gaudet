import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SiteNav } from "@/components/site-nav";
import { resolveLocale } from "@/lib/locale";
import { getSiteUrl } from "@/lib/site-url";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "Layout" });
  return {
    metadataBase: getSiteUrl(),
    title: { default: t("siteName"), template: `%s · ${t("siteName")}` },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Layout" });

  return (
    <html lang={locale}>
      <body>
        <a href="#main">{t("skipToContent")}</a>
        <NextIntlClientProvider>
          <header>
            <SiteNav />
            <LocaleSwitcher />
          </header>
          <main id="main" tabIndex={-1}>
            {children}
          </main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
