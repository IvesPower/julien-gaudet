import { getTranslations } from "next-intl/server";
import { ExperienceEntry } from "@/components/experience-entry";
import { getExperiences, getProfile } from "@/lib/content";
import { resolveLocale } from "@/lib/locale";
import { pageMetadata } from "@/lib/page-metadata";

export function generateMetadata({ params }: PageProps<"/[locale]/parcours">) {
  return pageMetadata(params, "ExperiencePage", "/parcours");
}

export default async function Page({
  params,
}: PageProps<"/[locale]/parcours">) {
  const locale = await resolveLocale(params);
  const [t, experiences, profile] = await Promise.all([
    getTranslations("ExperiencePage"),
    getExperiences(locale),
    getProfile(),
  ]);
  const groups = [
    { key: "work", entries: experiences.work },
    { key: "education", entries: experiences.education },
  ] as const;

  return (
    <>
      <h1>{t("title")}</h1>
      <p>{t("intro")}</p>
      <p>
        <a href={profile.linkedin}>{t("linkedin")}</a>
      </p>
      {groups.map(({ key, entries }) => (
        <section key={key} aria-labelledby={`group-${key}`}>
          <h2 id={`group-${key}`}>{t(`groups.${key}`)}</h2>
          <ol>
            {entries.map((entry) => (
              <li key={`${entry.start}-${entry.org.text}`}>
                <ExperienceEntry entry={entry} locale={locale} />
              </li>
            ))}
          </ol>
        </section>
      ))}
    </>
  );
}
