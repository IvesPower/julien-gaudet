import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { parse } from "exifr";
import sharp from "sharp";
import type { ScannedPhoto } from "./entries.ts";
import { type RawExif, toPhotoExif } from "./exif.ts";

export const MAX_EDGE = 2560;
export const JPEG_QUALITY = 90;
const BLUR_EDGE = 16;

export async function hashFile(file: string): Promise<string> {
  return createHash("sha256")
    .update(await readFile(file))
    .digest("hex");
}

/** Never reads GPS: the picked tags are camera settings and the date only. */
export async function readPhotoExif(
  file: string,
): Promise<RawExif | undefined> {
  // A Buffer, not a path: exifr's own file reader breaks on recent Node versions.
  const raw: RawExif | undefined = await parse(await readFile(file), {
    pick: [
      "Make",
      "Model",
      "LensModel",
      "FocalLength",
      "FNumber",
      "ExposureTime",
      "ISO",
      "DateTimeOriginal",
    ],
  });
  return raw ?? undefined;
}

/** sharp strips all metadata and converts to sRGB unless told otherwise. */
export async function renderPhoto(
  source: string,
  target: string,
): Promise<{ width: number; height: number }> {
  const info = await sharp(source)
    .rotate()
    .resize({
      width: MAX_EDGE,
      height: MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .toColorspace("srgb")
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toFile(target);
  return { width: info.width, height: info.height };
}

export async function blurPlaceholder(file: string): Promise<string> {
  const buffer = await sharp(file)
    .resize({
      width: BLUR_EDGE,
      height: BLUR_EDGE,
      fit: "inside",
    })
    .webp()
    .toBuffer();
  return `data:image/webp;base64,${buffer.toString("base64")}`;
}

export async function scanPhoto(
  source: string,
  target: string,
  renderNeeded: boolean,
): Promise<{ scanned: ScannedPhoto; unknownCamera?: string }> {
  const sourceHash = await hashFile(source);
  const { exif, takenAt, unknownCamera } = toPhotoExif(
    await readPhotoExif(source),
  );
  if (renderNeeded) await renderPhoto(source, target);
  const { width, height } = await sharp(target).metadata();
  if (width === undefined || height === undefined) {
    throw new Error(`Cannot read the size of "${target}"`);
  }
  const scanned: ScannedPhoto = {
    source: basename(source),
    sourceHash,
    width,
    height,
    blurDataURL: await blurPlaceholder(target),
    ...(takenAt !== undefined ? { takenAt } : {}),
    ...(exif !== undefined ? { exif } : {}),
  };
  return { scanned, ...(unknownCamera !== undefined ? { unknownCamera } : {}) };
}
