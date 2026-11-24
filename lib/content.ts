import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import type { z } from "zod";
import type { AppLocale } from "@/i18n/routing";
import {
  type Experience,
  experiencesSchema,
  type PeriodDate,
  type Photo,
  photosSchema,
  type Profile,
  profileSchema,
  type ProjectFrontmatter,
  projectFrontmatterSchema,
  type Text,
} from "@/lib/schemas";

/**
 * Reads `content/` at build time, validates it and resolves every text in the
 * page language. Server-only: pages call these functions while prerendering.
 */

const defaultContentDir = path.join(process.cwd(), "content");

/** A text in the page language, or in French when no translation exists. */
export type ResolvedText = { text: string; lang: AppLocale };

export type ResolvedExperience = {
  kind: Experience["kind"];
  contract?: Experience["contract"];
  start: PeriodDate;
  end?: PeriodDate;
  role: ResolvedText;
  org: ResolvedText;
  place?: ResolvedText;
  highlights: ResolvedText[];
  tags: ResolvedText[];
};

/** Invalid content: the message names the file and the field. */
export class ContentError extends Error {
  constructor(file: string, field: string, message: string) {
    super(field ? `${file}: ${field}: ${message}` : `${file}: ${message}`);
    this.name = "ContentError";
  }
}

export function resolveText(value: Text, locale: AppLocale): ResolvedText {
  if (typeof value === "string") return { text: value, lang: locale };
  const translated = value[locale];
  return translated === undefined
    ? { text: value.fr, lang: "fr" }
    : { text: translated, lang: locale };
}

/** Parses `data` with `schema`, or throws a ContentError for `file`. */
export function validate<T>(
  schema: z.ZodType<T>,
  data: unknown,
  file: string,
): T {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  const [issue] = result.error.issues;
  throw new ContentError(
    file,
    issue ? issue.path.join(".") : "",
    issue?.message ?? "invalid",
  );
}

async function readJson(contentDir: string, file: string): Promise<unknown> {
  return JSON.parse(await readFile(path.join(contentDir, file), "utf8"));
}

// Compares periods as strings: a year sorts as its first month for the start
// and its last month for the end; an ongoing period is the most recent.
const startKey = (e: Experience) =>
  e.start.length === 4 ? `${e.start}-01` : e.start;
const endKey = (e: Experience) =>
  e.end === undefined ? "9999-12" : e.end.length === 4 ? `${e.end}-12` : e.end;

function newestFirst(a: Experience, b: Experience): number {
  return (
    startKey(b).localeCompare(startKey(a)) || endKey(b).localeCompare(endKey(a))
  );
}

function resolveExperience(
  e: Experience,
  locale: AppLocale,
): ResolvedExperience {
  return {
    kind: e.kind,
    contract: e.contract,
    start: e.start,
    end: e.end,
    role: resolveText(e.role, locale),
    org: resolveText(e.org, locale),
    place: e.place && resolveText(e.place, locale),
    highlights: e.highlights.map((h) => resolveText(h, locale)),
    tags: e.tags.map((t) => resolveText(t, locale)),
  };
}

/** The timeline, newest first, split into jobs and education. */
export async function getExperiences(
  locale: AppLocale,
  contentDir: string = defaultContentDir,
): Promise<{ work: ResolvedExperience[]; education: ResolvedExperience[] }> {
  const file = "parcours.json";
  const entries = validate(
    experiencesSchema,
    await readJson(contentDir, file),
    file,
  ).toSorted(newestFirst); // stable: a full tie keeps the file order
  const group = (kind: Experience["kind"]) =>
    entries
      .filter((e) => e.kind === kind)
      .map((e) => resolveExperience(e, locale));
  return { work: group("work"), education: group("education") };
}

export type ResolvedProject = Omit<ProjectFrontmatter, "tagline"> & {
  slug: string;
  tagline: ResolvedText;
  /** Language of the MDX file whose body is shown. */
  contentLocale: AppLocale;
};

/** Frontmatter fields that must be the same in every language file. */
const neutralFields = [
  "name",
  "status",
  "platforms",
  "stack",
  "repo",
  "license",
  "install",
  "order",
] as const satisfies ReadonlyArray<keyof ProjectFrontmatter>;

// A slug is lowercase words joined by hyphens: it becomes the page anchor and
// part of the MDX import path.
const projectFile = /^([a-z0-9]+(?:-[a-z0-9]+)*)\.(fr|en)\.mdx$/;

