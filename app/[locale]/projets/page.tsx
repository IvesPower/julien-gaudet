import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { ProjectCard } from "@/components/project-card";
import { Link } from "@/i18n/navigation";
import { getProjects } from "@/lib/content";
import { resolveLocale } from "@/lib/locale";
import { pageMetadata } from "@/lib/page-metadata";

/** Renders `<link>` in the "why" message as a link to the podcast page. */
function podcastLink(chunks: ReactNode) {
  return <Link href="/podcast">{chunks}</Link>;
}

export function generateMetadata({ params }: PageProps<"/[locale]/projets">) {
  return pageMetadata(params, "ProjectsPage", "/projets");
}

export default async function Page({ params }: PageProps<"/[locale]/projets">) {
  const locale = await resolveLocale(params);
  const [t, projects] = await Promise.all([
    getTranslations("ProjectsPage"),
    getProjects(locale),
  ]);

  return (
    <>
      <h1>{t("title")}</h1>
      <p>{t("intro")}</p>
      {projects.map((project) => (
        <ProjectCard key={project.slug} project={project} locale={locale} />
      ))}
      <section aria-labelledby="why">
        <h2 id="why">{t("why.title")}</h2>
        <p>{t.rich("why.text", { link: podcastLink })}</p>
      </section>
    </>
  );
}
