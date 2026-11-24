import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { format, resolveConfig } from "prettier";
import { z } from "zod";
import { type Photo, photoSchema } from "../schemas.ts";
import {
  mergePhotos,
  photoIdFromFileName,
  type ScannedPhoto,
} from "./entries.ts";
import { hashFile, scanPhoto } from "./image.ts";

export type SyncOptions = {
  sourceDir: string;
  contentDir: string;
  publicDir: string;
};

export type SyncReport = {
  /** Source file names of new entries. */
  added: string[];
  /** Source file names of existing entries whose served file was re-rendered. */
  updated: string[];
  /** Photo ids, after a hand-edited `id`. */
  renamed: Array<{ from: string; to: string }>;
  /** Source file names of entries whose original is gone. */
  missing: string[];
  /** Non-JPEG files found in the source folder. */
  ignored: string[];
  unknownCameras: string[];
  /** Ids of entries whose `alt` is still empty. */
  missingAlt: string[];
  /** Served JPEGs matching no entry; never deleted. */
  orphans: string[];
};

// An empty `alt` is normal right after an entry is added: the build rejects it later.
const syncedPhotosSchema = z.array(
  photoSchema.omit({ alt: true }).extend({
    alt: z.strictObject({ fr: z.string(), en: z.string() }),
  }),
);

const JPEG_EXTENSION = /\.jpe?g$/i;

async function readPhotos(file: string): Promise<Photo[]> {
  if (!existsSync(file)) return [];
  const parsed: Photo[] = JSON.parse(await readFile(file, "utf8"));
  return parsed;
}

async function applyRenames(
  photos: Photo[],
  publicDir: string,
): Promise<{ photos: Photo[]; renamed: SyncReport["renamed"] }> {
  const renamed: SyncReport["renamed"] = [];
  const result: Photo[] = [];
  for (const photo of photos) {
    const expected = `${photo.id}.jpg`;
    if (photo.file === expected) {
      result.push(photo);
      continue;
    }
    const clashes =
      photos.some((other) => other !== photo && other.file === expected) ||
      existsSync(join(publicDir, expected));
    if (clashes) {
      throw new Error(
        `Cannot rename "${photo.file}" to "${expected}": that file already exists`,
      );
    }
    const from = join(publicDir, photo.file);
    // oxlint-disable-next-line no-await-in-loop -- renames run one at a time
    if (existsSync(from)) await rename(from, join(publicDir, expected));
    renamed.push({ from: photo.file.replace(/\.jpg$/, ""), to: photo.id });
    result.push({ ...photo, file: expected });
  }
  return { photos: result, renamed };
}

export async function syncPhotos(options: SyncOptions): Promise<SyncReport> {
  const { sourceDir, contentDir, publicDir } = options;
  const jsonFile = join(contentDir, "photos.json");
  await mkdir(publicDir, { recursive: true });

  const loaded = await readPhotos(jsonFile);
  const { photos: existing, renamed } = await applyRenames(loaded, publicDir);

  const entries = await readdir(sourceDir, { withFileTypes: true });
  const names = entries
    .filter((entry) => entry.isFile() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .toSorted();
  const originals = names.filter((name) => JPEG_EXTENSION.test(name));
  const ignored = names.filter((name) => !JPEG_EXTENSION.test(name));

  const bySource = new Map(existing.map((photo) => [photo.source, photo]));
  const usedFiles = new Set(existing.map((photo) => photo.file));
  const scanned: ScannedPhoto[] = [];
  const updated: string[] = [];
  const unknownCameras = new Set<string>();

  for (const name of originals) {
    const source = join(sourceDir, name);
    const entry = bySource.get(name);
    let file: string;
    let renderNeeded: boolean;
    if (entry) {
      file = entry.file;
      // oxlint-disable-next-line no-await-in-loop -- one image at a time keeps memory low
      const hash = await hashFile(source);
      renderNeeded =
        entry.sourceHash !== hash || !existsSync(join(publicDir, file));
      if (renderNeeded) updated.push(name);
    } else {
      file = `${photoIdFromFileName(name)}.jpg`;
      if (usedFiles.has(file)) {
        throw new Error(
          `Photo "${name}" would be served as "${file}", already used by another entry`,
        );
      }
      usedFiles.add(file);
      renderNeeded = true;
    }
    // oxlint-disable-next-line no-await-in-loop -- one image at a time keeps memory low
    const result = await scanPhoto(source, join(publicDir, file), renderNeeded);
    scanned.push(result.scanned);
    if (result.unknownCamera !== undefined) {
      unknownCameras.add(result.unknownCamera);
    }
  }

  const merged = mergePhotos(existing, scanned);
  const validation = syncedPhotosSchema.safeParse(merged.photos);
  if (!validation.success) {
    throw new Error(
      `Invalid photos data: ${z.prettifyError(validation.error)}`,
    );
  }

  const prettierConfig = await resolveConfig(jsonFile);
  const text = await format(JSON.stringify(merged.photos), {
    parser: "json",
    ...prettierConfig,
  });
  const current = existsSync(jsonFile) ? await readFile(jsonFile, "utf8") : "";
  if (text !== current) await writeFile(jsonFile, text);

  const served = new Set(merged.photos.map((photo) => photo.file));
  const orphans = (await readdir(publicDir))
    .filter((name) => JPEG_EXTENSION.test(name) && !served.has(name))
    .toSorted();

  return {
    added: merged.added,
    updated,
    renamed,
    missing: merged.missing,
    ignored,
    unknownCameras: [...unknownCameras].toSorted(),
    missingAlt: merged.photos
      .filter((photo) => photo.alt.fr === "" || photo.alt.en === "")
      .map((photo) => photo.id),
    orphans,
  };
}
