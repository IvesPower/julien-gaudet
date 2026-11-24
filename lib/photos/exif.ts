import type { PhotoExif } from "../schemas.ts";

/** Shape returned by `exifr.parse(…, { pick: [...] })`. */
export type RawExif = {
  Make?: string;
  Model?: string;
  LensModel?: string;
  FocalLength?: number;
  FNumber?: number;
  ExposureTime?: number;
  ISO?: number;
  DateTimeOriginal?: Date;
};

const KNOWN_CAMERAS: Record<string, string> = {
  "ILCE-7M4": "Sony A7 IV",
  "DC-GX9": "Panasonic Lumix GX9",
  FC7203: "DJI Mini 2",
};

export function cameraName(
  make: string | undefined,
  model: string | undefined,
): { name?: string; known: boolean } {
  const cleanModel = model?.trim() ?? "";
  const friendly = Object.hasOwn(KNOWN_CAMERAS, cleanModel)
    ? KNOWN_CAMERAS[cleanModel]
    : undefined;
  if (friendly) return { name: friendly, known: true };
  const name = [make?.trim(), cleanModel]
    .filter((part) => part)
    .join(" ")
    .trim();
  if (name === "") return { known: true };
  return { name, known: false };
}

function positive(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : undefined;
}

function formatLocalDate(date: Date): string | undefined {
  if (Number.isNaN(date.getTime())) return undefined;
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toPhotoExif(raw: RawExif | undefined): {
  exif?: PhotoExif;
  takenAt?: string;
  unknownCamera?: string;
} {
  if (!raw) return {};
  const camera = cameraName(raw.Make, raw.Model);
  const lens = raw.LensModel?.trim() ? raw.LensModel : undefined;
  const iso = positive(raw.ISO);
  const fields = {
    camera: camera.name,
    lens,
    focalLength: positive(raw.FocalLength),
    aperture: positive(raw.FNumber),
    exposureTime: positive(raw.ExposureTime),
    iso: iso !== undefined && Number.isInteger(iso) ? iso : undefined,
  };
  const exif: PhotoExif = {};
  if (fields.camera !== undefined) exif.camera = fields.camera;
  if (fields.lens !== undefined) exif.lens = fields.lens;
  if (fields.focalLength !== undefined) exif.focalLength = fields.focalLength;
  if (fields.aperture !== undefined) exif.aperture = fields.aperture;
  if (fields.exposureTime !== undefined) {
    exif.exposureTime = fields.exposureTime;
  }
  if (fields.iso !== undefined) exif.iso = fields.iso;

  const result: { exif?: PhotoExif; takenAt?: string; unknownCamera?: string } =
    {};
  if (Object.keys(exif).length > 0) result.exif = exif;
  const takenAt = raw.DateTimeOriginal
    ? formatLocalDate(raw.DateTimeOriginal)
    : undefined;
  if (takenAt !== undefined) result.takenAt = takenAt;
  if (!camera.known && camera.name !== undefined) {
    result.unknownCamera = camera.name;
  }
  return result;
}
