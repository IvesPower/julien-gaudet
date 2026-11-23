import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ResolvedProject } from "@/lib/content";
import { ProjectArticle } from "./project-article";

const frenchFallback: ResolvedProject = {
  slug: "tool",
  name: "tool",
  tagline: { text: "Une accroche.", lang: "fr" },
  status: "usable",
  platforms: ["macos"],
  stack: ["Python"],
  repo: "https://github.com/IvesPower/tool",
  license: "MIT",
  order: 1,
  contentLocale: "fr",
};

const labels = {
  status: "Usable",
  install: "Install",
  installLater: "Install steps will come with the first release.",
  platforms: "Platforms",
  platformNames: ["macOS"],
  stack: "Stack",
  license: "License",
  github: "View on GitHub",
};

const render = (project: ResolvedProject) =>
  renderToStaticMarkup(
    createElement(ProjectArticle, {
      project,
      locale: "en",
      labels,
      Body: () =>
        createElement("ul", null, createElement("li", null, "Un point.")),
    }),
  );

describe("ProjectArticle", () => {
  it("marks only the French fallback content, not the English labels", () => {
    const html = render(frenchFallback);
    expect(html).not.toMatch(/<article[^>]*\slang=/);
    expect(html).toMatch(
      /<div lang="fr"><p>Une accroche\.<\/p><ul><li>Un point\.<\/li><\/ul><\/div>/,
    );
  });

  it("adds no lang attribute when the content matches the page", () => {
    const html = render({
      ...frenchFallback,
      tagline: { text: "A tagline.", lang: "en" },
      contentLocale: "en",
    });
    expect(html).not.toContain("lang=");
  });
});
