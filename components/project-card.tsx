import type { MDXContent } from "mdx/types";
import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import type { ResolvedProject } from "@/lib/content";
import { ProjectArticle } from "./project-article";

async function loadBody(project: ResolvedProject): Promise<MDXContent> {
  const mod: { default: MDXContent } = await import(
    `@/content/projets/${project.slug}.${project.contentLocale}.mdx`
  );
  return mod.default;
}

/** Loads a project's MDX body and labels, then renders it. */
export async function ProjectCard({
  project,
  locale,
}: {
  project: ResolvedProject;
  locale: AppLocale;
}) {
  const [t, Body] = await Promise.all([
    getTranslations("ProjectsPage"),
    loadBody(project),
  ]);
  const labels = {
    status: t(`status.${project.status}`),
    install: t("details.install"),
    installLater: t("details.installLater"),
    platforms: t("details.platforms"),
    platformNames: project.platforms.map((p) => t(`platform.${p}`)),
    stack: t("details.stack"),
    license: t("details.license"),
    github: t("github"),
  };
  return (
    <ProjectArticle
      project={project}
      locale={locale}
      labels={labels}
      Body={Body}
    />
  );
}
