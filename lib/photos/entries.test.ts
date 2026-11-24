import { describe, expect, it } from "vitest";
import type { Photo } from "../schemas.ts";
import {
  mergePhotos,
  photoIdFromFileName,
  type ScannedPhoto,
} from "./entries.ts";

const HASH = "a".repeat(64);

function scanned(source: string, extra: Partial<ScannedPhoto> = {}) {
  return {
    source,
    sourceHash: HASH,
    width: 200,
    height: 100,
    blurDataURL: "data:image/jpeg;base64,AAAA",
    ...extra,
  } satisfies ScannedPhoto;
}

function existing(source: string, extra: Partial<Photo> = {}): Photo {
  const id = photoIdFromFileName(source);
  return {
    id,
    file: `${id}.jpg`,
    source,
    sourceHash: HASH,
    width: 100,
    height: 100,
    blurDataURL: "data:image/jpeg;base64,AAAA",
    alt: { fr: "a", en: "a" },
    ...extra,
  };
}

describe("photoIdFromFileName", () => {
  it("slugifies file names", () => {
    expect(photoIdFromFileName("Black and white manhattan.jpg")).toBe(
      "black-and-white-manhattan",
    );
    expect(photoIdFromFileName("P1051586-Enhanced-NR-2.jpg")).toBe(
      "p1051586-enhanced-nr-2",
    );
    expect(photoIdFromFileName("Québec  lights!.JPG")).toBe("quebec-lights");
  });

  it("throws when nothing is left", () => {
    expect(() => photoIdFromFileName("___.jpg")).toThrow(/Cannot derive/);
  });
});

describe("mergePhotos", () => {
  it("keeps hand-written fields", () => {
    const before = existing("Calgary.jpg", {
      id: "calgary-library",
      alt: { fr: "Bibliothèque", en: "Library" },
      caption: { fr: "Légende", en: "Caption" },
      place: { fr: "Calgary", en: "Calgary" },
      credit: "Julien",
    });
    const { photos } = mergePhotos([before], [scanned("Calgary.jpg")]);
    expect(photos[0]).toEqual({ ...before, width: 200 });
  });

  it("appends new photos at the end, sorted by source", () => {
    const result = mergePhotos(
      [existing("b.jpg")],
      [scanned("d.jpg"), scanned("b.jpg"), scanned("c.jpg")],
    );
    expect(result.photos.map((p) => p.source)).toEqual([
      "b.jpg",
      "c.jpg",
      "d.jpg",
    ]);
    expect(result.added).toEqual(["c.jpg", "d.jpg"]);
    expect(result.photos[1]).toMatchObject({
      id: "c",
      file: "c.jpg",
      alt: { fr: "", en: "" },
    });
  });

  it("keeps the existing order", () => {
    const { photos } = mergePhotos(
      [existing("z.jpg"), existing("a.jpg")],
      [scanned("a.jpg"), scanned("z.jpg")],
    );
    expect(photos.map((p) => p.source)).toEqual(["z.jpg", "a.jpg"]);
  });

  it("keeps and reports photos missing from the folder", () => {
    const result = mergePhotos(
      [existing("a.jpg"), existing("gone.jpg")],
      [scanned("a.jpg")],
    );
    expect(result.photos).toHaveLength(2);
    expect(result.missing).toEqual(["gone.jpg"]);
  });

  it("drops a computed field that disappeared", () => {
    const before = existing("a.jpg", {
      takenAt: "2026-01-01",
      exif: { iso: 100 },
    });
    const { photos } = mergePhotos([before], [scanned("a.jpg")]);
    expect(photos[0]).not.toHaveProperty("exif");
    expect(photos[0]).not.toHaveProperty("takenAt");
  });

  it("never changes id or file of an existing entry", () => {
    const before = existing("a.jpg", { id: "custom", file: "custom.jpg" });
    const { photos } = mergePhotos([before], [scanned("a.jpg")]);
    expect(photos[0]).toMatchObject({ id: "custom", file: "custom.jpg" });
  });

  it("rejects an id collision", () => {
    expect(() =>
      mergePhotos(
        [existing("quebec-1.jpg", { id: "quebec" })],
        [scanned("quebec-1.jpg"), scanned("Quebec.jpg")],
      ),
    ).toThrow(/quebec-1\.jpg.*Quebec\.jpg|Quebec\.jpg.*quebec-1\.jpg/);
  });
});
