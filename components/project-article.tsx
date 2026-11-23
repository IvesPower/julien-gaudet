import type { MDXContent } from "mdx/types";
import type { AppLocale } from "@/i18n/routing";
import type { ResolvedProject } from "@/lib/content";
import { langAttr } from "@/lib/lang-attr";

/** Interface texts of a project, already translated in the page language. */
export type ProjectLabels = {
  status: string;
  install: string;
  installLater: string;
  platforms: string;
  platformNames: string[];
  stack: string;
  license: string;
  github: string;
};

/** A project in full, with an anchor equal to its slug. */
export function ProjectArticle({
  project,
  locale,
  labels,
  Body,
}: {
  project: ResolvedProject;
  locale: AppLocale;
  labels: ProjectLabels;
  Body: MDXContent;
}) {
  const headingId = `${project.slug}-title`;
  return (
    <article id={project.slug} aria-labelledby={headingId}>
      <h2 id={headingId}>{project.name}</h2>
      <p>{labels.status}</p>
      {/* Only the content may be a French fallback: the labels around it are
          always in the page language. */}
      <div lang={langAttr({ lang: project.contentLocale }, locale)}>
        <p>{project.tagline.text}</p>
        <Body />
      </div>
      <dl>
        <dt>{labels.install}</dt>
        <dd>
          {project.install ? (
            <code>{project.install}</code>
          ) : (
            labels.installLater
          )}
        </dd>
        <dt>{labels.platforms}</dt>
        <dd>{labels.platformNames.join(" · ")}</dd>
        <dt>{labels.stack}</dt>
        <dd>{project.stack.join(" · ")}</dd>
        <dt>{labels.license}</dt>
        <dd>{project.license}</dd>
      </dl>
      <p>
        <a href={project.repo}>{labels.github}</a>
      </p>
    </article>
  );
}
