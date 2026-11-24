import { z } from "zod";

/**
 * Shape of everything under `content/`. Content types are derived from these
 * schemas and declared nowhere else.
 */

const nonEmpty = z.string().trim().min(1);

/** A translatable text; a missing `en` falls back to French. */
export const localizedTextSchema = z.strictObject({
  fr: nonEmpty,
  en: nonEmpty.optional(),
});
export type LocalizedText = z.infer<typeof localizedTextSchema>;

/** A plain string (the same in every language) or a localized text. */
export const textSchema = z.union([nonEmpty, localizedTextSchema]);
export type Text = z.infer<typeof textSchema>;

/** A year (`2017`) or a month (`2024-01`). */
export const periodDateSchema = z
  .string()
  .regex(/^\d{4}(-(0[1-9]|1[0-2]))?$/, "expected YYYY or YYYY-MM");
export type PeriodDate = z.infer<typeof periodDateSchema>;

// A year-only start begins in January, a year-only end finishes in December.
const startMonth = (date: string) => (date.length === 4 ? `${date}-01` : date);
const endMonth = (date: string) => (date.length === 4 ? `${date}-12` : date);

export const experienceSchema = z
  .strictObject({
    kind: z.enum(["work", "education"]),
    contract: z.enum(["permanent", "fixed-term", "freelance"]).optional(),
    start: periodDateSchema,
    end: periodDateSchema.optional(),
    role: localizedTextSchema,
    org: textSchema,
    place: localizedTextSchema.optional(),
    highlights: z.array(localizedTextSchema).min(1),
    tags: z.array(textSchema),
  })
  .refine(
    ({ start, end }) => end === undefined || endMonth(end) >= startMonth(start),
    { message: "end is before start", path: ["end"] },
  );
export type Experience = z.infer<typeof experienceSchema>;

export const experiencesSchema = z.array(experienceSchema);

export const projectFrontmatterSchema = z.strictObject({
  name: nonEmpty,
  tagline: nonEmpty,
  status: z.enum(["in-development", "usable", "archived"]),
  platforms: z.array(z.enum(["macos", "windows", "linux"])).min(1),
  stack: z.array(nonEmpty).min(1),
  repo: z.url().startsWith("https://github.com/"),
  license: nonEmpty,
  install: nonEmpty.optional(),
  order: z.int(),
});
export type ProjectFrontmatter = z.infer<typeof projectFrontmatterSchema>;

export const profileSchema = z.strictObject({
  linkedin: z.url(),
  github: nonEmpty,
  instagram: z.url().optional(),
});
export type Profile = z.infer<typeof profileSchema>;

const slug = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const photoIdSchema = z.string().regex(slug, "expected a kebab-case id");

/** Shooting data kept from the original; never contains GPS. */
export const photoExifSchema = z.strictObject({
  camera: nonEmpty.optional(),
  lens: nonEmpty.optional(),
  /** Focal length in millimetres. */
  focalLength: z.number().positive().optional(),
  aperture: z.number().positive().optional(),
  /** Exposure time in seconds. */
  exposureTime: z.number().positive().optional(),
  iso: z.int().positive().optional(),
});
export type PhotoExif = z.infer<typeof photoExifSchema>;

export const photoSchema = z.strictObject({
  id: photoIdSchema,
  /** Name of the served file under `public/photos/`, kept by the script. */
  file: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*\.jpg$/, "expected <id>.jpg"),
  /** Name of the original file the photo comes from. */
  source: nonEmpty,
  sourceHash: z.string().regex(/^[0-9a-f]{64}$/, "expected a SHA-256 hex"),
  width: z.int().positive(),
  height: z.int().positive(),
  blurDataURL: z.string().startsWith("data:image/"),
  takenAt: z
    .string()
    .regex(
      /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
      "expected YYYY-MM-DD",
    )
    .optional(),
  exif: photoExifSchema.optional(),
  alt: z.strictObject({ fr: nonEmpty, en: nonEmpty }),
  caption: localizedTextSchema.optional(),
  place: localizedTextSchema.optional(),
  credit: nonEmpty.optional(),
});
export type Photo = z.infer<typeof photoSchema>;

export const photosSchema = z
  .array(photoSchema)
  .superRefine((photos, ctx) => {
    const seen = new Set<string>();
    photos.forEach(({ id }, index) => {
      if (seen.has(id)) {
        ctx.addIssue({
          code: "custom",
          message: `duplicate id "${id}"`,
          path: [index, "id"],
        });
      }
      seen.add(id);
    });
  })
  .superRefine((photos, ctx) => {
    const seen = new Set<string>();
    photos.forEach(({ source }, index) => {
      if (seen.has(source)) {
        ctx.addIssue({
          code: "custom",
          message: `duplicate source "${source}"`,
          path: [index, "source"],
        });
      }
      seen.add(source);
    });
  });
