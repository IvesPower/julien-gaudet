import { readFile } from "node:fs/promises";
import path from "node:path";
import type { z } from "zod";
import type { AppLocale } from "@/i18n/routing";
import {
  type Experience,
  experiencesSchema,
  type PeriodDate,
  type Profile,
  profileSchema,
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
    super(`${file}: ${field}: ${message}`);
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

export async function getProfile(
  contentDir: string = defaultContentDir,
): Promise<Profile> {
  const file = "profile.json";
  return validate(profileSchema, await readJson(contentDir, file), file);
}