async function readFrontmatter(
  contentDir: string,
  file: string,
): Promise<ProjectFrontmatter> {
  const source = await readFile(path.join(contentDir, file), "utf8");
  return validate(projectFrontmatterSchema, matter(source).data, file);
}

async function loadProject(
  contentDir: string,
  slug: string,
  langs: ReadonlySet<AppLocale>,
  locale: AppLocale,
): Promise<ResolvedProject> {
  const file = (lang: AppLocale) => `projets/${slug}.${lang}.mdx`;
  if (!langs.has("fr")) {
    throw new ContentError(file("en"), "", "missing French source");
  }
  const fr = await readFrontmatter(contentDir, file("fr"));
  const en = langs.has("en")
    ? await readFrontmatter(contentDir, file("en"))
    : undefined;
  if (en) {
    for (const field of neutralFields) {
      if (JSON.stringify(en[field]) !== JSON.stringify(fr[field])) {
        throw new ContentError(
          file("en"),
          field,
          "differs from the French file",
        );
      }
    }
  }
  const contentLocale: AppLocale = locale === "en" && en ? "en" : "fr";
  const { tagline, ...neutral } = contentLocale === "en" && en ? en : fr;
  return {
    ...neutral,
    slug,
    tagline: { text: tagline, lang: contentLocale },
    contentLocale,
  };
}

/** The projects, in display order, each resolved in the page language. */
export async function getProjects(
  locale: AppLocale,
  contentDir: string = defaultContentDir,
): Promise<ResolvedProject[]> {
  const names = await readdir(path.join(contentDir, "projets"));
  const files = new Map<string, Set<AppLocale>>();
  for (const name of names) {
    // Other files (a README, notes) are ignored, but a misnamed MDX file would
    // silently drop a project: fail instead.
    if (!name.endsWith(".mdx")) continue;
    const [, slug, lang] = projectFile.exec(name) ?? [];
    if (!slug || (lang !== "fr" && lang !== "en")) {
      throw new ContentError(
        `projets/${name}`,
        "",
        "expected <slug>.fr.mdx or <slug>.en.mdx",
      );
    }
    const langs = files.get(slug) ?? new Set<AppLocale>();
    langs.add(lang);
    files.set(slug, langs);
  }

  const projects = await Promise.all(
    Array.from(files, ([slug, langs]) =>
      loadProject(contentDir, slug, langs, locale),
    ),
  );
  return projects.toSorted(
    (a, b) => a.order - b.order || a.slug.localeCompare(b.slug),
  );
}

export async function getProfile(
  contentDir: string = defaultContentDir,
): Promise<Profile> {
  const file = "profile.json";
  return validate(profileSchema, await readJson(contentDir, file), file);
}

export type ResolvedPhoto = {
  id: string;
  /** Public URL of the served file: "/photos/<id>.jpg". */
  src: string;
  width: number;
  height: number;
  blurDataURL: string;
  takenAt?: string;
  exif?: Photo["exif"];
  alt: string;
  caption?: ResolvedText;
  place?: ResolvedText;
  credit?: string;
};

/** The photos in file order, each resolved in the page language. */
export async function getPhotos(
  locale: AppLocale,
  contentDir: string = defaultContentDir,
  publicDir: string = path.join(process.cwd(), "public"),
): Promise<ResolvedPhoto[]> {
  const file = "photos.json";
  const photos = validate(photosSchema, await readJson(contentDir, file), file);
  return Promise.all(
    photos.map(async (p, index) => {
      if (p.file !== `${p.id}.jpg`) {
        throw new ContentError(
          file,
          `${index}.file`,
          "expected <id>.jpg: run pnpm photos:meta",
        );
      }
      try {
        await access(path.join(publicDir, "photos", p.file));
      } catch {
        throw new ContentError(
          file,
          `${index}.file`,
          `missing file public/photos/${p.file}`,
        );
      }
      return {
        id: p.id,
        src: `/photos/${p.file}`,
        width: p.width,
        height: p.height,
        blurDataURL: p.blurDataURL,
        takenAt: p.takenAt,
        exif: p.exif,
        alt: p.alt[locale],
        caption: p.caption && resolveText(p.caption, locale),
        place: p.place && resolveText(p.place, locale),
        credit: p.credit,
      };
    }),
  );
}
