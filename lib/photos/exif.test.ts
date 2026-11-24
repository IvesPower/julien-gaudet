import { describe, expect, it } from "vitest";
import { cameraName, toPhotoExif } from "./exif.ts";

describe("cameraName", () => {
  it("does not match prototype keys as known cameras", () => {
    expect(cameraName("Acme", "constructor")).toEqual({
      name: "Acme constructor",
      known: false,
    });
    expect(cameraName(undefined, "toString")).toEqual({
      name: "toString",
      known: false,
    });
  });

  it("maps a known model to its friendly name", () => {
    expect(cameraName("SONY", "ILCE-7M4")).toEqual({
      name: "Sony A7 IV",
      known: true,
    });
  });

  it("falls back to make and model for an unknown camera", () => {
    expect(cameraName("Canon", "EOS R5")).toEqual({
      name: "Canon EOS R5",
      known: false,
    });
  });

  it("returns no name when there is nothing", () => {
    expect(cameraName(undefined, undefined)).toEqual({ known: true });
  });
});

describe("toPhotoExif", () => {
  it("keeps the present fields and formats the date", () => {
    expect(
      toPhotoExif({
        Make: "SONY",
        Model: "ILCE-7M4",
        LensModel: "24-70mm F2.8 DG DN II | Art 024",
        FocalLength: 24,
        FNumber: 8,
        ExposureTime: 0.0025,
        ISO: 100,
        DateTimeOriginal: new Date(2026, 6, 19, 12, 4),
      }),
    ).toEqual({
      exif: {
        camera: "Sony A7 IV",
        lens: "24-70mm F2.8 DG DN II | Art 024",
        focalLength: 24,
        aperture: 8,
        exposureTime: 0.0025,
        iso: 100,
      },
      takenAt: "2026-07-19",
    });
  });

  it("returns an empty object without data", () => {
    expect(toPhotoExif(undefined)).toEqual({});
    expect(toPhotoExif({ ISO: 0 })).toEqual({});
  });

  it("reports an unknown camera", () => {
    expect(toPhotoExif({ Make: "Canon", Model: "EOS R5" })).toEqual({
      exif: { camera: "Canon EOS R5" },
      unknownCamera: "Canon EOS R5",
    });
  });
});
