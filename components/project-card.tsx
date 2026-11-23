import type { MDXContent } from "mdx/types";
import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import type { ResolvedProject } from "@/lib/content";
import { langAttr } from "@/lib/lang-attr";

async function loadBody(project: ResolvedProject): Promise<MDXContent> {
  const mod: { default: MDXContent } = await import(
    `@/content/projets/${project.slug}.${project.contentLocale}.mdx`
  );
  return mod.default;
}

/** A project in full, with an anchor equal to its slug. */
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
  const headingId = `${project.slug}-title`;
  return (
    <article
      id={project.slug}
      aria-labelledby={headingId}
      lang={langAttr({ lang: project.contentLocale }, locale)}
    >
      <h2 id={headingId}>{project.name}</h2>
      <p>{t(`status.${project.status}`)}</p>
      <p>{project.tagline.text}</p>
      <Body />
      <dl>
        <dt>{t("details.install")}</dt>
        <dd>
          {project.install ? (
            <code>{project.install}</code>
          ) : (
            t("details.installLater")
          )}
        </dd>
        <dt>{t("details.platforms")}</dt>
        <dd>{project.platforms.map((p) => t(`platform.${p}`)).join(" · ")}</dd>
        <dt>{t("details.stack")}</dt>
        <dd>{project.stack.join(" · ")}</dd>
        <dt>{t("details.license")}</dt>
        <dd>{project.license}</dd>
      </dl>
      <p>
        <a href={project.repo}>{t("github")}</a>
      </p>
    </article>
  );
}
