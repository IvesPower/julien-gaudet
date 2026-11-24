import type { Photo, PhotoExif } from "../schemas.ts";

export type ScannedPhoto = {
  source: string;
  sourceHash: string;
  width: number;
  height: number;
  blurDataURL: string;
  takenAt?: string;
  exif?: PhotoExif;
};

/** `added` and `missing` list `source` names. */
export type MergeResult = {
  photos: Photo[];
  added: string[];
  missing: string[];
};

export function photoIdFromFileName(fileName: string): string {
  const id = fileName
    .replace(/\.[^./]*$/, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (id === "") {
    throw new Error(`Cannot derive a photo id from "${fileName}"`);
  }
  return id;
}

function applyScan(photo: Photo, scan: ScannedPhoto): Photo {
  // Computed fields are replaced; an absent one is dropped. Everything else is kept.
  const { takenAt: _takenAt, exif: _exif, ...kept } = photo;
  return {
    ...kept,
    sourceHash: scan.sourceHash,
    width: scan.width,
    height: scan.height,
    blurDataURL: scan.blurDataURL,
    ...(scan.takenAt !== undefined ? { takenAt: scan.takenAt } : {}),
    ...(scan.exif !== undefined ? { exif: scan.exif } : {}),
  };
}

export function mergePhotos(
  existing: Photo[],
  scanned: ScannedPhoto[],
): MergeResult {
  const scanBySource = new Map(scanned.map((scan) => [scan.source, scan]));
  const missing: string[] = [];
  const photos = existing.map((photo) => {
    const scan = scanBySource.get(photo.source);
    if (!scan) {
      missing.push(photo.source);
      return photo;
    }
    return applyScan(photo, scan);
  });

  const known = new Set(existing.map((photo) => photo.source));
  const fresh = scanned
    .filter((scan) => !known.has(scan.source))
    .toSorted((a, b) =>
      a.source < b.source ? -1 : a.source > b.source ? 1 : 0,
    );
  for (const scan of fresh) {
    const id = photoIdFromFileName(scan.source);
    photos.push(
      applyScan(
        {
          id,
          file: `${id}.jpg`,
          source: scan.source,
          sourceHash: scan.sourceHash,
          width: scan.width,
          height: scan.height,
          blurDataURL: scan.blurDataURL,
          alt: { fr: "", en: "" },
        },
        scan,
      ),
    );
  }
  const added = fresh.map((scan) => scan.source);

  const sourceById = new Map<string, string>();
  for (const photo of photos) {
    const other = sourceById.get(photo.id);
    if (other !== undefined) {
      throw new Error(
        `Photo id "${photo.id}" is used by both "${other}" and "${photo.source}"`,
      );
    }
    sourceById.set(photo.id, photo.source);
  }

  return { photos, added, missing };
}
